const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://dsatracker.axly.in',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: false
  },
  webServer: [
    {
      command: 'npm start',
      cwd: './backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    },
    {
      command: 'npm run dev',
      cwd: './frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    }
  ]
});
