const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node mock-server/server.js',
    url: 'http://127.0.0.1:3100/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    { name: 'service', testMatch: /tests\/(api|ai|security|performance)\/.*\.spec\.js/ },
    {
      name: 'chromium',
      testMatch: /tests\/ui\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
