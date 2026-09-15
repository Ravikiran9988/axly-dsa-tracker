const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

/** Inject a dev JWT directly into localStorage – no browser interaction required. */
async function loginAsStudent(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
  await page.goto('/dashboard');
  // Dashboard: heading contains "Welcome back"
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
  // Admin core dashboard renders h1 "Admin"
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible({ timeout: 15000 });
}

test.describe('Axly DSA Tracker — V1 Complete E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('1. Marketing Landing Page & Dedicated /login Flow Separation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Axly DSA Tracker/);

    // Landing page has "Master DSA" h1 (no quick-dev-login shortcuts)
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Master DSA/i }).first()).toBeVisible();
    await expect(page.locator('#btn-login-user-alex')).not.toBeVisible();
    await expect(page.locator('#btn-login-admin-axly')).not.toBeVisible();
    await expect(page.getByText('QUICK DEV LOGIN')).not.toBeVisible();

    // Verify public marketing sections by ID
    await expect(page.locator('#features')).toBeVisible();

    await expect(page.locator('#curriculum')).toBeVisible();
    await expect(page.locator('#how-it-works')).toBeVisible();

    // Navigate to /login via "Get Started" header button
    await page.locator('header').getByRole('button', { name: /Get Started/i }).click();
    await expect(page.locator('#google-signin-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();

    // "Back to Home" returns to landing
    await page.getByRole('button', { name: /Back to Home/i }).click();
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Master DSA/i }).first()).toBeVisible({ timeout: 8000 });

    // Authenticate as Student and verify student UI
    await loginAsStudent(page);
    // Sidebar should have "Problem Library" nav item
    await expect(page.getByRole('button', { name: 'Problem Library' })).toBeVisible();

    // Logout via sidebar sign-out button (title="Sign out")
    const logoutBtn = page.locator('button[title="Sign out"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    // After logout, landing page loads
    await expect(page.locator('/')).toBeDefined(); // navigation happened
    await page.waitForURL('/', { timeout: 8000 });

    // Authenticate as Admin and verify admin UI
    await loginAsAdmin(page);
    await expect(page.getByRole('button', { name: 'Question Bank' })).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('2. User Registration & OTP Email Verification Flow', async ({ page }) => {
    await page.goto('/signup');
    // Registration form shows "Create account"
    await expect(page.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible({ timeout: 8000 });

    const testEmail = `student.otp.${Date.now()}@axly.in`;

    // Fill registration form using stable IDs
    await page.locator('#signup-name-input').fill('Kavya Nair');
    await page.locator('#signup-email-input').fill(testEmail);
    await page.locator('#signup-password-input').fill('Password123!');
    const confirmInput = page.locator('#signup-confirm-password-input');
    if (await confirmInput.count() > 0) {
      await confirmInput.fill('Password123!');
    }

    // Submit → OTP step
    const submitBtn = page.locator('#btn-submit-signup, button[type="submit"]').first();
    await submitBtn.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Enter your OTP' })).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#otp-input')).toBeVisible();

    // Test incorrect OTP → error message
    await page.locator('#otp-input').fill('000000');
    await page.locator('#btn-verify-otp').click();
    await expect(page.locator('#otp-error-msg')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Invalid verification code')).toBeVisible();

    // Resend OTP button exists
    await expect(page.locator('#btn-resend-otp')).toBeVisible();

    // "Back to Registration" goes back to form
    await page.getByRole('button', { name: /Back to Registration/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible({ timeout: 5000 });

    // Navigate to Login → Forgot Password flow
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: /Forgot password/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Forgot your password/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible();

    // Submit forgot password → success state
    await page.locator('input[type="email"]').fill('learner@example.com');
    await page.getByRole('button', { name: /Send Reset Link/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Check your inbox/i })).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('3. Student Dashboard: Welcome Banner, Metrics & Practice Quick Launch', async ({ page }) => {
    await loginAsStudent(page);

    // Welcome heading
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Welcome back/i })).toBeVisible();

    // Key metric labels (from UserDashboard grid)
    await expect(page.getByText('Problems Solved').first()).toBeVisible();
    await expect(page.getByText('Total Score').first()).toBeVisible();

    // Quick-launch button to Practice Library on dashboard
    await page.getByRole('button', { name: /Practice Library/i }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('4. Practice Library: Search & Difficulty Filters', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate via sidebar "Problem Library"
    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });

    // Search filter
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Two Sum');
    await expect(page.getByText('Two Sum').first()).toBeVisible({ timeout: 5000 });
    await searchInput.fill('');

    // Difficulty filter – first select element
    const diffSelect = page.locator('select').first();
    await diffSelect.selectOption('easy');
    // At least one problem card appears
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('5. Practice Workspace: Code Execution, Editable Area & Language Switching', async ({ page }) => {
    await loginAsStudent(page);

    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });

    // Open first available problem
    const firstProblemBtn = page.getByRole('button', { name: /Solve|Continue|Review/i }).first();
    await firstProblemBtn.click();

    // Workspace loaded
    await expect(page.getByText('solution.js').first()).toBeVisible({ timeout: 12000 });
    const editor = page.locator('#code-editor-textarea');
    await expect(editor).toBeVisible();

    // Student can edit code
    await editor.click();
    await editor.fill('console.log("hello from test");');

    // Run code → Results tab appears
    await page.getByRole('button', { name: /Run/i }).click();
    await expect(page.getByRole('button', { name: /Results/i }).first()).toBeVisible({ timeout: 20000 });

    // Switch to Python
    const langSelect = page.locator('select').first();
    await langSelect.selectOption('python');
    await expect(page.getByText('solution.py').first()).toBeVisible({ timeout: 5000 });

    // Submit solution
    await page.getByRole('button', { name: /Submit/i }).click();
    await expect(page.getByRole('button', { name: /Results/i }).first()).toBeVisible({ timeout: 20000 });

    // Back to library
    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('6. Daily Challenge & Competitive Leaderboard', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Daily Challenge
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge' })).toBeVisible({ timeout: 12000 });

    // Navigate to Leaderboard
    await page.getByRole('button', { name: 'Leaderboard' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('7. Student Progress & Analytics: Topic Breakdown', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate via "My Progress" sidebar
    await page.getByRole('button', { name: 'My Progress' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Learning Progress & Analytics' })).toBeVisible({ timeout: 12000 });

    // Arrays topic should be visible somewhere
    await expect(page.getByText('Arrays').first()).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('8. Admin Portal: Question Bank exists & has no stale V1 clutter', async ({ page }) => {
    await loginAsAdmin(page);

    // Open Question Bank
    await page.getByRole('button', { name: 'Question Bank' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });

    // Table is rendered
    await expect(page.locator('table')).toBeVisible({ timeout: 8000 });

    // Verify V1 stale "LEARNERS" header is absent
    await expect(page.locator('th:has-text("LEARNERS")')).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('9. RBAC & Security: Student cannot see Admin sidebar items', async ({ page }) => {
    await loginAsStudent(page);

    // Admin-only nav items must not be present for a student
    await expect(page.getByRole('button', { name: 'Question Bank' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit Logs' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Students' })).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('10. Problem Data Integrity: Best Time to Buy Stock – title, example, no Two Sum starter code', async ({ page }) => {
    await loginAsStudent(page);

    await page.getByRole('button', { name: 'Problem Library' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Practice Library' })).toBeVisible({ timeout: 10000 });

    // Search for "Stock"
    const searchInput = page.locator('input[placeholder*="Search problems"]');
    await searchInput.fill('Stock');
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /Best Time to Buy and Sell Stock/i }).first()).toBeVisible({ timeout: 8000 });

    // Open the problem
    await page.getByRole('button', { name: /Solve|Continue|Review/i }).first().click();

    // Title is visible in workspace
    await expect(page.getByText(/Best Time to Buy and Sell Stock/i).first()).toBeVisible({ timeout: 12000 });
    await expect(page.getByText(/daily stock prices/i).first()).toBeVisible();

    // Starter code must NOT contain Two Sum residue
    const pageText = await page.content();
    expect(pageText).not.toContain('// Two Sum Problem');
    expect(pageText).not.toContain('diff = target - num');
  });

});
