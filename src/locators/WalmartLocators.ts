import { Locator, Page } from '@playwright/test';

/**
 * Locator repository for the Walmart storefront.
 *
 * Design notes
 * ------------
 * 1. Every element is exposed as an ordered array of candidate locators.
 *    Walmart serves several markup variants (A/B experiments, desktop vs
 *    responsive shells, logged out vs logged in headers), so a single selector
 *    is not reliable. Page objects resolve the first candidate that becomes
 *    visible via WaitUtils.forFirstVisible().
 * 2. Candidates are ordered from most semantic and stable to least:
 *    role and accessible name first, then placeholder and label, then test ids,
 *    and only then structural CSS. No XPath is used.
 * 3. The class holds no state beyond the Page, so it is safe to instantiate
 *    per scenario in a parallel run.
 */
export class WalmartLocators {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  // --------------------------------------------------------------------
  // Global header
  // --------------------------------------------------------------------

  /**
   * The Walmart brand logo / home link in the masthead.
   */
  public get homeLogo(): Locator[] {
    return [
      this.page.getByRole('link', { name: /walmart\s*homepage/i }),
      this.page.getByLabel(/walmart\s*homepage/i),
      this.page.locator('a[aria-label*="Walmart" i][href="/"]'),
      this.page.locator('[data-automation-id="header-logo"]'),
      this.page.locator('svg[aria-label*="Walmart" i]'),
    ];
  }

  /**
   * The "Search Walmart" free text field in the header.
   */
  public get searchField(): Locator[] {
    return [
      this.page.getByRole('searchbox', { name: /search/i }),
      this.page.getByPlaceholder(/search everything at walmart/i),
      this.page.getByPlaceholder(/search walmart/i),
      this.page.getByLabel(/search/i).first(),
      this.page.locator('input[data-automation-id="global-search-input"]'),
      this.page.locator('input[name="q"]'),
      this.page.locator('#global-search-input'),
    ];
  }

