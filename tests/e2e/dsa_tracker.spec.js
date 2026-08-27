const { test, expect } = require('@playwright/test');

test.describe('Axly DSA Tracker — Full Comprehensive E2E Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Authentication Flow: Brand Login, Google OAuth and Demo Users', async ({ page }) => {
    await expect(page).toHaveTitle(/Axly DSA Tracker/);
    await expect(page.locator('text=Axly DSA Tracker').first()).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toBeVisible();
    await expect(page.locator('#btn-login-user-alex')).toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).toBeVisible();

    // Verify version / revision strings are NOT present
    const content = await page.content();
    expect(content).not.toMatch(/v1\.0/i);
    expect(content).not.toMatch(/rev\s*\d/i);
  });

  test('2. Student Journey: Dashboard, In-Platform IDE, Run Code & Test Cases', async ({ page }) => {
    // Login as Alex Mercer
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge').first()).toHaveText(/user/i);

    // Verify Dashboard Cards
    await expect(page.locator('text=Welcome back, Alex Mercer')).toBeVisible();

    // Open In-Platform Problem IDE (Solve in IDE)
    const solveBtn = page.locator('button:has-text("Solve in IDE"), button:has-text("Solve Problem"), button:has-text("Solve")').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();
    await expect(page.locator('text=Problem Statement')).toBeVisible();
    await expect(page.locator('button:has-text("Run Code")')).toBeVisible();
    await expect(page.locator('button:has-text("Submit Solution")')).toBeVisible();

    // Run code against test cases
    await page.click('button:has-text("Run Code")');
    await expect(page.locator('text=Execution Results')).toBeVisible();

    // Back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await expect(page.locator('text=Welcome back, Alex Mercer')).toBeVisible();

    // Sign out
    await page.click('button:has-text("Log out")');
    await expect(page.locator('#google-signin-btn')).toBeVisible();
  });

  test('3. Dual Submission Flow: Submit Solution via GitHub Repository Link', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge').first()).toHaveText(/user/i);

    const solveBtn = page.locator('button:has-text("Solve in IDE"), button:has-text("Solve Problem"), button:has-text("Solve")').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();

    // Switch to GitHub Link submission
    await page.click('button:has-text("GitHub Repository Link")');
    await expect(page.locator('text=Submit Solution via GitHub')).toBeVisible();

    // Enter GitHub repository URL
    await page.fill('input[type="url"]', 'https://github.com/alexmercer/dsa-repo/blob/main/two_sum.py');
    await page.click('button:has-text("Submit Repository Link")');

    // Verify success notification
    await expect(page.locator('text=GitHub submission received')).toBeVisible();
  });

  test('4. Admin Journey: Admin Portal, Manage Challenges, Cohorts & Student Directory', async ({ page }) => {
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('#user-role-badge').first()).toHaveText(/admin/i);

    // Switch to Admin Portal
    await page.click('#tab-admin-portal');
    await expect(page.locator('text=Platform Admin & Mentor Console')).toBeVisible();

    // Navigate to Cohorts
    await page.click('button:has-text("Cohorts & Batches")');
    await expect(page.locator('h1:has-text("Student Cohort Management")')).toBeVisible();

    // Navigate to Student Directory
    await page.click('button:has-text("Student Directory")');
    await expect(page.locator('h1:has-text("User Management & Cohort Roster")')).toBeVisible();

    // Navigate to Reviews
    await page.click('button:has-text("Code & GitHub Reviews")');
    await expect(page.locator('h1:has-text("Student Submission Reviews")')).toBeVisible();
  });

  test('5. RBAC & Security Boundary: Regular user cannot access Admin Portal', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge').first()).toHaveText(/user/i);
    // Tab for admin portal should not exist
    await expect(page.locator('#tab-admin-portal')).not.toBeVisible();
    await expect(page.locator('button:has-text("Admin Console")')).not.toBeVisible();
  });

  test('6. Student Navigation: My Tasks, Available Challenges & Leaderboard', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge').first()).toHaveText(/user/i);

    // Navigate to Available Challenges
    await page.click('button:has-text("Available Challenges")');
    await expect(page.locator('h1:has-text("Available Coding Challenges")')).toBeVisible();

    // Navigate to My Tasks
    await page.click('button:has-text("My Tasks")');
    await expect(page.locator('h1:has-text("My Tasks & Assignments")')).toBeVisible();

    // Navigate to Leaderboard
    await page.click('button:has-text("Leaderboard")');
    await expect(page.locator('h1:has-text("Platform Hall of Fame & Leaderboard")')).toBeVisible();

    // Navigate to Profile
    await page.click('button:has-text("My Profile")');
    await expect(page.locator('text=Earned Achievements & Badges')).toBeVisible();
  });
});
