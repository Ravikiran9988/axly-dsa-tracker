const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

async function loginAsStudent(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Welcome back/i })).toBeVisible({ timeout: 15000 });
}

async function loginAsAdmin(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
  await page.goto('/admin-dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible({ timeout: 15000 });
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

    // Landing page has master DSA heading
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Master DSA/i }).first()).toBeVisible();

    // No dev login shortcuts on landing page
    await expect(page.locator('#google-signin-btn')).not.toBeVisible();
    await expect(page.locator('#btn-login-user-alex')).not.toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).not.toBeVisible();

    // "Get Started" navigates to /login, which has the Google sign-in button
    await page.locator('header').getByRole('button', { name: /Get Started/i }).click();
    await expect(page.locator('#google-signin-btn')).toBeVisible({ timeout: 8000 });
  });

  test('2. Student Journey: Dashboard, In-Platform IDE, Run Code & Test Cases', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Practice Library from sidebar
    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });

    // Open first problem
    const solveBtn = page.getByRole('button', { name: /Solve|Continue|Review/i }).first();
    await expect(solveBtn).toBeVisible({ timeout: 5000 });
    await solveBtn.click();

    // Workspace: Run & Submit buttons
    await expect(page.getByRole('button', { name: /Run/i })).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible();

    // Run code
    await page.getByRole('button', { name: /Run/i }).click();
    await expect(page.getByRole('button', { name: /Results/i }).first()).toBeVisible({ timeout: 20000 });

    // Navigate back to Practice Library via sidebar
    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Practice/i })).toBeVisible({ timeout: 10000 });

    // Sign out
    await page.locator('button[title="Sign out"]').first().click();
    await page.waitForURL('/', { timeout: 8000 });
  });

  test('3. Admin Journey: Admin Portal, Question Bank & Content Management', async ({ page }) => {
    await loginAsAdmin(page);

    // Question Bank
    await page.getByRole('button', { name: 'Question Bank', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });

    // Daily Challenge
    await page.getByRole('button', { name: 'Daily Challenge', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 10000 });

    // Students
    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Student & User Management' })).toBeVisible({ timeout: 10000 });
  });

  test('4. RBAC & Security Boundary: Regular student cannot access Admin sidebar items', async ({ page }) => {
    await loginAsStudent(page);

    await expect(page.getByRole('button', { name: 'Question Bank' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit Logs' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Students' })).not.toBeVisible();
  });

  test('5. Student Navigation: Practice, Daily Challenge & Leaderboard', async ({ page }) => {
    await loginAsStudent(page);

    // Problem Library
    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });

    // Daily Challenge
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge' })).toBeVisible({ timeout: 10000 });

    // Leaderboard
    await page.getByRole('button', { name: 'Leaderboard' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible({ timeout: 10000 });

    // My Progress
    await page.getByRole('button', { name: 'My Progress' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Learning Progress & Analytics' })).toBeVisible({ timeout: 10000 });
  });
});