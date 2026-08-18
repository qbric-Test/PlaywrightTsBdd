import { Locator, Page } from '@playwright/test';

/**
 * Locator repository for OLX Pakistan (olx.com.pk).
 *
 * Every element is exposed as an ordered array of candidate locators, most
 * semantic first, and the page object resolves the first candidate that becomes
 * visible. OLX ships hashed CSS class names (`_520955ba`, `b5720141`), which
 * change on every deploy, so those are never used as primary selectors: the
 * candidates lean on roles, placeholders, image alt text and stable href
 * patterns instead.
 */
export class OlxLocators {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  // --------------------------------------------------------------------
  // Header
  // --------------------------------------------------------------------

  /**
   * The country / location selector in the header.
   *
   * OLX renders this as a text input with the placeholder "Location" whose
   * value is the currently selected location, not as a native select, so the
   * selection is verified with a value assertion.
   */
  public get countryDropdown(): Locator[] {
    return [
      this.page.getByPlaceholder('Location', { exact: true }),
      this.page.locator('input[placeholder="Location"]'),
      this.page.locator('header input[placeholder*="Location" i]'),
    ];
  }

  /**
   * The main search field that sits next to the country selector.
   */
  public get searchField(): Locator[] {
    return [
      this.page.getByPlaceholder('Find Cars, Mobile Phones and more...'),
      this.page.locator('input[placeholder^="Find Cars"]'),
      this.page.getByRole('textbox', { name: /find cars/i }),
    ];
  }

  /**
   * The search submit control.
   */
  public get searchButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /^search$/i }),
      this.page.locator('button:has(img[alt*="search" i])'),
    ];
  }

  /**
   * The OLX logo / home link.
   */
  public get homeLogo(): Locator[] {
    return [
      this.page.getByRole('link', { name: /olx/i }).first(),
      this.page.locator('a[href="/"]').first(),
    ];
  }

  // --------------------------------------------------------------------
  // Home page: top categories
  // --------------------------------------------------------------------

  /**
   * A tile in the top categories strip on the home page.
   *
   * The category name appears twice on the page: once as a plain text link in a
   * collapsed list and once as the icon tile in the top categories section.
   * Only the tile is visible, so the `:has(img)` variant is listed before the
   * bare href so the tile wins whenever both are attached.
   *
   * @param categoryName Visible category label, for example "Mobiles".
   */
  public topCategory(categoryName: string): Locator[] {
    const escaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = new RegExp('^\\s*' + escaped + '\\s*$', 'i');

    return [
      this.page.locator('a').filter({ has: this.page.locator('img[alt="' + categoryName + '"]') }),
      this.page.getByRole('link', { name: categoryName, exact: true }),
      this.page.getByRole('link', { name: exact }),
      this.page.locator('a').filter({ hasText: exact }),
    ];
  }

  // --------------------------------------------------------------------
  // Category / search results page
  // --------------------------------------------------------------------

  /**
   * The "Sort by" dropdown trigger.
   *
   * Rendered as a button holding two spans ("Sort by: " and the current value)
   * plus a chevron image whose alt text is stable.
   */
  public get sortByDropdown(): Locator[] {
    return [
      this.page.locator('button:has(img[alt="Sort options dropdown"])'),
      this.page.locator('button').filter({ hasText: /sort by/i }),
      this.page.getByRole('button', { name: /sort by/i }),
    ];
  }

  /**
   * The option list revealed by the sort dropdown.
   */
  public get sortOptionsList(): Locator[] {
    return [this.page.getByRole('listbox'), this.page.locator('ul[role="listbox"]')];
  }

  /**
   * A single option inside the sort dropdown.
   *
   * @param optionName Visible option label, for example "Newly listed".
   */
  public sortOption(optionName: string): Locator[] {
    const escaped = optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = new RegExp('^\\s*' + escaped + '\\s*$', 'i');

    return [
      this.page.getByRole('option', { name: optionName, exact: true }),
      this.page.locator('li[role="option"]').filter({ hasText: exact }),
      this.page.getByRole('listbox').getByText(exact),
      this.page.getByText(exact).first(),
    ];
  }

  /**
   * The currently selected sort option, marked by aria-selected="true".
   */
  public get selectedSortOption(): Locator[] {
    return [
      this.page.locator('li[role="option"][aria-selected="true"]'),
      this.page.getByRole('option', { selected: true }),
    ];
  }

  /**
   * Individual advert cards in the results list.
   */
  public get listingItems(): Locator[] {
    return [
      this.page.locator('li[aria-label="Listing"]'),
      this.page.locator('a[href*="-iid-"]'),
      this.page.locator('article'),
    ];
  }

  /**
   * Links pointing at an individual advert. OLX item URLs always carry an
   * "-iid-<id>" suffix, which makes this a reliable structural anchor.
   */
  public get listingLinks(): Locator[] {
    return [this.page.locator('a[href*="-iid-"]'), this.page.locator('a[href*="/item/"]')];
  }

  /**
   * The results heading, for example "Mobile Phones for sale in Pakistan".
   */
  public get resultsHeading(): Locator[] {
    return [this.page.getByRole('heading').first(), this.page.locator('h1').first()];
  }

  /**
   * The loading indicator OLX shows while re-fetching a sorted result set.
   */
  public get loadingIndicator(): Locator[] {
    return [
      this.page.locator('[class*="loader" i]'),
      this.page.locator('[class*="spinner" i]'),
      this.page.getByRole('progressbar'),
    ];
  }

  // --------------------------------------------------------------------
  // Interstitials
  // --------------------------------------------------------------------

  /**
   * Cookie / consent banners.
   */
  public get cookieAcceptButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /accept all|accept cookies|i agree|got it/i }),
      this.page.locator('#onetrust-accept-btn-handler'),
    ];
  }

  /**
   * Login or promo overlays that can appear over the results.
   */
  public get modalCloseButton(): Locator[] {
    return [
      this.page.getByRole('button', { name: /^close$/i }),
      this.page.getByLabel(/close/i).first(),
      this.page.locator('button[aria-label="Close"]'),
    ];
  }
}
