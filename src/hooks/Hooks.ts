import * as fs from 'fs';
import * as path from 'path';
import {
  After,
  AfterAll,
  AfterStep,
  Before,
  BeforeAll,
  ITestCaseHookParameter,
  ITestStepHookParameter,
  Status,
} from '@cucumber/cucumber';
import { Browser, chromium, firefox, webkit } from '@playwright/test';
import { browserContextOptions, browserLaunchOptions } from '../../playwright.config';
import { OlxPage } from '../pages/OlxPage';
import { WalmartPage } from '../pages/WalmartPage';
import { config, configReader } from '../utilities/ConfigReader';
import { Logger } from '../utilities/Logger';
import { PlaywrightWorld } from '../support/World';

const log = Logger.for('Hooks');

const BROWSER_ENGINES = {
  chromium,
  firefox,
  webkit,
};

/**
 * Prepares the artifact and report directories once per worker process.
 */
BeforeAll(async function prepareRun(): Promise<void> {
  for (const directory of [config.artifactsDir, config.reportsDir]) {
    fs.mkdirSync(path.resolve(process.cwd(), directory), { recursive: true });
  }

  log.info(
    'Starting run | env=' +
      config.env +
      ' | browser=' +
      config.browser +
      ' | headless=' +
      config.headless +
      ' | baseUrl=' +
      config.baseUrl,
  );
});

/**
 * Per scenario setup: launch the browser, create an isolated context, open a
 * page, start tracing and build the page objects.
 *
 * A browser per scenario keeps parallel workers fully independent and
 * guarantees that a crashed scenario cannot poison its neighbours.
 */
