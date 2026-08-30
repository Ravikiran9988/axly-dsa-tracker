const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Take README Screenshots', () => {
  const screenshotsDir = path.join(__dirname, '../../docs/screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  async function loginAsStudent(page) {
    const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
      data: { email: 'alex@example.com', role: 'user' }
    });
    const body = await res.json();
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('axly_auth_token', token);
    }, body.token);
  }

  async function loginAsAdmin(page) {
    const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
      data: { email: 'admin@axly.in', role: 'admin' }
    });
    const body = await res.json();
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('axly_auth_token', token);
    }, body.token);
  }

  test.use({ viewport: { width: 1440, height: 900 } });

  test('Capture Landing/Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'landing.png') });
  });

  test('Capture Learner Dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
  });

  test('Capture Question Bank (Practice List)', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Select a filter to make it visible
    const difficultySelect = page.locator('.practice-filters select').nth(0);
    if (await difficultySelect.count() > 0) {
       await difficultySelect.selectOption('Medium');
       await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'question-bank.png') });
  });

  test('Capture Question Detail (Code Editor)', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const firstProblemRow = page.locator('tbody tr').first();
    await firstProblemRow.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Let workspace load
    
    await page.screenshot({ path: path.join(screenshotsDir, 'code-editor.png') });
  });

  test('Capture Submission History', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    // Check if there is a nav item or direct URL to history
    await page.click('text=History').catch(() => page.goto('/submissions'));
    // Wait for network requests to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'submission-history.png') });
  });

  test('Capture Admin Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'admin-dashboard.png') });
  });

  test('Capture Admin Question Management', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.click('text=Questions').catch(() => page.goto('/admin/questions'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'admin-questions.png') });
  });
});
