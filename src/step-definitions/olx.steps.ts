import { Given, Then, When } from '@cucumber/cucumber';
import { PlaywrightWorld } from '../support/World';

/**
 * Step definitions for features/olx.feature.
 */

// ----------------------------------------------------------------------
// Given
// ----------------------------------------------------------------------

Given('I open OLX website', async function (this: PlaywrightWorld): Promise<void> {
  await this.olxPage.openHomePage();
});

// ----------------------------------------------------------------------
// When
// ----------------------------------------------------------------------

When(
  'I click on {string} from the top categories section',
  async function (this: PlaywrightWorld, categoryName: string): Promise<void> {
    await this.olxPage.clickTopCategory(categoryName);
    this.set('category', categoryName);
  },
);

When(
  'I click on the {string} dropdown',
  async function (this: PlaywrightWorld, dropdownName: string): Promise<void> {
    if (!/sort by/i.test(dropdownName)) {
      throw new Error('Unsupported dropdown: "' + dropdownName + '"');
    }
    await this.olxPage.openSortDropdown();
  },
);

When(
  'I select {string} from the sort options',
  async function (this: PlaywrightWorld, optionName: string): Promise<void> {
    await this.olxPage.selectSortOption(optionName);
    this.set('sortOption', optionName);
  },
);

// ----------------------------------------------------------------------
// Then
// ----------------------------------------------------------------------

Then(
  'the page title should be {string}',
  async function (this: PlaywrightWorld, expectedTitle: string): Promise<void> {
    await this.olxPage.verifyPageTitleIs(expectedTitle);
  },
);

Then(
  'the page URL should contain {string}',
  async function (this: PlaywrightWorld, fragment: string): Promise<void> {
    await this.olxPage.verifyUrlContains(fragment);
  },
);

Then(
  'the Country dropdown should have {string} selected',
  async function (this: PlaywrightWorld, expectedCountry: string): Promise<void> {
    await this.olxPage.verifyCountrySelected(expectedCountry);
  },
);

Then(
  'the Search field placeholder should be {string}',
  async function (this: PlaywrightWorld, expectedPlaceholder: string): Promise<void> {
    await this.olxPage.verifySearchPlaceholder(expectedPlaceholder);
  },
);

Then('the listing content should be loaded', async function (this: PlaywrightWorld): Promise<void> {
  await this.olxPage.waitForContentLoaded();
  await this.olxPage.verifyListingsDisplayed();
});

Then(
  'the selected sort option should be {string}',
  async function (this: PlaywrightWorld, expectedOption: string): Promise<void> {
    await this.olxPage.verifySortOptionSelected(expectedOption);
  },
);
