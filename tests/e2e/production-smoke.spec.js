const { test, expect } = require('@playwright/test');

const productionBaseURL = process.env.PRODUCTION_BASE_URL || 'https://dsatracker.axly.in';

test.describe('Axly DSA Tracker — Production Smoke Tests', () => {
  test('production frontend loads', async ({ page }) => {
    await page.goto(productionBaseURL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Axly DSA Tracker/i);
    await expect(page.locator('text=AXLY DSA TRACKER').first()).toBeVisible({ timeout: 15000 });
  });

  test('production API health check responds', async ({ request }) => {
    // The backend exposes liveness at /health, not /api/v1/health.
    // Accept either a host-only secret or the previously configured /api/v1 base.
    const configuredURL = process.env.PRODUCTION_API_URL;
    const apiBaseURL = (configuredURL || 'https://dsa-tracker-ee58e15ab674.herokuapp.com')
      .replace(/\/+$/, '')
      .replace(/\/api\/v1$/, '');

    const response = await request.get(`${apiBaseURL}/health`);
    expect(response.ok()).toBeTruthy();
  });
});
