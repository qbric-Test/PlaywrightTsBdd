import { expect, Page } from '@playwright/test';
import { WalmartLocators } from '../locators/WalmartLocators';
import { config } from '../utilities/ConfigReader';
import { BasePage } from './BasePage';

/**
 * Page object for the Walmart storefront: home page, search results and
 * product details.
 *
 * The three surfaces share one class because they share one header, and the
 * scenarios move between them in a single flow. Locators live in
 * WalmartLocators; this class only expresses behaviour and verification.
 */
export class WalmartPage extends BasePage {
  private readonly elements: WalmartLocators;

  public constructor(page: Page) {
    super(page, 'WalmartPage');
    this.elements = new WalmartLocators(page);
  }

  // --------------------------------------------------------------------
  // Home page
  // --------------------------------------------------------------------

  /**
   * Opens the Walmart home page and clears any first visit interstitial.
   */
  public async openHomePage(): Promise<void> {
    await this.navigate('/');
    await this.dismissInterstitials();
    await this.assertNoBotChallenge();
  }

  /**
   * Verifies the home page shell is rendered: the document is interactive, the
   * main landmark exists and the header search field is present.
   */
  public async verifyHomePageLoaded(): Promise<void> {
    await this.waitForPageReady();
    await this.assertNoBotChallenge();

    await this.assertVisible(this.elements.mainContent, 'Main content area');
    await this.assertVisible(this.elements.searchField, 'Header search field');

    const currentUrl = await this.getCurrentUrl();
    expect(currentUrl, 'Browser should be on the Walmart domain').toContain('walmart.com');

    this.log.info('Walmart home page loaded successfully');
  }

  /**
   * Verifies the document title contains the supplied fragment.
   */
  public async verifyTitleContains(fragment: string): Promise<void> {
    await this.assertTitleContains(fragment);
  }

  /**
   * Verifies the "Search Walmart" field is displayed.
   */
  public async verifySearchFieldVisible(): Promise<void> {
    await this.assertVisible(this.elements.searchField, 'Search Walmart field');
  }

  /**
   * Verifies the "Departments" option is displayed.
   */
  public async verifyDepartmentsVisible(): Promise<void> {
    await this.assertVisible(this.elements.departmentsMenu, 'Departments option');
  }

  /**
   * Verifies the "Services" option is displayed.
   */
  public async verifyServicesVisible(): Promise<void> {
    await this.assertVisible(this.elements.servicesMenu, 'Services option');
  }

  /**
   * Verifies the "Sign In" option is displayed.
   */
  public async verifySignInVisible(): Promise<void> {
    await this.assertVisible(this.elements.signInLink, 'Sign In option');
  }

  /**
   * Verifies the shopping cart control is displayed.
   */
  public async verifyCartVisible(): Promise<void> {
    await this.assertVisible(this.elements.cartIcon, 'Shopping Cart');
  }

  /**
   * Verifies the home page renders at least one merchandising content section.
   */
  public async verifyContentSectionsVisible(): Promise<void> {
    const sections = await this.resolveGroup(this.elements.contentSections);
    const count = await sections.count();

    expect(count, 'Home page should render at least one product content section').toBeGreaterThan(
      0,
    );
    await expect(sections.first(), 'First content section should be visible').toBeVisible({
      timeout: config.expectTimeout,
    });

    this.log.info(count + ' product content section(s) displayed');
  }

  // --------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------

  /**
   * Places focus in the header search field.
   */
  public async clickSearchField(): Promise<void> {
    await this.click(this.elements.searchField, 'Search Walmart field');
  }

  /**
   * Types a search term into the header search field.
   */
  public async enterSearchTerm(term: string): Promise<void> {
    await this.type(this.elements.searchField, term, 60, 'Search Walmart field');
    await this.wait.pause(500);
  }

  /**
   * Submits the search. Uses the magnifier button when it is exposed and falls
   * back to the Enter key, which every markup variant honours.
   */
  public async clickSearchButton(): Promise<void> {
    const buttonVisible = await this.isVisible(this.elements.searchButton, 3000);

    if (buttonVisible) {
      await this.clickWithFallback(this.elements.searchButton, 'Search button');
    } else {
      this.log.warn('Search button not exposed in this variant; submitting with Enter');
      await this.press(this.elements.searchField, 'Enter', 'Search Walmart field');
    }

    await this.waitForSearchResultsUrl();
    await this.dismissInterstitials();
  }

