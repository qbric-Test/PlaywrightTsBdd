@olx @regression
Feature: OLX Pakistan Mobiles Category

  As a buyer browsing OLX Pakistan
  I want to open the Mobiles category and sort the adverts by how recently they were listed
  So that I see the newest mobile phones on offer first

  @smoke @olx-mobiles
  Scenario: Browse the Mobiles category and sort by newly listed
    Given I open OLX website
    When I click on "Mobiles" from the top categories section
    Then the page title should be "Mobiles for Sale in Pakistan | Mobile Prices in Pakistan"
    And the Country dropdown should have "Pakistan" selected
    And the Search field placeholder should be "Find Cars, Mobile Phones and more..."
    When I click on the "Sort by" dropdown
    And I select "Newly listed" from the sort options
    Then the listing content should be loaded
    And the selected sort option should be "Newly listed"
