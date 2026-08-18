| **Headed** (`HEADLESS=false`) | **Works** |# PlaywrightTsBdd

Playwright + TypeScript + Cucumber BDD automation framework built on the Page Object Model.

## Stack

| Concern            | Tool                            |
| ------------------ | ------------------------------- |
| Browser automation | Playwright                      |
| Language           | TypeScript                      |
| BDD runner         | Cucumber (`@cucumber/cucumber`) |
| Runtime            | Node.js 18+                     |
| Config             | dotenv                          |
| Quality            | ESLint + Prettier               |

## Setup

```bash
npm install
```

```bash
npx playwright install --with-deps
```

## Run

| Command                   | What it does                               |
| ------------------------- | ------------------------------------------ |
| `npm run test`            | Full suite, parallel, headless             |
| `npm run test:olx`        | OLX Pakistan feature only                  |
| `npm run test:walmart`    | Walmart feature only (forces a headed run) |
| `npm run test:chrome`     | Full suite on Chromium                     |
| `npm run test:headed`     | Force a visible browser                    |
| `npm run test:headless`   | Force headless                             |
| `npm run test:smoke`      | `@smoke` tagged scenarios only             |
| `npm run test:regression` | `@regression` tagged scenarios only        |
| `npm run test:parallel`   | Four parallel workers                      |
| `npm run test:serial`     | Single process, useful when debugging      |
| `npm run lint`            | ESLint over all TypeScript                 |
| `npm run format`          | Prettier write                             |
| `npm run typecheck`       | `tsc --noEmit`                             |

## Features

### `features/olx.feature` — OLX Pakistan (primary, green headless and headed)

Opens olx.com.pk, enters the Mobiles category from the top categories strip,
verifies the page title, the country selector and the search placeholder, then
sorts by "Newly listed" and waits for the re-queried listings.

### `features/walmart.feature` — Walmart (kept as a second example)

Home page, product search and product details. See the bot-protection section
below: the home page scenario is reliable, the search and product scenarios are
subject to Walmart's PerimeterX challenge.

## Layout

```
PlaywrightTsBdd
├── package.json
├── tsconfig.json
├── playwright.config.ts      # launch/context options shared with the hooks
├── cucumber.js               # runner profiles: default, smoke, regression, ci
├── .env                      # environment configuration
├── src
│   ├── pages                 # BasePage, OlxPage, WalmartPage
│   ├── locators              # OlxLocators, WalmartLocators (candidate fallback)
│   ├── utilities             # Logger, ConfigReader, WaitUtils
│   ├── hooks                 # Before / AfterStep / After lifecycle
│   ├── step-definitions      # olx.steps.ts, walmart.steps.ts
│   └── support               # custom World
├── features                  # olx.feature, walmart.feature
├── reports                   # HTML / JSON / JUnit reports
└── test-results              # screenshots, videos, traces, logs
```

## Configuration

Everything is driven from `.env`; real environment variables override it, so CI
can do `BROWSER=firefox HEADLESS=true npm test` without editing files.

Key values: `BASE_URL` (Walmart), `OLX_BASE_URL`, `BROWSER`, `HEADLESS`, `PARALLEL_WORKERS`,
`SCREENSHOT`, `VIDEO`, `TRACE` (each `on` / `off` / `retain-on-failure`),
and `LOG_LEVEL`.

## Reports and failure artifacts

- HTML report: `reports/cucumber-report.html`
- JSON / JUnit: `reports/cucumber-report.json`, `reports/junit-report.xml`
- Screenshots: `test-results/screenshots/` (also attached to the HTML report)
- Videos: `test-results/videos/`
- Traces: `test-results/traces/` — open with
  `npx playwright show-trace test-results/traces/<file>.zip`
- Execution log: `test-results/logs/execution.log`

Under the default `retain-on-failure` mode, artifacts for passing scenarios are
discarded and only failures leave a screenshot, video and trace behind.

## Known limitation: Walmart bot protection

Walmart runs PerimeterX. `walmart.com/` (the home page) is reachable, but
`/search` and `/ip/` frequently redirect to `/blocked` with a **"Robot or human?
Press and hold"** challenge. This is the site defending itself, not a framework
defect, and the amount of traffic a test suite generates makes it more likely.

Verified behaviour on this machine:

| Configuration                                     | `/search` result     |
| ------------------------------------------------- | -------------------- |
| Headless                                          | Blocked              |
| Headless + realistic user agent                   | Blocked              |
| **Headed** (`HEADLESS=false`, the default here)   | **Works**            |
| Headed + `--start-maximized` and a fixed viewport | Blocked              |
| Repeated searches in quick succession from one IP | Blocked (rate based) |

Two lessons are baked into the framework:

1. `--start-maximized` is deliberately **not** passed to Chromium. Together with
   the fixed `VIEWPORT_*` it creates a window/screen metric mismatch that the
   protection flags — and Playwright overrides the flag anyway once a viewport
   is set.
2. `WalmartPage.assertNoBotChallenge()` checks the URL, the document title and
   the challenge widget, and fails the step with an explicit message. Without
   it, a blocked run reports a meaningless locator timeout — and worse, checks
   like "product name should be displayed" would _pass_ against the challenge
   page, which also renders an `h1`.

The challenge itself is a human verification step; the suite does not attempt to
solve it. If you need a green run every time, either point `BASE_URL` at an
environment that permits automated traffic, run from an allow-listed network, or
space the scenarios out (`--parallel 0`, and avoid back-to-back searches).

## Design notes

**Locator fallback.** Every element in `OlxLocators` / `WalmartLocators` is an
ordered array of candidates, most semantic first (`getByRole`,
`getByPlaceholder`, `getByLabel`, image `alt`), falling back to structural CSS.
`WaitUtils.forFirstVisible()` picks the first candidate that renders, so a
markup variant does not break the suite. No XPath is used. This matters most on
OLX, whose CSS class names are build hashes (`_520955ba`) that change on every
deploy and are therefore never used as selectors.

**Isolation.** The `Before` hook launches a browser, context and page per
scenario, so parallel workers never share state.

**Bot walls.** The page object fails fast with an explicit message when Walmart
serves an anti-bot challenge, instead of timing out on an unrelated locator.

## Adding a page

1. Add locators to `src/locators/<Name>Locators.ts` as candidate arrays.
2. Create `src/pages/<Name>Page.ts` extending `BasePage`.
3. Expose the page object on the World in `src/hooks/Hooks.ts`.
4. Write the feature, then the step definitions that delegate to the page object.
