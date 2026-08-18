import { Locator, Page, Response } from '@playwright/test';
import { config } from './ConfigReader';
import { Logger } from './Logger';

/**
 * Options accepted by the polling helpers.
 */
export interface PollOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

/**
 * Explicit waiting helpers built on top of the Playwright auto waiting engine.
 *
 * Playwright already waits for actionability before every action, so these
 * helpers exist only for the cases the built in waits do not cover: waiting for
 * one of several candidate locators, waiting for network idle after a search,
 * or polling an arbitrary predicate.
 */
export class WaitUtils {
  private readonly page: Page;

  private readonly log: Logger;

  public constructor(page: Page) {
    this.page = page;
    this.log = Logger.for('WaitUtils');
  }

  /**
   * Waits until the locator is attached and visible.
   */
  public async forVisible(
    locator: Locator,
    timeout: number = config.defaultTimeout,
  ): Promise<void> {
    await locator.first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Waits until the locator is hidden or detached from the DOM.
   */
  public async forHidden(locator: Locator, timeout: number = config.defaultTimeout): Promise<void> {
    await locator.first().waitFor({ state: 'hidden', timeout });
  }

  /**
   * Waits until the locator is attached to the DOM, visible or not.
   */
  public async forAttached(
    locator: Locator,
    timeout: number = config.defaultTimeout,
  ): Promise<void> {
    await locator.first().waitFor({ state: 'attached', timeout });
  }

  /**
   * Waits until the locator resolves to at least the expected number of nodes.
   */
  public async forCountAtLeast(
    locator: Locator,
    expected: number,
    timeout: number = config.defaultTimeout,
  ): Promise<number> {
    return this.until(
      async () => {
        const count = await locator.count();
        return count >= expected ? count : undefined;
      },
      {
        timeout,
        message: 'Expected at least ' + expected + ' element(s) for locator',
      },
    );
  }

  /**
   * Returns the first locator from the candidate list that becomes visible.
   *
   * This is the backbone of the locator fallback strategy: production sites
   * such as Walmart ship several markup variants, so a page object can pass an
   * ordered list of candidates and use whichever one the current variant
   * renders.
   */
  public async forFirstVisible(
    candidates: Locator[],
    timeout: number = config.defaultTimeout,
  ): Promise<Locator> {
    if (candidates.length === 0) {
      throw new Error('forFirstVisible() requires at least one candidate locator');
    }

    const deadline = Date.now() + timeout;
    let lastError: unknown;

    while (Date.now() < deadline) {
      for (const candidate of candidates) {
        try {
          const first = candidate.first();
          if (await first.isVisible()) {
            return first;
          }
        } catch (error) {
          lastError = error;
        }
      }
      await this.page.waitForTimeout(250);
    }

    // Logged at debug rather than error: isAnyVisible() uses this method to
    // probe for optional elements, where "not visible" is an expected outcome.
    // The thrown Error still carries the full message for genuine failures.
    this.log.debug(
      'None of the ' +
        candidates.length +
        ' candidate locators became visible within ' +
        timeout +
        'ms',
      lastError,
    );
    throw new Error(
      'None of the ' +
        candidates.length +
        ' candidate locators became visible within ' +
        timeout +
        'ms',
    );
  }

  /**
   * Reports whether any candidate locator becomes visible, without throwing.
   * Useful for optional UI such as an Add to cart button that only some
   * product tiles expose.
   */
  public async isAnyVisible(candidates: Locator[], timeout = 5000): Promise<boolean> {
    try {
      await this.forFirstVisible(candidates, timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Waits for the DOM content to be parsed. Preferred over networkidle on
   * commercial sites, which keep long lived analytics connections open.
   */
  public async forDomContentLoaded(timeout: number = config.navigationTimeout): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Waits for the page load event.
   */
  public async forPageLoad(timeout: number = config.navigationTimeout): Promise<void> {
    await this.page.waitForLoadState('load', { timeout });
  }

  /**
   * Best effort wait for network quiescence. Never fails the test, because
   * third party trackers can keep a page from ever reaching network idle.
   */
  public async forNetworkIdle(timeout = 10000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch {
      this.log.debug('Network idle not reached within ' + timeout + 'ms; continuing.');
    }
  }

  /**
   * Waits for the URL to match the supplied pattern.
   */
  public async forUrl(
    pattern: string | RegExp,
    timeout: number = config.navigationTimeout,
  ): Promise<void> {
    await this.page.waitForURL(pattern, { timeout });
  }

  /**
   * Waits for a response whose URL matches the pattern.
   */
  public async forResponse(
    pattern: string | RegExp,
    timeout: number = config.navigationTimeout,
  ): Promise<Response> {
    return this.page.waitForResponse(
      (response) =>
        typeof pattern === 'string'
          ? response.url().includes(pattern)
          : pattern.test(response.url()),
      { timeout },
    );
  }

  /**
   * Polls a predicate until it returns a defined, non false value.
   */
  public async until<T>(
    predicate: () => Promise<T | undefined | false>,
    options: PollOptions = {},
  ): Promise<T> {
    const timeout = options.timeout ?? config.defaultTimeout;
    const interval = options.interval ?? 250;
    const deadline = Date.now() + timeout;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const result = await predicate();
        if (result !== undefined && result !== false) {
          return result as T;
        }
      } catch (error) {
        lastError = error;
      }
      await this.page.waitForTimeout(interval);
    }

    const message = options.message ?? 'Condition was not met';
    this.log.error(message + ' within ' + timeout + 'ms', lastError);
    throw new Error(message + ' within ' + timeout + 'ms');
  }

  /**
   * Retries an action a bounded number of times. Intended for genuinely flaky
   * interactions such as dismissing an interstitial that may or may not render.
   */
  public async retry<T>(action: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        this.log.debug('Attempt ' + attempt + ' of ' + attempts + ' failed; retrying.');
        await this.page.waitForTimeout(delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Fixed pause. Use sparingly and only where an event based wait does not
   * exist, for example letting a debounce driven suggestion panel settle.
   */
  public async pause(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }
}
