const { test, expect } = require('@playwright/test');

const productionBaseURL = process.env.PRODUCTION_BASE_URL || 'https://dsatracker.axly.in';

test.describe('Axly DSA Tracker — Production Smoke Tests', () => {
  test('production frontend loads', async ({ page }) => {
    await page.goto(productionBaseURL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Axly DSA Tracker/i);
    await expect(page.locator('text=AXLY DSA TRACKER').first()).toBeVisible({ timeout: 15000 });
  });

  test('production API health check responds', async ({ request }) => {
    const apiBaseURL = process.env.PRODUCTION_API_URL || 'https://dsatracker-api.herokuapp.com/api/v1';
    const response = await request.get(`${apiBaseURL}/health`);
    expect(response.ok()).toBeTruthy();
  });
});
