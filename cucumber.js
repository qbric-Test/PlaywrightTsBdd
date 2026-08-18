require('dotenv').config();

const retry = Number(process.env.RETRY_COUNT || 0);

const common = {
  requireModule: ['ts-node/register', 'tsconfig-paths/register'],
  require: ['src/support/**/*.ts', 'src/hooks/**/*.ts', 'src/step-definitions/**/*.ts'],
  paths: ['features/**/*.feature'],
  format: [
    'summary',
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    'junit:reports/junit-report.xml',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    printAttachments: true,
  },
  parallel: Number(process.env.PARALLEL_WORKERS || 2),
  retry,
  // Cucumber rejects a retryTagFilter when retry is 0, so only scope the
  // retries to @flaky when retries are actually enabled.
  ...(retry > 0 ? { retryTagFilter: '@flaky' } : {}),
  strict: true,
  worldParameters: {
    baseUrl: process.env.BASE_URL || 'https://www.walmart.com',
  },
};

module.exports = {
  default: common,

  smoke: {
    ...common,
    tags: '@smoke',
  },

  regression: {
    ...common,
    tags: '@regression',
  },

  ci: {
    ...common,
    parallel: Number(process.env.PARALLEL_WORKERS || 4),
    retry: 1,
    retryTagFilter: '',
    format: [
      'summary',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'junit:reports/junit-report.xml',
    ],
  },
};
