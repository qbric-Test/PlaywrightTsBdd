import { IWorldOptions, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';
import { OlxPage } from '../pages/OlxPage';
import { WalmartPage } from '../pages/WalmartPage';
import { config } from '../utilities/ConfigReader';
import { Logger } from '../utilities/Logger';

/**
 * Values a scenario carries between steps, for example the term used in a
 * search so a later Then step can assert relevance.
 */
export interface ScenarioContext {
  searchTerm?: string;
  productName?: string;
  productPrice?: string;
  [key: string]: unknown;
}

/**
 * Custom Cucumber World.
 *
 * One instance is created per scenario, including in parallel runs, so each
 * scenario owns an isolated browser, context, page and page object graph.
 * Step definitions never touch Playwright directly: they go through the page
 * objects exposed here.
 */
export class PlaywrightWorld extends World {
  /** Browser instance owned by this scenario. */
  public browser!: Browser;

  /** Isolated browser context (own cookies, storage and video recording). */
  public context!: BrowserContext;

  /** Active page under test. */
  public page!: Page;

  /** Walmart page object, created by the Before hook once the page exists. */
  public walmartPage!: WalmartPage;

  /** OLX page object, created by the Before hook once the page exists. */
  public olxPage!: OlxPage;

  /** Scenario scoped logger. Named 'logger' because Cucumber's World already
   *  owns a 'log' method for writing text into the report. */
  public readonly logger: Logger;

  /** Free form data shared between the steps of one scenario. */
  public readonly data: ScenarioContext = {};

  /** Slug of the running scenario, used to name artifacts. */
  public scenarioName = 'scenario';

  /** Absolute path of the trace file recorded for this scenario. */
  public tracePath: string | undefined;

  public constructor(options: IWorldOptions) {
    super(options);
    this.logger = Logger.for('Scenario');
  }

  /**
   * Stores a value for later steps in the same scenario.
   */
  public set<T>(key: string, value: T): void {
    this.data[key] = value;
  }

  /**
   * Reads a value stored earlier in the same scenario.
   */
  public get<T>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  /**
   * Reads a value that a previous step is required to have set.
   */
  public require<T>(key: string): T {
    const value = this.data[key];
    if (value === undefined) {
      throw new Error('Scenario context is missing the required key "' + key + '"');
    }
    return value as T;
  }

  /**
   * Attaches a PNG screenshot of the current page to the Cucumber report.
   */
  public async attachScreenshot(name = 'screenshot'): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      return;
    }
    const image = await this.page.screenshot({ fullPage: true });
    await Promise.resolve(this.attach(image, 'image/png'));
    this.logger.debug('Attached screenshot: ' + name);
  }

  /**
   * Attaches a plain text note to the Cucumber report.
   */
  public async attachText(text: string): Promise<void> {
    await Promise.resolve(this.attach(text, 'text/plain'));
  }
}

setWorldConstructor(PlaywrightWorld);

/**
 * Cucumber's default 5 second step timeout is far too short for real browser
 * interactions against a production site.
 */
setDefaultTimeout(config.stepTimeout);
