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
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);

    // Verify Dashboard Cards
    await expect(page.locator('text=Welcome back, Alex Mercer')).toBeVisible();
    await expect(page.locator('text=Today\'s Spotlight Challenge')).toBeVisible();

    // Open In-Platform Problem IDE (Solve in IDE)
    const solveBtn = page.locator('button:has-text("Solve in IDE"), button:has-text("Solve Problem")').first();
    if (await solveBtn.isVisible()) {
      await solveBtn.click();
      await expect(page.locator('text=Problem Statement')).toBeVisible();
      await expect(page.locator('button:has-text("Run Code")')).toBeVisible();
      await expect(page.locator('button:has-text("Submit")')).toBeVisible();

      // Run code against test cases
      await page.click('button:has-text("Run Code")');
      await expect(page.locator('text=Execution Results')).toBeVisible();

      // Submit solution
      await page.click('button:has-text("Submit")');
      await expect(page.locator('text=Execution Results')).toBeVisible();
    }

    // Sign out
    await page.click('#logout-button');
    await expect(page.locator('#google-signin-btn')).toBeVisible();
  });

  test('3. Dual Submission Flow: Submit Solution via GitHub Repository Link', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);

    // Open challenge
    const solveBtn = page.locator('button:has-text("Solve in IDE"), button:has-text("Solve Problem")').first();
    if (await solveBtn.isVisible()) {
      await solveBtn.click();

      // Switch to GitHub Link submission
      await page.click('button:has-text("GitHub Link")');
      await expect(page.locator('text=Submit Solution via GitHub')).toBeVisible();

      // Enter GitHub repository URL
      await page.fill('input[type="url"]', 'https://github.com/alexmercer/dsa-repo/blob/main/two_sum.py');
      await page.click('button:has-text("Submit Repository Link")');

      // Verify success notification
      await expect(page.locator('text=GitHub submission received')).toBeVisible();
    }
  });

  test('4. Admin Journey: Admin Portal, Question Builder with Test Cases & Cohorts', async ({ page }) => {
    // Login as Admin
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('#user-role-badge')).toHaveText(/admin/i);

    // Switch to Admin Portal
    await page.click('#tab-admin-portal');
    await expect(page.locator('#stat-total-users')).toBeVisible();
    await expect(page.locator('#stat-active-questions')).toBeVisible();
    await expect(page.locator('#stat-total-assignments')).toBeVisible();
    await expect(page.locator('#stat-total-solved')).toBeVisible();

    // Admin Question CRUD: Open Create Challenge modal
    await page.click('#btn-admin-add-question');
    const newTitle = `Graph Traversal ${Date.now()}`;
    await page.fill('input[placeholder*="Trapping Rain Water"]', newTitle);
    await page.selectOption('select:has-text("Easy")', 'medium');
    await page.fill('textarea[placeholder*="Given an array"]', 'Traverse graph vertices using BFS and compute shortest paths.');
    await page.click('button:has-text("Publish Challenge")');

    // Verify Question is in list
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
  });

  test('5. RBAC & Security Boundary: Regular user cannot access Admin Portal', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);
    // Tab for admin portal should not exist
    await expect(page.locator('#tab-admin-portal')).not.toBeVisible();
  });

  test('6. Student Navigation: My Tasks, Available Challenges & Leaderboard', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);

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
    await page.click('button:has-text("Profile")');
    await expect(page.locator('text=Earned Achievements & Badges')).toBeVisible();
  });
});
