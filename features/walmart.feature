@walmart @regression
Feature: Walmart Website

  As a shopper
  I want to browse and search the Walmart storefront
  So that I can find products and add them to my cart

  @smoke @homepage
  Scenario: Open Walmart Homepage
    Given I open Walmart website
    Then Walmart homepage should load successfully
    And page title should contain "Walmart"
    And Search Walmart field should be displayed
    And Departments option should be displayed
    And Services option should be displayed
    And Sign In option should be displayed
    And Shopping Cart should be displayed
    And Product content sections should be displayed

  @smoke @search
  Scenario: Walmart Product Search
    Given I open Walmart website
    Then Walmart homepage should load successfully
    And page title should contain "Walmart"
    And Search Walmart field should be displayed
    When I click Search Walmart field
    And I enter "laptop"
    And I click Search button
    Then search results should be displayed

  @search @product @cart
  Scenario: Search Product And Verify Cart Availability
    Given I open Walmart website
    When I click Search Walmart field
    And I enter "wireless headphones"
    And I click Search button
    Then search results should be displayed
    And products related to "wireless headphones" should be displayed
    When I select a product from results
    Then product details page should load
    And product name should be displayed
    And product price should be displayed
    And Add To Cart option should be available when applicable
