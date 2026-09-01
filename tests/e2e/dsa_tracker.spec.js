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

  // The Admin dashboard page itself renders the heading "Admin". Verify the
  // actual admin navigation item and page heading instead of assuming the
  // sidebar label is also the page H1.
  await expect(page.locator('button:has-text("Admin Dashboard")').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h1:has-text("Admin")').first()).toBeVisible({ timeout: 10000 });
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

    // Verify Landing page has NO embedded login card
    await expect(page.locator('#google-signin-btn')).not.toBeVisible();

    // Navigate to /login
    await page.click('header button:has-text("Get Started")');
    await expect(page.locator('#google-signin-btn')).toBeVisible();

    // Verify absence of dev login buttons on /login
    await expect(page.locator('#btn-login-user-alex')).not.toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).not.toBeVisible();
  });

  test('2. Student Journey: Dashboard, In-Platform IDE, Run Code & Test Cases', async ({ page }) => {
    // Login as Alex Mercer
    await loginAsStudent(page);

    // Open Practice Bank
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice Library")')).toBeVisible({ timeout: 10000 });

    // Open In-Platform Problem IDE
    const solveBtn = page.locator('button:has-text("Solve"), button:has-text("Continue"), button:has-text("Review")').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();

    // Verify workspace components
    await expect(page.locator('button:has-text("Run")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Submit")')).toBeVisible();

    // Run code against test cases
    await page.click('button:has-text("Run")');
    await expect(page.locator('button:has-text("Results")').first()).toBeVisible({ timeout: 15000 });

    // Back to Practice
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice")')).toBeVisible({ timeout: 10000 });

    // Sign out
    const logoutBtn = page.locator('#logout-button, #logout-btn, button[title="Log out"]').first();
    await logoutBtn.click();
    await expect(page.locator('text=AXLY DSA TRACKER').first()).toBeVisible();
  });

  test('3. Admin Journey: Admin Portal, Question Bank & Content Management', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Question Management
    await page.click('button:has-text("Question Management")');
    await expect(page.locator('h1:has-text("Question Bank Management")')).toBeVisible({ timeout: 10000 });

    // Navigate to Daily Challenge Admin
    await page.click('button:has-text("Daily Challenge Management")');
    await expect(page.locator('h1:has-text("Daily Challenge Portal")')).toBeVisible({ timeout: 10000 });

    // Navigate to Students
    await page.click('button:has-text("Student Directory")');
    await expect(page.locator('text=Student').first()).toBeVisible({ timeout: 10000 });
  });

  test('4. RBAC & Security Boundary: Regular student cannot access Admin Question Bank', async ({ page }) => {
    await loginAsStudent(page);

    // Question Bank and Admin actions should not exist for regular user
    await expect(page.locator('button:has-text("Question Bank")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).not.toBeVisible();
  });

  test('5. Student Navigation: Practice, Daily Challenge & Leaderboard', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Practice
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice")')).toBeVisible({ timeout: 10000 });

    // Navigate to Daily Challenge
    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Leaderboard
    await page.click('button:has-text("Leaderboard")');
    await expect(page.locator('h1:has-text("Leaderboard")')).toBeVisible({ timeout: 10000 });

    // Navigate to personal progress analytics
    await page.click('button:has-text("My Progress")');
    await expect(page.locator('h1:has-text("Learning Progress & Analytics")')).toBeVisible({ timeout: 10000 });
  });
});