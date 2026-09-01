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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true
  },
  webServer: [
    {
      command: 'npm start',
      cwd: './backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'development',
        PORT: '5000'
      }
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      cwd: './frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    }
  ]
});
