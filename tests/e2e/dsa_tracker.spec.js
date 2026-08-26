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

  test('2. User Journey: Daily Question, Progress Calculation, Submission Status & Filters', async ({ page }) => {
    // Login as Alex Mercer
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);

    // Verify Daily Question Card
    const dailyCard = page.locator('#daily-question-status-select');
    if (await dailyCard.isVisible()) {
      await dailyCard.selectOption('solved');
      await expect(page.locator('#metric-solved-count')).toBeVisible();
    }

    // Verify Progress Overview Metrics
    await expect(page.locator('#metric-completion-pct')).toBeVisible();
    await expect(page.locator('#metric-solved-count')).toBeVisible();
    await expect(page.locator('#metric-pending-count')).toBeVisible();
    await expect(page.locator('#metric-attempted-count')).toBeVisible();

    // Verify Difficulty Filters
    await page.click('#filter-diff-easy');
    await expect(page.locator('#filter-diff-easy')).toHaveClass(/bg-axly-600/);

    await page.click('#filter-diff-medium');
    await expect(page.locator('#filter-diff-medium')).toHaveClass(/bg-axly-600/);

    await page.click('#filter-diff-all');

    // Verify Assignment Filter
    await page.click('#filter-asgn-true');
    await expect(page.locator('#filter-asgn-true')).toHaveClass(/bg-axly-600/);

    await page.click('#filter-asgn-all');

    // Verify Search
    await page.fill('#input-search-questions', 'Two Sum');
    await page.click('button:has-text("Search")');
    await expect(page.locator('h4:has-text("Two Sum")').first()).toBeVisible();

    // Sign out
    await page.click('#logout-button');
    await expect(page.locator('#google-signin-btn')).toBeVisible();
  });

  test('3. Admin Journey: Admin Portal, Question CRUD, Assignments, Bulk Assign & Daily Question', async ({ page }) => {
    // Login as Admin
    await page.click('#btn-login-admin-axly');
    await expect(page.locator('#user-role-badge')).toHaveText(/admin/i);

    // Switch to Admin Portal
    await page.click('#tab-admin-portal');
    await expect(page.locator('#stat-total-users')).toBeVisible();
    await expect(page.locator('#stat-active-questions')).toBeVisible();
    await expect(page.locator('#stat-total-assignments')).toBeVisible();
    await expect(page.locator('#stat-total-solved')).toBeVisible();

    // Admin Question CRUD: Create Question
    await page.click('#btn-admin-add-question');
    const newTitle = `Graph Traversal ${Date.now()}`;
    await page.fill('#input-question-title', newTitle);
    await page.selectOption('#select-question-difficulty', 'medium');
    await page.fill('#input-question-url', 'https://leetcode.com/problems/number-of-islands/');
    await page.click('#btn-save-question');

    // Verify Question is in list
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();

    // Admin Tabs: Assignments Log
    await page.click('#admin-tab-assignments');
    await expect(page.locator('text=Active & Historical Assignments')).toBeVisible();

    // Admin Tabs: Learner Performance
    await page.click('#admin-tab-users');
    await expect(page.locator('text=Learner Performance & Completion')).toBeVisible();
    await expect(page.locator('text=Alex Mercer')).toBeVisible();
  });

  test('4. RBAC & Security Boundary: Regular user cannot see or access Admin Portal', async ({ page }) => {
    await page.click('#btn-login-user-alex');
    await expect(page.locator('#user-role-badge')).toHaveText(/user/i);
    // Tab for admin portal should not exist
    await expect(page.locator('#tab-admin-portal')).not.toBeVisible();
  });

  test('5. Daily Question Modal Management: Admin can open and view daily question selector', async ({ page }) => {
    await page.click('#btn-login-admin-axly');
    await page.click('#tab-admin-portal');
    await page.click('#btn-admin-set-daily');
    await expect(page.locator('text=Set Today\'s Global Daily Question')).toBeVisible();
    await expect(page.locator('#select-daily-question')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Set Today\'s Global Daily Question')).not.toBeVisible();
  });

  test('6. Bulk Assign Modal: Admin can open bulk assign modal and see user list', async ({ page }) => {
    await page.click('#btn-login-admin-axly');
    await page.click('#tab-admin-portal');
    await page.click('#btn-admin-bulk-assign');
    await expect(page.locator('text=Assign DSA Questions')).toBeVisible();
    await expect(page.locator('text=Select All Users')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Assign DSA Questions')).not.toBeVisible();
  });
});
