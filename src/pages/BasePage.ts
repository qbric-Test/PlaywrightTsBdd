import { expect, Locator, Page } from '@playwright/test';
import { config, configReader } from '../utilities/ConfigReader';
import { Logger } from '../utilities/Logger';
import { WaitUtils } from '../utilities/WaitUtils';

/**
 * A target is either a concrete Playwright Locator or an ordered list of
 * candidate locators. When a list is supplied the first candidate that becomes
 * visible wins, which is how the framework survives markup variants.
 */
export type LocatorTarget = Locator | Locator[];

/**
 * Base class for every page object.
 *
 * Holds the Playwright Page, exposes the reusable interaction primitives, and
 * centralises logging so individual page objects stay declarative.
 */
export abstract class BasePage {
  protected readonly page: Page;

  protected readonly wait: WaitUtils;

  protected readonly log: Logger;

  protected constructor(page: Page, scope: string) {
    this.page = page;
    this.wait = new WaitUtils(page);
    this.log = Logger.for(scope);
  }

  // --------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------

  /**
   * Navigates to an absolute URL, or to a path relative to BASE_URL.
   */
  public async navigate(relativePathOrUrl = '/'): Promise<void> {
    const target = configReader.url(relativePathOrUrl);
    this.log.step('Navigating to ' + target);

    await this.page.goto(target, {
      waitUntil: 'domcontentloaded',
      timeout: config.navigationTimeout,
    });
    await this.wait.forDomContentLoaded();
  }

  /**
   * Reloads the current page.
   */
  public async reload(): Promise<void> {
    this.log.debug('Reloading the current page');
    await this.page.reload({
      waitUntil: 'domcontentloaded',
      timeout: config.navigationTimeout,
    });
  }

  /**
   * Returns the current page URL.
   */
  public async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Returns the document title.
   */
  public async getTitle(): Promise<string> {
    const title = await this.page.title();
    this.log.debug('Page title is "' + title + '"');
    return title;
  }

  // --------------------------------------------------------------------
  // Interactions
  // --------------------------------------------------------------------

  /**
   * Clicks the target element. Playwright auto waits for actionability, so no
   * explicit wait is needed before the click.
   */
  public async click(target: LocatorTarget, description = 'element'): Promise<void> {
    this.log.step('Clicking ' + description);
    const locator = await this.resolve(target);
    await locator.click({ timeout: config.defaultTimeout });
  }

