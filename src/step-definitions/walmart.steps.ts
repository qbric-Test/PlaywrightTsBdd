import { Given, Then, When } from '@cucumber/cucumber';
import { PlaywrightWorld } from '../support/World';

/**
 * Step definitions for features/walmart.feature.
 *
 * Steps stay thin on purpose: they translate Gherkin into page object calls and
 * carry scenario state through the custom World. All waiting, locator fallback
 * and assertion logic lives in the page objects.
 */

// ----------------------------------------------------------------------
// Given
// ----------------------------------------------------------------------

Given('I open Walmart website', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.openHomePage();
});

// ----------------------------------------------------------------------
// When
// ----------------------------------------------------------------------

When('I click Search Walmart field', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.clickSearchField();
});

When('I enter {string}', async function (this: PlaywrightWorld, searchTerm: string): Promise<void> {
  await this.walmartPage.enterSearchTerm(searchTerm);
  this.set('searchTerm', searchTerm);
});

When('I click Search button', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.clickSearchButton();
});

When('I search for {string}', async function (this: PlaywrightWorld, term: string): Promise<void> {
  await this.walmartPage.searchProduct(term);
  this.set('searchTerm', term);
});

When('I select a product from results', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.selectFirstProduct();
});

// ----------------------------------------------------------------------
// Then - home page
// ----------------------------------------------------------------------

Then(
  'Walmart homepage should load successfully',
  async function (this: PlaywrightWorld): Promise<void> {
    await this.walmartPage.verifyHomePageLoaded();
  },
);

Then(
  'page title should contain {string}',
  async function (this: PlaywrightWorld, expectedFragment: string): Promise<void> {
    await this.walmartPage.verifyTitleContains(expectedFragment);
  },
);

Then(
  'Search Walmart field should be displayed',
  async function (this: PlaywrightWorld): Promise<void> {
    await this.walmartPage.verifySearchFieldVisible();
  },
);

Then(
  'Departments option should be displayed',
  async function (this: PlaywrightWorld): Promise<void> {
    await this.walmartPage.verifyDepartmentsVisible();
  },
);

Then('Services option should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifyServicesVisible();
});

Then('Sign In option should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifySignInVisible();
});

Then('Shopping Cart should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifyCartVisible();
});

Then(
  'Product content sections should be displayed',
  async function (this: PlaywrightWorld): Promise<void> {
    await this.walmartPage.verifyContentSectionsVisible();
  },
);

// ----------------------------------------------------------------------
// Then - search results
// ----------------------------------------------------------------------

Then('search results should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifySearchResults();
});

Then(
  'products related to {string} should be displayed',
  async function (this: PlaywrightWorld, searchTerm: string): Promise<void> {
    await this.walmartPage.verifyProductsDisplayed(searchTerm);
  },
);

// ----------------------------------------------------------------------
// Then - product details
// ----------------------------------------------------------------------

Then('product details page should load', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifyProductDetailsPage();
});

Then('product name should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifyProductNameDisplayed();
});

Then('product price should be displayed', async function (this: PlaywrightWorld): Promise<void> {
  await this.walmartPage.verifyProductPriceDisplayed();
});

Then(
  'Add To Cart option should be available when applicable',
  async function (this: PlaywrightWorld): Promise<void> {
    await this.walmartPage.verifyAddToCartAvailable();
  },
);