Before(async function launchBrowser(
  this: PlaywrightWorld,
  scenario: ITestCaseHookParameter,
): Promise<void> {
  this.scenarioName = slugify(scenario.pickle.name);
  log.info('Scenario start: ' + scenario.pickle.name);

  this.browser = (await BROWSER_ENGINES[config.browser].launch(browserLaunchOptions)) as Browser;

  this.context = await this.browser.newContext(browserContextOptions);
  this.context.setDefaultTimeout(config.defaultTimeout);
  this.context.setDefaultNavigationTimeout(config.navigationTimeout);

  if (config.trace !== 'off') {
    await this.context.tracing.start({
      title: scenario.pickle.name,
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  }

  this.page = await this.context.newPage();

  this.page.on('pageerror', (error) => log.debug('Page error: ' + error.message));
  this.page.on('console', (message) => {
    if (message.type() === 'error') {
      log.debug('Console error: ' + message.text());
    }
  });

  this.walmartPage = new WalmartPage(this.page);
  this.olxPage = new OlxPage(this.page);
});

/**
 * Records the name of the step that failed, so the teardown message points at
 * the exact step rather than only at the scenario.
 *
 * The screenshot itself is taken once, in After. Capturing here as well would
 * mean two full page screenshots of the same state, which is slow on long
 * commerce pages.
 */
AfterStep(function recordFailedStep(this: PlaywrightWorld, step: ITestStepHookParameter): void {
  if (step.result?.status === Status.FAILED) {
    this.set('failedStepMessage', step.result.message ?? 'Step failed');
  }
});

/**
 * Per scenario teardown.
 *
 * On failure: writes a screenshot and a Playwright trace under test-results
 * and attaches the screenshot to the HTML report.
 * Always: stops tracing, closes the context (which finalises the video) and
 * closes the browser, then removes videos for passing scenarios when the
 * artifact mode is retain-on-failure.
 */
After(
  { timeout: 120_000 },
  async function teardownBrowser(
    this: PlaywrightWorld,
    scenario: ITestCaseHookParameter,
  ): Promise<void> {
    const failed = scenario.result?.status === Status.FAILED;
    const stamp = timestamp();
    const artifactStem = this.scenarioName + '-' + stamp;

    try {
      if (failed && this.page && !this.page.isClosed()) {
        if (config.screenshot !== 'off') {
          const screenshotPath = configReader.artifactPath('screenshots', artifactStem + '.png');
          const image = await captureScreenshot(this, screenshotPath);
          if (image) {
            await Promise.resolve(this.attach(image, 'image/png'));
            log.error('Scenario failed. Screenshot: ' + screenshotPath);
          }
        }

        await this.attachText('URL at failure: ' + this.page.url());
      }

      if (config.trace !== 'off' && this.context) {
        const keepTrace = config.trace === 'on' || failed;

        if (keepTrace) {
          this.tracePath = configReader.artifactPath('traces', artifactStem + '.zip');
          await this.context.tracing.stop({ path: this.tracePath });
          await this.attachText('Trace: npx playwright show-trace ' + this.tracePath);
          log.info('Trace saved: ' + this.tracePath);
        } else {
          await this.context.tracing.stop();
        }
      }
    } catch (error) {
      log.warn('Artifact capture failed during teardown', error);
    } finally {
      const videoPath = await resolveVideoPath(this);

      await closeQuietly(async () => {
        if (this.page && !this.page.isClosed()) {
          await this.page.close();
        }
      });
      await closeQuietly(async () => {
        if (this.context) {
          await this.context.close();
        }
      });
      await closeQuietly(async () => {
        if (this.browser && this.browser.isConnected()) {
          await this.browser.close();
        }
      });

      await handleVideo(this, videoPath, failed, artifactStem);

      log.info(
        'Scenario end: ' +
          scenario.pickle.name +
          ' | status=' +
          (scenario.result?.status ?? 'UNKNOWN'),
      );
    }
  },
);

/**
 * Reports where the artifacts landed once the worker finishes.
 */
AfterAll(async function summarise(): Promise<void> {
  log.info('Run finished. Reports: ' + config.reportsDir + ' | Artifacts: ' + config.artifactsDir);
});

/**
 * Captures the failure screenshot.
 *
 * A full page capture is attempted first because it shows the whole failing
 * view, but infinite scroll commerce pages can make it very slow, so it is
 * bounded and falls back to a viewport capture rather than stalling teardown.
 */
async function captureScreenshot(
  world: PlaywrightWorld,
  screenshotPath: string,
): Promise<Buffer | undefined> {
  try {
    return await world.page.screenshot({ path: screenshotPath, fullPage: true, timeout: 20_000 });
  } catch {
    log.warn('Full page screenshot timed out; falling back to a viewport capture');
  }

  try {
    return await world.page.screenshot({ path: screenshotPath, fullPage: false, timeout: 10_000 });
  } catch (error) {
    log.warn('Could not capture a failure screenshot', error);
    return undefined;
  }
}

/**
 * Reads the recording path before the context is closed, because the Video
 * handle becomes unusable afterwards.
 */
async function resolveVideoPath(world: PlaywrightWorld): Promise<string | undefined> {
  if (config.video === 'off' || !world.page || world.page.isClosed()) {
    return undefined;
  }
  try {
    return await world.page.video()?.path();
  } catch {
    return undefined;
  }
}

/**
 * Renames the recording of a failed scenario to match its screenshot and trace,
 * and deletes recordings of passing scenarios under retain-on-failure.
 */
async function handleVideo(
  world: PlaywrightWorld,
  videoPath: string | undefined,
  failed: boolean,
  artifactStem: string,
): Promise<void> {
  if (!videoPath || !fs.existsSync(videoPath)) {
    return;
  }

  const keepVideo = config.video === 'on' || failed;

  if (!keepVideo) {
    await closeQuietly(async () => fs.promises.unlink(videoPath));
    return;
  }

  const target = configReader.artifactPath('videos', artifactStem + '.webm');
  try {
    await fs.promises.rename(videoPath, target);
    await world.attachText('Video: ' + target);
    log.info('Video saved: ' + target);
  } catch (error) {
    log.warn('Could not move the recorded video', error);
  }
}

/**
 * Runs a teardown action and swallows any error, so one failing close call
 * cannot leave a browser process orphaned.
 */
async function closeQuietly(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    log.debug('Teardown step failed and was ignored', error);
  }
}

/**
 * Converts a scenario name into a file system safe slug.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Builds a compact, sortable timestamp for artifact file names.
 */
function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
