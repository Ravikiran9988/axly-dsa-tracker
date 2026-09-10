const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:5000/api/v1';

async function loginAsStudent(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
}

async function loginAsAdmin(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
}

test.describe('Take README Screenshots', () => {
  const screenshotsDir = path.join(__dirname, '../../docs/screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.use({ viewport: { width: 1440, height: 900 } });

  test('Capture Landing/Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'landing.png'), fullPage: false });
  });

  test('Capture Learner Dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png'), fullPage: false });
  });

  test('Capture Question Bank (Practice List)', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'question-bank.png'), fullPage: false });
  });

  test('Capture Question Detail (Code Editor)', async ({ page }) => {
    await loginAsStudent(page);
    // Fetch first practice problem ID from API
    const res = await page.request.get(`${API}/practice/problems`, {
      headers: { Authorization: await page.evaluate(() => `Bearer ${localStorage.getItem('axly_auth_token')}`) }
    });
    const data = await res.json();
    const firstId = data?.data?.[0]?.id;
    if (firstId) {
      await page.goto(`/solve/${firstId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'code-editor.png'), fullPage: false });
  });

  test('Capture Submission History', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/submissions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'submission-history.png'), fullPage: false });
  });

  test('Capture Admin Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'admin-dashboard.png'), fullPage: false });
  });

  test('Capture Admin Question Management', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin-challenges');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'admin-questions.png'), fullPage: false });
  });
});
