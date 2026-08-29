const { test, expect } = require('@playwright/test');

test.describe('Axly DSA Tracker — Core End-to-End Specs', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Authentication Flow: Brand Login and One-Click Demo Users', async ({ page }) => {
    await expect(page).toHaveTitle(/Axly DSA Tracker/);
    await expect(page.locator('text=Axly DSA Tracker').first()).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toBeVisible();
    await expect(page.locator('#btn-login-user-alex')).toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).toBeVisible();
  });

  test('2. Student Journey: Dashboard, In-Platform IDE, Run Code & Test Cases', async ({ page }) => {
    // Login as Alex Mercer
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Open Practice Bank
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Open In-Platform Problem IDE
    const solveBtn = page.locator('button:has-text("Start"), button:has-text("Continue"), button:has-text("Review")').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();

    // Verify workspace components
    await expect(page.locator('#btn-run-code')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-submit-code')).toBeVisible();

    // Run code against test cases
    await page.click('#btn-run-code');
    await expect(page.locator('text=Execution Results').first()).toBeVisible({ timeout: 15000 });

    // Back to Practice
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Sign out
    const logoutBtn = page.locator('button[title="Log out"]').first();
    await logoutBtn.click();
    await expect(page.locator('#google-signin-btn')).toBeVisible();
  });

  test('3. Admin Journey: Admin Portal, Question Bank & Content Management', async ({ page }) => {
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('text=Super Administrator').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Question Bank
    await page.click('button:has-text("Question Bank")');
    await expect(page.locator('h1:has-text("Question Bank Management")')).toBeVisible({ timeout: 10000 });

    // Navigate to Daily Challenge Admin
    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge Management').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Students
    await page.click('button:has-text("Students")');
    await expect(page.locator('text=Student').first()).toBeVisible({ timeout: 10000 });
  });

  test('4. RBAC & Security Boundary: Regular student cannot access Admin Question Bank', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Question Bank and Admin actions should not exist for regular user
    await expect(page.locator('button:has-text("Question Bank")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).not.toBeVisible();
  });

  test('5. Student Navigation: Practice, Daily Challenge & Leaderboard', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Navigate to Daily Challenge
    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Leaderboard
    await page.click('button:has-text("Competitive Leaderboard")');
    await expect(page.locator('h1:has-text("Leaderboard")').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Progress & Analytics
    await page.click('button:has-text("Progress & Analytics")');
    await expect(page.locator('h1:has-text("Learning Progress & Analytics")')).toBeVisible({ timeout: 10000 });
  });
});