  /**
   * Convenience wrapper: focus, type and submit in one call.
   */
  public async searchProduct(productName: string): Promise<void> {
    this.log.step('Searching for "' + productName + '"');
    await this.clickSearchField();
    await this.enterSearchTerm(productName);
    await this.clickSearchButton();
  }

  /**
   * Verifies the search results grid rendered at least one product tile.
   */
  public async verifySearchResults(): Promise<void> {
    await this.waitForPageReady();
    await this.assertNoBotChallenge();

    const noResults = await this.isVisible(this.elements.noResultsMessage, 2000);
    expect(noResults, 'Search should not return an empty result set').toBe(false);

    const results = await this.resolveGroup(this.elements.searchResultsContainer);
    await expect(results.first(), 'Search results container should be visible').toBeVisible({
      timeout: config.expectTimeout,
    });

    const tiles = await this.resolveGroup(this.elements.searchResultItems);
    const count = await tiles.count();
    expect(count, 'Search results should contain at least one product').toBeGreaterThan(0);

    this.log.info(count + ' search result(s) displayed');
  }

  /**
   * Verifies the returned products are relevant to the search term.
   *
   * Relevance is asserted loosely: at least one result title must contain a
   * meaningful word from the query. A strict full phrase match would fail on
   * legitimate results such as "Wireless Earbuds Headphones".
   */
  public async verifyProductsDisplayed(searchTerm: string): Promise<void> {
    const tiles = await this.resolveGroup(this.elements.searchResultItems);
    const sampleSize = Math.min(await tiles.count(), 10);
    const titles: string[] = [];

    for (let index = 0; index < sampleSize; index += 1) {
      const text = (await tiles.nth(index).innerText()).toLowerCase();
      titles.push(text);
    }

    const keywords = searchTerm
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const relevant = titles.some((title) => keywords.some((keyword) => title.includes(keyword)));

    expect(
      relevant,
      'At least one of the first ' +
        sampleSize +
        ' results should relate to "' +
        searchTerm +
        '". Titles sampled: ' +
        titles.join(' | ').slice(0, 500),
    ).toBe(true);

    this.log.info('Results are relevant to "' + searchTerm + '"');
  }

  // --------------------------------------------------------------------
  // Product details
  // --------------------------------------------------------------------

