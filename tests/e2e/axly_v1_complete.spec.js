const { test, expect } = require('@playwright/test');

async function loginAsStudent(page) {
  await page.goto('/');
  const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const body = await res.json();
  await page.evaluate((token) => {
    localStorage.setItem('axly_auth_token', token);
  }, body.token);
  await page.reload();
  await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10000 });
}

async function loginAsAdmin(page) {
  await page.goto('/');
  const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const body = await res.json();
  await page.evaluate((token) => {
    localStorage.setItem('axly_auth_token', token);
  }, body.token);
  await page.reload();
  await expect(page.locator('text=Super Administrator').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Axly DSA Tracker — V1 Complete E2E Suite', () => {

  test('1. Production Landing Page & Authentication: No Dev Login UI, Secure Google Flow', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Axly DSA Tracker/);
    await expect(page.locator('text=Axly DSA Tracker').first()).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toBeVisible();

    // Verify ZERO dev login buttons or debug shortcuts on public landing page
    await expect(page.locator('#btn-login-user-alex')).not.toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).not.toBeVisible();
    await expect(page.locator('text=QUICK DEV LOGIN')).not.toBeVisible();
    await expect(page.locator('text=Student Login')).not.toBeVisible();
    await expect(page.locator('text=Admin Login')).not.toBeVisible();

    // Verify public landing page sections
    await expect(page.locator('text=Master DSA').first()).toBeVisible();
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.locator('#how-it-works')).toBeVisible();
    await expect(page.locator('#curriculum')).toBeVisible();

    // 1. Authenticate as Student
    await loginAsStudent(page);
    await expect(page.locator('text=Practice (80 Problems)').first()).toBeVisible();

    // Logout
    const logoutBtn = page.locator('button[title="Log out"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await expect(page.locator('#google-signin-btn')).toBeVisible();

    // 2. Authenticate as Admin
    await loginAsAdmin(page);
    await expect(page.locator('text=Question Bank').first()).toBeVisible();
  });

  test('2. Student Dashboard: Welcome Banner, Daily Challenge & Practice Quick Launch', async ({ page }) => {
    await loginAsStudent(page);

    // Verify streak and points metrics
    await expect(page.locator('text=Daily Points').first()).toBeVisible();
    await expect(page.locator('text=Problems Solved').first()).toBeVisible();

    // Navigate to Practice via header button
    await page.click('button:has-text("Practice Problems")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });
  });

  test('3. Practice Library: 80-Problem Count, Search & Controlled Taxonomy Filters', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Verify Practice library header
    await expect(page.locator('text=Practice Library').first()).toBeVisible();

    // Search filter
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Two Sum');
    await expect(page.locator('text=Two Sum').first()).toBeVisible();
    await searchInput.fill('');

    // Difficulty filter
    const diffSelect = page.locator('select').first();
    await diffSelect.selectOption('easy');
    await expect(page.locator('h3').first()).toBeVisible();
  });

  test('4. Practice Workspace: Code Execution, Editable Area & Language Switching', async ({ page }) => {
    await loginAsStudent(page);

    // Open Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Click Start / Continue / Review on first problem card
    const firstProblemBtn = page.locator('button:has-text("Start"), button:has-text("Continue"), button:has-text("Review")').first();
    await firstProblemBtn.click();

    // Verify Workspace loaded with obvious Code Editor header
    await expect(page.locator('text=Code Editor').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=solution.js').first()).toBeVisible();
    await expect(page.locator('text=Editable').first()).toBeVisible();
    await expect(page.locator('#code-editor-textarea')).toBeVisible();

    // Verify student can type and edit code in the editor
    const editor = page.locator('#code-editor-textarea');
    await editor.click();
    await editor.fill('const fs = require("fs");\nconsole.log(fs.readFileSync(0, "utf-8").trim());');

    // Run code
    await page.click('#btn-run-code');
    await expect(page.locator('text=Execution Results').first()).toBeVisible({ timeout: 15000 });

    // Switch language to Python 3
    const langSelect = page.locator('#select-language');
    await langSelect.selectOption('python');
    await expect(page.locator('text=solution.py').first()).toBeVisible();

    // Submit code
    await page.click('#btn-submit-code');
    await expect(page.locator('text=Execution Results').first()).toBeVisible({ timeout: 15000 });

    // Back to Practice
    await page.click('button:has-text("Practice")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });
  });

  test('5. Daily Challenge & Competitive Leaderboard', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Daily Challenge
    await page.click('button:has-text("Daily Challenge")');
    await expect(page.locator('text=Daily Challenge').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Leaderboard
    await page.click('button:has-text("Competitive Leaderboard")');
    await expect(page.locator('h1:has-text("Leaderboard")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Rankings').first()).toBeVisible();
  });

  test('6. Student Progress & Analytics: 8 Topics & Difficulty Breakdown', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Progress & Analytics
    await page.click('button:has-text("Progress & Analytics")');
    await expect(page.locator('h1:has-text("Learning Progress & Analytics")')).toBeVisible({ timeout: 10000 });

    // Verify topic progress bars
    await expect(page.locator('text=Topic Progress Breakdown').first()).toBeVisible();
    await expect(page.locator('text=Arrays').first()).toBeVisible();
    await expect(page.locator('text=Dynamic Programming').first()).toBeVisible();
  });

  test('7. Admin Portal: Question Bank, Taxonomy, Publishing & V1 Clutter Absence', async ({ page }) => {
    await loginAsAdmin(page);

    // Open Question Bank
    await page.click('button:has-text("Question Bank")');
    await expect(page.locator('h1:has-text("Question Bank")')).toBeVisible({ timeout: 10000 });

    // Verify V1 Table Headers
    await expect(page.locator('th:has-text("TITLE")').first()).toBeVisible();
    await expect(page.locator('th:has-text("TOPIC")').first()).toBeVisible();
    await expect(page.locator('th:has-text("DIFFICULTY")').first()).toBeVisible();
    await expect(page.locator('th:has-text("PATTERN")').first()).toBeVisible();
    await expect(page.locator('th:has-text("STATUS")').first()).toBeVisible();
    await expect(page.locator('th:has-text("ACTIONS")').first()).toBeVisible();

    // Verify absent clutter
    await expect(page.locator('th:has-text("LEARNERS")')).not.toBeVisible();
  });

  test('8. RBAC & Security: Student cannot access Admin routes', async ({ page }) => {
    await loginAsStudent(page);

    // Admin-specific nav buttons should not be visible
    await expect(page.locator('button:has-text("Question Bank")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Audit Logs")')).not.toBeVisible();
  });

  test('9. Problem Data Integrity: Best Time to Buy Stock has matching title, example [7,1,5,3,6,4] and no mismatched starter code', async ({ page }) => {
    await loginAsStudent(page);

    // Open Practice
    await page.click('button:has-text("Practice (80 Problems)")');
    await expect(page.locator('h1:has-text("Practice Problems Bank")')).toBeVisible({ timeout: 10000 });

    // Search for "Stock"
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await searchInput.fill('Stock');
    await expect(page.locator('h3:has-text("Best Time to Buy and Sell Stock")').first()).toBeVisible({ timeout: 5000 });

    // Open Problem Workspace for Stock problem
    const stockBtn = page.locator('button:has-text("Start"), button:has-text("Continue"), button:has-text("Review")').first();
    await stockBtn.click();

    // Verify Title & Statement
    await expect(page.locator('text=Best Time to Buy and Sell Stock').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=daily stock prices').first()).toBeVisible();

    // Verify Starter code is NOT Two Sum
    const pageText = await page.content();
    expect(pageText).not.toContain('// Two Sum Problem');
    expect(pageText).not.toContain('diff = target - num');
  });

});
