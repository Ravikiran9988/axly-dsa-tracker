const { test: base, chromium } = require('@playwright/test');

const test = base.extend({
  context: async ({}, use) => {
    const userDataDir = 'C:\\Users\\ADMIN\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data';
    const executablePath = 'C:\\Users\\ADMIN\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    
    // Launch persistent context
    const context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: false,
      viewport: null,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
      ]
    });
    
    await use(context);
    
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  }
});

module.exports = { test, expect: base.expect };