  /**
   * Clicks an element that only reacts to a real user gesture sequence, or that
   * is covered by a sticky header. Falls back to a DOM level dispatch.
   */
  public async clickWithFallback(target: LocatorTarget, description = 'element'): Promise<void> {
    const locator = await this.resolve(target);
    try {
      await locator.click({ timeout: config.defaultTimeout });
    } catch {
      this.log.warn('Standard click on ' + description + ' failed; retrying with a forced click');
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ force: true, timeout: config.defaultTimeout });
    }
  }

  /**
   * Clears the field and types the supplied value.
   */
  public async fill(target: LocatorTarget, value: string, description = 'field'): Promise<void> {
    this.log.step('Entering "' + value + '" into ' + description);
    await this.withFreshLocator(target, description, async (locator) => {
      await locator.click({ timeout: config.defaultTimeout });
      await locator.fill('');
      await locator.fill(value);
    });
  }

  /**
   * Types character by character, which triggers the key events that
   * type-ahead widgets listen for.
   */
  public async type(
    target: LocatorTarget,
    value: string,
    delayMs = 60,
    description = 'field',
  ): Promise<void> {
    this.log.step('Typing "' + value + '" into ' + description);
    await this.withFreshLocator(target, description, async (locator) => {
      await locator.click({ timeout: config.defaultTimeout });
      await locator.fill('');
      await locator.pressSequentially(value, { delay: delayMs });
    });
  }

  /**
   * Presses a keyboard key on the target element.
   */
  public async press(target: LocatorTarget, key: string, description = 'element'): Promise<void> {
    this.log.step('Pressing "' + key + '" on ' + description);
    const locator = await this.resolve(target);
    await locator.press(key);
  }

  /**
   * Hovers over the target element.
   */
  public async hover(target: LocatorTarget, description = 'element'): Promise<void> {
    this.log.debug('Hovering over ' + description);
    const locator = await this.resolve(target);
    await locator.hover({ timeout: config.defaultTimeout });
  }

  /**
   * Scrolls the target element into the viewport.
   */
  public async scrollIntoView(target: LocatorTarget): Promise<void> {
    const locator = await this.resolve(target);
    await locator.scrollIntoViewIfNeeded();
  }

  // --------------------------------------------------------------------
  // State queries
  // --------------------------------------------------------------------

  /**
   * Returns the trimmed inner text of the target element.
   */
  public async getText(target: LocatorTarget, description = 'element'): Promise<string> {
    const locator = await this.resolve(target);
    const text = ((await locator.innerText()) ?? '').trim();
    this.log.debug('Text of ' + description + ' is "' + text + '"');
    return text;
  }

  /**
   * Returns the trimmed text of every node the target resolves to.
   */
  public async getAllTexts(target: LocatorTarget): Promise<string[]> {
    const locator = target instanceof Array ? await this.resolveGroup(target) : target;
    const texts = await locator.allInnerTexts();
    return texts.map((text) => text.trim()).filter((text) => text.length > 0);
  }

  /**
   * Returns an attribute value, or null when the attribute is absent.
   */
  public async getAttribute(target: LocatorTarget, attribute: string): Promise<string | null> {
    const locator = await this.resolve(target);
    return locator.getAttribute(attribute);
  }

  /**
   * Reports whether the target element is visible. Never throws.
   */
  public async isVisible(target: LocatorTarget, timeout = 5000): Promise<boolean> {
    if (Array.isArray(target)) {
      return this.wait.isAnyVisible(target, timeout);
    }
    try {
      await target.first().waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reports whether the target element is enabled. Never throws.
   */
  public async isEnabled(target: LocatorTarget, timeout = 5000): Promise<boolean> {
    try {
      const locator = await this.resolve(target, timeout);
      return await locator.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Returns the number of nodes the target resolves to.
   */
  public async getCount(target: LocatorTarget): Promise<number> {
    const locator = Array.isArray(target) ? await this.resolveGroup(target) : target;
    return locator.count();
  }

  // --------------------------------------------------------------------
  // Waits
  // --------------------------------------------------------------------

  /**
   * Waits until the target element is visible and returns it.
   */
  public async waitForVisible(
    target: LocatorTarget,
    timeout: number = config.defaultTimeout,
  ): Promise<Locator> {
    return this.resolve(target, timeout);
  }

  /**
   * Waits until the target element is hidden or detached.
   */
  public async waitForHidden(
    target: LocatorTarget,
    timeout: number = config.defaultTimeout,
  ): Promise<void> {
    const locator = Array.isArray(target) ? target[0] : target;
    await this.wait.forHidden(locator, timeout);
  }

  /**
   * Waits for the page load state to settle after a navigation.
   */
  public async waitForPageReady(): Promise<void> {
    await this.wait.forDomContentLoaded();
    await this.wait.forNetworkIdle();
  }

  // --------------------------------------------------------------------
  // Assertions
  // --------------------------------------------------------------------

  /**
   * Asserts that the target element is visible, using Playwright web-first
   * assertions so the check retries until the expect timeout elapses.
   */
  public async assertVisible(target: LocatorTarget, description = 'element'): Promise<void> {
    const locator = await this.resolve(target, config.expectTimeout);
    await expect(locator, description + ' should be visible').toBeVisible({
      timeout: config.expectTimeout,
    });
    this.log.info(description + ' is displayed');
  }

  /**
   * Asserts that the document title contains the supplied fragment.
   */
  public async assertTitleContains(fragment: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(BasePage.escapeRegExp(fragment), 'i'), {
      timeout: config.expectTimeout,
    });
    this.log.info('Page title contains "' + fragment + '"');
  }

  /**
   * Asserts that the current URL matches the supplied pattern.
   */
  public async assertUrlMatches(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout: config.expectTimeout });
    this.log.info('Page URL matches ' + pattern.toString());
  }

  // --------------------------------------------------------------------
  // Artifacts
  // --------------------------------------------------------------------

  /**
   * Captures a full page screenshot and returns the raw buffer so callers can
   * attach it to the Cucumber report.
   */
  public async captureScreenshot(fullPage = true): Promise<Buffer> {
    return this.page.screenshot({ fullPage, timeout: config.defaultTimeout });
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------

  /**
   * Runs a text entry action against a freshly resolved locator, re-resolving
   * once if the first attempt fails.
   *
   * Search widgets commonly swap the input element the moment it receives
   * focus (an inline field is replaced by an overlay field), which detaches the
   * node resolved a few milliseconds earlier. Re-resolving turns that race into
   * a retry instead of a failure.
   */
  protected async withFreshLocator(
    target: LocatorTarget,
    description: string,
    action: (locator: Locator) => Promise<void>,
  ): Promise<void> {
    try {
      await action(await this.resolve(target));
      return;
    } catch (error) {
      this.log.debug('First attempt on ' + description + ' failed; re-resolving.', error);
    }

    await action(await this.resolve(target));
  }

  /**
   * Resolves a target to a single visible Locator, applying the fallback
   * strategy when a candidate list is supplied.
   */
  protected async resolve(
    target: LocatorTarget,
    timeout: number = config.defaultTimeout,
  ): Promise<Locator> {
    if (Array.isArray(target)) {
      return this.wait.forFirstVisible(target, timeout);
    }
    const locator = target.first();
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Resolves a candidate list to the locator that represents a collection,
   * such as search result tiles or advert cards.
   *
   * A candidate that renders at least one *visible* node is preferred over one
   * that merely matches nodes. Card grids commonly attach a zero-size wrapper
   * anchor before the card itself renders, so a plain count check can lock onto
   * the wrapper and then fail a downstream visibility assertion. Only if no
   * candidate becomes visible within the timeout does this fall back to the
   * first candidate that matches anything, which keeps counting-only callers
   * working on markup that is attached but off screen.
   */
  protected async resolveGroup(
    candidates: Locator[],
    timeout: number = config.defaultTimeout,
  ): Promise<Locator> {
    try {
      return await this.wait.until(
        async () => {
          for (const candidate of candidates) {
            if (await candidate.first().isVisible()) {
              return candidate;
            }
          }
          return undefined;
        },
        { timeout, message: 'None of the candidate locators produced a visible node' },
      );
    } catch {
      this.log.debug('No candidate became visible; falling back to a match-count resolution.');
    }

    return this.resolveGroupByCount(candidates, 5000);
  }

  /**
   * Resolves a candidate list to the first locator matching at least one node,
   * without requiring visibility.
   */
  private async resolveGroupByCount(
    candidates: Locator[],
    timeout: number = config.defaultTimeout,
  ): Promise<Locator> {
    return this.wait.until(
      async () => {
        for (const candidate of candidates) {
          if ((await candidate.count()) > 0) {
            return candidate;
          }
        }
        return undefined;
      },
      { timeout, message: 'None of the candidate locators matched any node' },
    );
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