  /**
   * The magnifier button that submits the search form.
   */
  public get searchButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /^search$/i }),
      this.page.getByLabel(/^search$/i),
      this.page.locator('button[data-automation-id="global-search-submit"]'),
      this.page.locator('form[role="search"] button[type="submit"]'),
      this.page.locator('button[type="submit"][aria-label*="search" i]'),
    ];
  }

  /**
   * The type-ahead suggestion panel rendered under the search field.
   */
  public get searchSuggestions(): Locator[] {
    return [
      this.page.getByRole('listbox'),
      this.page.locator('[data-automation-id="global-search-typeahead"]'),
      this.page.locator('ul[role="listbox"]'),
    ];
  }

  /**
   * The "Departments" entry point in the header.
   */
  public get departmentsMenu(): Locator[] {
    return [
      this.page.getByRole('button', { name: /departments/i }),
      this.page.getByRole('link', { name: /departments/i }),
      this.page.locator('[data-automation-id="departments-menu"]'),
      this.page
        .locator('header')
        .getByText(/departments/i)
        .first(),
    ];
  }

  /**
   * The "Services" entry point in the header.
   */
  public get servicesMenu(): Locator[] {
    return [
      this.page.getByRole('button', { name: /services/i }),
      this.page.getByRole('link', { name: /services/i }),
      this.page.locator('[data-automation-id="services-menu"]'),
      this.page
        .locator('header')
        .getByText(/services/i)
        .first(),
    ];
  }

  /**
   * The "Sign In" / account entry point in the header.
   */
  public get signInLink(): Locator[] {
    return [
      this.page.getByRole('link', { name: /sign\s*in|account/i }),
      this.page.getByRole('button', { name: /sign\s*in|account/i }),
      this.page.locator('[data-automation-id="header-account"]'),
      this.page.locator('a[href*="/account/login"]'),
      this.page.locator('[link-identifier="Sign In Account"]'),
    ];
  }

  /**
   * The shopping cart icon in the header.
   */
  public get cartIcon(): Locator[] {
    return [
      this.page.getByRole('link', { name: /cart/i }),
      this.page.getByLabel(/cart\s*contains|items? in cart|cart/i),
      this.page.locator('[data-automation-id="header-cart"]'),
      this.page.locator('a[href="/cart"]'),
      this.page.locator('[link-identifier="Cart"]'),
    ];
  }

  // --------------------------------------------------------------------
  // Home page content
  // --------------------------------------------------------------------

  /**
   * The main content landmark of the home page.
   */
  public get mainContent(): Locator[] {
    return [
      this.page.getByRole('main'),
      this.page.locator('main'),
      this.page.locator('#maincontent'),
      this.page.locator('[data-testid="main-content"]'),
    ];
  }

  /**
   * Merchandising / product content sections on the home page. Walmart renders
   * these as tile grids, carousels or hero modules depending on the variant.
   */
  public get contentSections(): Locator[] {
    return [
      this.page.locator('[data-testid*="carousel" i]'),
      this.page.locator('section[data-module-type]'),
      this.page.locator('[data-automation-id*="module" i]'),
      this.page.getByRole('main').locator('section'),
      this.page.locator('main section, main [data-testid]'),
    ];
  }

  // --------------------------------------------------------------------
  // Search results page
  // --------------------------------------------------------------------

  /**
   * Container that wraps the search result grid.
   */
  public get searchResultsContainer(): Locator[] {
    return [
      this.page.locator('[data-testid="item-stack"]'),
      this.page.locator('[data-automation-id="search-result-gridview-items"]'),
      this.page.locator('[data-testid="search-results"]'),
      this.page.getByRole('main').locator('[data-item-id]'),
      this.page.locator('main [data-item-id]'),
    ];
  }

  /**
   * Individual product tiles within the search result grid.
   */
  public get searchResultItems(): Locator[] {
    return [
      this.page.locator('[data-item-id]'),
      this.page.locator('[data-testid="list-view"]'),
      this.page.locator('[data-automation-id="product-tile"]'),
      this.page.getByRole('group').filter({ has: this.page.locator('a[href*="/ip/"]') }),
    ];
  }

  /**
   * Product detail links inside the search result grid.
   */
  public get searchResultProductLinks(): Locator[] {
    return [
      this.page.locator('a[link-identifier][href*="/ip/"]'),
      this.page.locator('[data-item-id] a[href*="/ip/"]'),
      this.page.locator('a[href*="/ip/"]'),
    ];
  }

  /**
   * The heading that echoes the search term, for example: results for "laptop".
   */
  public get searchResultsHeading(): Locator[] {
    return [
      this.page.getByRole('heading', { name: /results for/i }),
      this.page.locator('[data-automation-id="search-result-heading"]'),
      this.page.locator('h1, h2').filter({ hasText: /results/i }),
    ];
  }

  /**
   * The empty state shown when a query returns nothing.
   */
  public get noResultsMessage(): Locator[] {
    return [
      this.page.getByText(/we (?:didn.t|did not) find|no results|0 results/i),
      this.page.locator('[data-automation-id="no-results"]'),
    ];
  }

  // --------------------------------------------------------------------
  // Product details page
  // --------------------------------------------------------------------

  /**
   * The not-found state. A dead product URL still renders an h1 and a $0.00
   * placeholder, so the product checks must rule this out explicitly.
   */
  public get pageNotFound(): Locator[] {
    return [
      this.page.getByText(/we (?:couldn.t|could not|can.t) find this page/i),
      this.page.getByText(/page (?:not found|isn.t available)/i),
      this.page.getByRole('heading', { name: /couldn.t find this page/i }),
    ];
  }

  /**
   * The product title on the product details page.
   */
  public get productTitle(): Locator[] {
    return [
      this.page.getByTestId('product-title'),
      this.page.locator('[itemprop="name"]'),
      this.page.locator('h1[data-automation-id="product-title"]'),
      this.page.getByRole('heading', { level: 1 }),
      this.page.locator('main h1'),
    ];
  }

  /**
   * The current price on the product details page.
   */
  public get productPrice(): Locator[] {
    return [
      this.page.locator('[itemprop="price"]'),
      this.page.getByTestId('price-wrap'),
      this.page.locator('[data-automation-id="product-price"]'),
      this.page.locator('span[data-seo-id="hero-price"]'),
      this.page.getByText(/^\$\d[\d,]*(\.\d{2})?$/).first(),
    ];
  }

  /**
   * The primary "Add to cart" call to action. Optional: out of stock items and
   * marketplace-only listings replace it with other actions.
   */
  public get addToCartButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /add to cart/i }),
      this.page.getByTestId('add-to-cart-section').getByRole('button'),
      this.page.locator('[data-automation-id="atc"]'),
      this.page.locator('button[data-seo-id="add-to-cart"]'),
    ];
  }

  /**
   * Alternative primary actions shown when Add to cart is unavailable.
   */
  public get alternateProductActions(): Locator[] {
    return [
      this.page.getByRole('button', { name: /out of stock|sold out/i }),
      this.page.getByRole('link', { name: /view (?:similar|options)/i }),
      this.page.getByRole('button', { name: /options|select options/i }),
      this.page.getByText(/currently (?:out of stock|unavailable)/i),
    ];
  }

  // --------------------------------------------------------------------
  // Interstitials and bot walls
  // --------------------------------------------------------------------

  /**
   * Cookie / privacy banners. Dismissed automatically so they never obscure the
   * elements under test.
   */
  public get cookieAcceptButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /accept all cookies|accept cookies|i accept/i }),
      this.page.locator('#onetrust-accept-btn-handler'),
      this.page.locator('[data-automation-id="cookie-accept"]'),
    ];
  }

  /**
   * Generic modal close controls, for example the location or email capture
   * overlays Walmart shows to first time visitors.
   */
  public get modalCloseButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /^close$/i }),
      this.page.getByLabel(/close dialog|close modal/i),
      this.page.locator('[data-automation-id="modal-close"]'),
      this.page.locator('button[aria-label="Close"]'),
    ];
  }

  /**
   * Anti bot challenge screens. Detecting these lets the framework fail with a
   * clear message instead of an opaque locator timeout.
   */
  public get botChallenge(): Locator[] {
    return [
      this.page.getByText(/robot or human|verify your identity|press & hold/i),
      this.page.locator('#px-captcha'),
      this.page.locator('[id*="captcha" i]'),
    ];
  }
}
