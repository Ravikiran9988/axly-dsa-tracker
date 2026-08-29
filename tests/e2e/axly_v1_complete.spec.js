const { test, expect } = require('@playwright/test');

test.describe('Axly DSA Tracker — V1 Complete E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Authentication Flow: Student & Admin Login, Session & Logout', async ({ page }) => {
    await expect(page).toHaveTitle(/Axly DSA Tracker/);
    await expect(page.locator('text=Axly DSA Tracker').first()).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toBeVisible();
    await expect(page.locator('#btn-login-user-alex')).toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).toBeVisible();

    // 1. Student Login
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Practice (80 Problems)').first()).toBeVisible();

    // Logout
    const logoutBtn = page.locator('button[title="Log out"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await expect(page.locator('#google-signin-btn')).toBeVisible();

    // 2. Admin Login
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('text=Super Administrator').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Question Bank').first()).toBeVisible();
  });

  test('2. Student Dashboard: Welcome Banner, Daily Challenge & Practice Quick Launch', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Verify streak and points metrics
    await expect(page.locator('text=Daily Points').first()).toBeVisible();
    await expect(page.locator('text=Problems Solved').first()).toBeVisible();

    // Navigate to Practice via header button
    await page.click('button:has-text("Practice Problems")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });
  });

  test('3. Practice Library: 80-Problem Count, Search & Controlled Taxonomy Filters', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Search for "Two Sum"
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await searchInput.fill('Two Sum');
    await expect(page.locator('h3:has-text("Two Sum")').first()).toBeVisible({ timeout: 5000 });

    // Filter by Difficulty
    await searchInput.fill('');
    const difficultySelect = page.locator('select').first();
    await difficultySelect.selectOption('easy');
    await expect(page.locator('span:has-text("easy")').first()).toBeVisible({ timeout: 5000 });

    // Reset filters
    await page.click('button:has-text("Reset")');
    await expect(page.locator('h3').first()).toBeVisible();
  });

  test('4. Practice Workspace: Code Execution, Submission & 0 Competitive Points Guarantee', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Open Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Click Start / Continue / Review on first problem card
    const firstProblemBtn = page.locator('button:has-text("Start"), button:has-text("Continue"), button:has-text("Review")').first();
    await firstProblemBtn.click();

    // Verify Workspace loaded
    await expect(page.locator('#btn-run-code')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-submit-code')).toBeVisible();

    // Verify Practice shows "Practice · 0 points"
    await expect(page.locator('text=Practice · 0 points').first()).toBeVisible();

    // Run code
    await page.click('#btn-run-code');
    await expect(page.locator('text=Execution Results').first()).toBeVisible({ timeout: 15000 });

    // Submit code
    await page.click('#btn-submit-code');
    await expect(page.locator('text=Execution Results').first()).toBeVisible({ timeout: 15000 });

    // Back to Practice
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });
  });

  test('5. Daily Challenge & Competitive Leaderboard', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Daily Challenge
    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Leaderboard
    await page.click('button:has-text("Competitive Leaderboard")');
    await expect(page.locator('h1:has-text("Leaderboard")').first()).toBeVisible({ timeout: 10000 });
  });

  test('6. Student Progress & Analytics: 8 Topics & Difficulty Breakdown', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Analytics
    await page.click('button:has-text("Progress & Analytics")');
    await expect(page.locator('h1:has-text("Learning Progress & Analytics")')).toBeVisible({ timeout: 10000 });

    // Verify Practice Bank Progress tab (80 Problems)
    await expect(page.locator('text=Practice Bank Progress (80 Problems)').first()).toBeVisible();
    await expect(page.locator('text=Topic Progress Breakdown').first()).toBeVisible();
    await expect(page.locator('text=Difficulty Mastery').first()).toBeVisible();
  });

  test('7. Admin Portal: Question Bank, Taxonomy, Publishing & V1 Clutter Absence', async ({ page }) => {
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('text=Super Administrator').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Question Bank
    await page.click('button:has-text("Question Bank")');
    await expect(page.locator('h1:has-text("Question Bank Management")')).toBeVisible({ timeout: 10000 });

    // Verify clean columns: Title, Topic, Difficulty, Pattern, Status, Actions
    await expect(page.locator('th:has-text("Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Topic")')).toBeVisible();
    await expect(page.locator('th:has-text("Difficulty")')).toBeVisible();
    await expect(page.locator('th:has-text("Pattern")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();

    // Verify removed V1 clutter is ABSENT
    await expect(page.locator('th:has-text("Assigned")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Assign question to individual learners")')).not.toBeVisible();
  });

  test('8. RBAC & Security: Student cannot access Admin routes', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Admin-specific nav buttons should not be visible
    await expect(page.locator('button:has-text("Question Bank")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).not.toBeVisible();
  });

  test('9. Problem Data Integrity: Best Time to Buy Stock has matching title, example [7,1,5,3,6,4] and no mismatched starter code', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });

    // Open Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Search for "Stock"
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await searchInput.fill('Stock');
    await expect(page.locator('h3:has-text("Best Time to Buy and Sell Stock")').first()).toBeVisible({ timeout: 5000 });

    // Open Problem Workspace
    await page.click('button:has-text("Start"), button:has-text("Continue"), button:has-text("Review")');

    // Verify Title & Statement
    await expect(page.locator('h1:has-text("Best Time to Buy and Sell Stock")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=daily stock prices').first()).toBeVisible();

    // Verify Starter code is NOT Two Sum
    const pageText = await page.content();
    expect(pageText).not.toContain('// Two Sum Problem');
    expect(pageText).not.toContain('diff = target - num');
  });

});
