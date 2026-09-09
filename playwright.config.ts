import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90000,
  expect: {timeout: 10000},
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    [
      'json',
      {outputFile: process.env.AURA_E2E_REPORT || 'test-results/results.json'},
    ],
  ],
  use: {
    baseURL: process.env.AURA_E2E_URL || 'http://127.0.0.1:3111',
    viewport: {width: 390, height: 844},
    trace: 'off',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
  },
  projects: [
    {name: 'chrome', use: {browserName: 'chromium', channel: 'chrome'}},
    ...(process.env.AURA_TEST_WEBKIT === '1'
      ? [{name: 'webkit', use: {browserName: 'webkit' as const}}]
      : []),
  ],
});
