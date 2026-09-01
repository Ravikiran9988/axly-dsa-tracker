const { test, expect } = require('@playwright/test');

async function loginAsStudent(page) {
  const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const body = await res.json();
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('axly_auth_token', token);
  }, body.token);
  await page.goto('/');
  await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });
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
  await page.goto('/');

  // AdminCoreDashboard renders "Admin", not "Admin Dashboard".
  await expect(page.locator('h1').filter({ hasText: /^Admin$/ }).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Axly DSA Tracker — Core End-to-End Specs', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Authentication Flow: Marketing Landing Page & Dedicated Login Page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Axly DSA Tracker/);
    await expect(page.locator('text=AXLY DSA TRACKER').first()).toBeVisible();

    await expect(page.locator('#google-signin-btn')).not.toBeVisible();

    await page.click('header button:has-text("Get Started")');
    await expect(page.locator('#google-signin-btn')).toBeVisible();

    await expect(page.locator('#btn-login-user-alex')).not.toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).not.toBeVisible();
  });

  test('2. Student Journey: Dashboard, In-Platform IDE, Run Code & Test Cases', async ({ page }) => {
    await loginAsStudent(page);

    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice Library")')).toBeVisible({ timeout: 10000 });

    const solveBtn = page.locator('button:has-text("Solve"), button:has-text("Continue"), button:has-text("Review")').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();

    await expect(page.locator('button:has-text("Run")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Submit")')).toBeVisible();

    await page.click('button:has-text("Run")');
    await expect(page.locator('button:has-text("Results")').first()).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice")')).toBeVisible({ timeout: 10000 });

    const logoutBtn = page.locator('#logout-button, #logout-btn, button[title="Log out"]').first();
    await logoutBtn.click();
    await expect(page.locator('text=AXLY DSA TRACKER').first()).toBeVisible();
  });

  test('3. Admin Journey: Admin Portal, Question Bank & Content Management', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Question Bank', exact: true }).click();
    await expect(page.locator('h1:has-text("Question Bank Management")')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Daily Challenge', exact: true }).click();
    await expect(page.locator('h1:has-text("Daily Challenge Portal")')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await expect(page.locator('h1:has-text("Student & User Management")')).toBeVisible({ timeout: 10000 });
  });

  test('4. RBAC & Security Boundary: Regular student cannot access Admin Question Bank', async ({ page }) => {
    await loginAsStudent(page);

    await expect(page.locator('button:has-text("Question Bank")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).not.toBeVisible();
  });

  test('5. Student Navigation: Practice, Daily Challenge & Leaderboard', async ({ page }) => {
    await loginAsStudent(page);

    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Leaderboard")');
    await expect(page.locator('h1:has-text("Leaderboard")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("My Progress")');
    await expect(page.locator('h1:has-text("Learning Progress & Analytics")')).toBeVisible({ timeout: 10000 });
  });
});