  /**
   * Opens the first product from the search results.
   *
   * The tile link is opened by URL rather than by click, because Walmart tiles
   * frequently intercept the click with a quick view overlay or open a new tab.
   * Reading the href and navigating keeps the flow deterministic.
   */
  public async selectFirstProduct(): Promise<void> {
    const links = await this.resolveGroup(this.elements.searchResultProductLinks);
    const firstLink = links.first();

    await firstLink.scrollIntoViewIfNeeded();
    const href = await firstLink.getAttribute('href');

    if (href) {
      const productUrl = href.startsWith('http') ? href : config.baseUrl + href;
      this.log.step('Opening the first product: ' + productUrl);
      await this.page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: config.navigationTimeout,
      });
    } else {
      this.log.warn('First product tile exposes no href; falling back to a click');
      await firstLink.click({ timeout: config.defaultTimeout });
    }

    await this.waitForPageReady();
    await this.dismissInterstitials();
  }

  /**
   * Verifies the browser is on a product details page.
   */
  public async verifyProductDetailsPage(): Promise<void> {
    await this.assertNoBotChallenge();
    await this.assertUrlMatches(/\/ip\//);

    // A dead product URL still renders an h1 and a $0.00 placeholder, so the
    // not-found state has to be ruled out before trusting those elements.
    const notFound = await this.isVisible(this.elements.pageNotFound, 2000);
    expect(notFound, 'Product page should not be the "page not found" state').toBe(false);

    await this.assertVisible(this.elements.productTitle, 'Product details page');
    this.log.info('Product details page loaded');
  }

  /**
   * Verifies the product name is displayed and not blank.
   */
  public async verifyProductNameDisplayed(): Promise<void> {
    // Guarded independently: a challenge page also renders an h1, so without
    // this check the step would pass on "Robot or human?".
    await this.assertNoBotChallenge();
    await this.assertVisible(this.elements.productTitle, 'Product name');
    const name = await this.getText(this.elements.productTitle, 'Product name');
    expect(name.length, 'Product name should not be empty').toBeGreaterThan(0);
    this.log.info('Product name: ' + name);
  }

  /**
   * Verifies a currency formatted price is displayed.
   */
  public async verifyProductPriceDisplayed(): Promise<void> {
    await this.assertNoBotChallenge();
    await this.assertVisible(this.elements.productPrice, 'Product price');
    const price = await this.getText(this.elements.productPrice, 'Product price');
    expect(price, 'Product price should be currency formatted').toMatch(/\$\s?\d/);
    this.log.info('Product price: ' + price.replace(/\s+/g, ' '));
  }

  /**
   * Verifies the Add to cart action is available when applicable.
   *
   * Not every product exposes Add to cart: out of stock items, variant driven
   * listings and marketplace-only offers replace it with another primary
   * action. The scenario therefore passes when either Add to cart or a
   * recognised alternative action is present, and fails only when the product
   * page offers no primary action at all.
   */
  public async verifyAddToCartAvailable(): Promise<void> {
    const addToCartVisible = await this.isVisible(this.elements.addToCartButton, 8000);

    if (addToCartVisible) {
      const button = await this.waitForVisible(this.elements.addToCartButton, config.expectTimeout);
      await expect(button, 'Add to cart button should be enabled').toBeEnabled({
        timeout: config.expectTimeout,
      });
      this.log.info('Add To Cart option is available');
      return;
    }

    const alternateVisible = await this.isVisible(this.elements.alternateProductActions, 5000);
    expect(
      alternateVisible,
      'Product page should expose either an Add to cart action or a documented alternative ' +
        '(out of stock, select options, view similar)',
    ).toBe(true);

    this.log.warn('Add To Cart is not applicable for this product; an alternative action is shown');
  }

  // --------------------------------------------------------------------
  // Shared helpers
  // --------------------------------------------------------------------

  /**
   * Closes cookie banners and first visit modals when they appear. Silent and
   * non fatal: none of these overlays is guaranteed to render.
   */
  public async dismissInterstitials(): Promise<void> {
    for (const candidate of this.elements.cookieAcceptButton) {
      try {
        const button = candidate.first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click({ timeout: 5000 });
          this.log.debug('Dismissed a cookie banner');
          break;
        }
      } catch {
        // The banner is optional; ignore and continue.
      }
    }

    for (const candidate of this.elements.modalCloseButton) {
      try {
        const button = candidate.first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click({ timeout: 5000 });
          this.log.debug('Dismissed a modal overlay');
          break;
        }
      } catch {
        // The modal is optional; ignore and continue.
      }
    }
  }

  /**
   * Fails fast with an actionable message when Walmart serves a bot challenge,
   * instead of letting the scenario die on an unrelated locator timeout.
   *
   * Three independent signals are checked, because Walmart varies the response:
   * a redirect to /blocked, a "Robot or human?" document title, and the
   * challenge widget itself.
   */
  public async assertNoBotChallenge(): Promise<void> {
    const url = this.page.url();
    const title = await this.page.title().catch(() => '');

    const blockedByUrl = /\/blocked/i.test(url);
    const blockedByTitle = /robot or human|access denied/i.test(title);
    const blockedByWidget = await this.isVisible(this.elements.botChallenge, 1500);

    if (blockedByUrl || blockedByTitle || blockedByWidget) {
      throw new Error(
        'Walmart served an anti bot verification page instead of the expected content.\n' +
          '  URL:   ' +
          url +
          '\n  Title: ' +
          title +
          '\n' +
          'Walmart blocks headless browsers on the search and product paths. ' +
          'Re-run with HEADLESS=false (npm run test:headed), optionally with a ' +
          'non-zero SLOW_MO, or from an allow-listed network.',
      );
    }
  }

  /**
   * Waits for the URL to become a search results URL, tolerating the client
   * side transition Walmart performs on some variants.
   */
  private async waitForSearchResultsUrl(): Promise<void> {
    try {
      await this.wait.forUrl(/\/search|\/browse|q=/, config.navigationTimeout);
    } catch {
      this.log.debug('Search URL pattern not observed; verifying the results grid directly');
    }
    await this.waitForPageReady();
  }
}
