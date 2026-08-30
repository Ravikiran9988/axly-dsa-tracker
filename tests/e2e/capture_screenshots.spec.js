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

  test('Capture Dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); 
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
  });

  test('Capture Practice Library', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'practice.png') });
  });

  test('Capture Problem Workspace + AI', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click the first problem card button
    const firstProblemBtn = page.locator('.practice-card button').first();
    await firstProblemBtn.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); 
    
    // Open AI Coach Panel if not already visible/active
    try {
      await page.click('text=DSA AI Coach');
      await page.waitForTimeout(1000);
    } catch (e) {}

    await page.screenshot({ path: path.join(screenshotsDir, 'dsa-ai.png') });
  });

  test('Capture Problem Workspace', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Practice');
    await page.waitForLoadState('networkidle');
    
    const firstProblemBtn = page.locator('.practice-card button').first();
    await firstProblemBtn.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); 

    await page.screenshot({ path: path.join(screenshotsDir, 'problem-workspace.png') });
  });

  test('Capture Daily Challenge', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Daily Challenge');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(screenshotsDir, 'daily-challenge.png') });
  });

  test('Capture Progress', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/');
    await page.click('text=Progress');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(screenshotsDir, 'progress.png') });
  });

  test('Capture Mobile Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsStudent(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile.png') });
  });

});
