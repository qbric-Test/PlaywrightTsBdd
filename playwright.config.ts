import { defineConfig, devices } from '@playwright/test';
import type { BrowserContextOptions, LaunchOptions } from '@playwright/test';
import { config } from './src/utilities/ConfigReader';

/**
 * Browser launch options shared by the Cucumber hooks and by any plain
 * Playwright Test spec added later. Keeping a single source of truth means a
 * change to HEADLESS or SLOW_MO applies to both runners.
 */
export const browserLaunchOptions: LaunchOptions = {
  headless: config.headless,
  slowMo: config.slowMo,
  channel: config.channel,
  // Do not add --start-maximized here. Combined with the fixed viewport below
  // it produces a window/screen metric mismatch that bot detection flags, and
  // Playwright overrides it anyway whenever a viewport is set.
  args: config.browser === 'chromium' ? ['--disable-blink-features=AutomationControlled'] : [],
};

/**
 * Browser context options shared by the Cucumber hooks and Playwright Test.
 * Video recording is enabled whenever the artifact mode is not "off"; the
 * After hook deletes recordings for passing scenarios when the mode is
 * retain-on-failure.
 */
export const browserContextOptions: BrowserContextOptions = {
  viewport: config.viewport,
  locale: config.locale,
  timezoneId: config.timezoneId,
  ignoreHTTPSErrors: config.ignoreHttpsErrors,
  acceptDownloads: true,
  recordVideo:
    config.video === 'off'
      ? undefined
      : { dir: config.artifactsDir + '/videos', size: config.viewport },
};

/**
 * Playwright Test configuration.
 *
 * Cucumber drives the BDD suite, but this file keeps the project aligned with
 * the official Playwright layout and enables `npx playwright test` for any
 * non BDD spec, plus `npx playwright show-trace` for trace inspection.
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.spec.ts',
  outputDir: config.artifactsDir + '/playwright',
  timeout: config.stepTimeout,
  expect: {
    timeout: config.expectTimeout,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : config.retryCount,
  workers: config.parallelWorkers,
  reporter: [
    ['list'],
    ['html', { outputFolder: config.reportsDir + '/playwright-report', open: 'never' }],
    ['json', { outputFile: config.reportsDir + '/playwright-results.json' }],
  ],
  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    viewport: config.viewport,
    locale: config.locale,
    timezoneId: config.timezoneId,
    ignoreHTTPSErrors: config.ignoreHttpsErrors,
    acceptDownloads: true,
    actionTimeout: config.defaultTimeout,
    navigationTimeout: config.navigationTimeout,
    screenshot: config.screenshot === 'retain-on-failure' ? 'only-on-failure' : config.screenshot,
    video: config.video,
    trace: config.trace,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
