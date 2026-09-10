/**
 * Admin E2E Verification — Local Dev Environment Version
 *
 * The original tests were written against the PRODUCTION URL (dsatracker.axly.in)
 * using a Brave browser session with Google OAuth cookies. That cannot run reliably
 * in CI or on machines without the Brave profile.
 *
 * These tests have been rewritten to run against the local dev server using the
 * dev-login endpoint (disabled in production), matching the current UI structure.
 */
const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

let networkErrors = [];

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

test.describe('Admin E2E Verification & Feature Testing', () => {

  test.beforeEach(async ({ page }) => {
    networkErrors = [];

    // Monitor API errors
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('localhost:5000/api/v1')) {
        const status = response.status();
        if (status >= 500) {
          let body = '';
          try { body = await response.text(); } catch (e) {}
          networkErrors.push({ url, status, body: body.substring(0, 300) });
        }
      }
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterEach(() => {
    if (networkErrors.length > 0) {
      console.error('SERVER ERRORS DETECTED:', networkErrors);
      throw new Error(`Test failed due to server errors: ${JSON.stringify(networkErrors, null, 2)}`);
    }
  });

  test('Should authenticate as Admin and verify Admin access & nav items', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    // Admin dashboard has h1 "Admin"
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();

    // All required admin nav items present
    const navItems = [
      'Dashboard',
      'Question Bank',
      'Daily Challenge',
      'Reviews',
      'Students',
      'Progress',
      'Submissions',
      'Audit Logs',
      'Profile'
    ];
    for (const item of navItems) {
      await expect(page.getByRole('button', { name: item }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Should test all Admin sidebar routes and features', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    // 1. Question Bank
    await page.getByRole('button', { name: 'Question Bank' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible();

    // 2. Daily Challenge
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 10000 });

    // 3. Reviews
    await page.getByRole('button', { name: 'Reviews' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Submission Review Console' })).toBeVisible({ timeout: 10000 });

    // 4. Students
    await page.getByRole('button', { name: 'Students' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Student & User Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible();

    // 5. Progress
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Student Progress & Velocity' })).toBeVisible({ timeout: 10000 });

    // 6. Submissions
    await page.getByRole('button', { name: 'Submissions' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Learner Submissions & Executions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible();

    // 7. Audit Logs
    await page.getByRole('button', { name: 'Audit Logs' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'System & Admin Audit Logs' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('Should perform CRUD on Admin Questions safely', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    // Go to Question Bank
    await page.getByRole('button', { name: 'Question Bank' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });

    // CREATE – open modal via "Add Question" button
    await page.getByRole('button', { name: /Add Question/i }).first().click();

    // Wait for the modal form (rendered via createPortal into body)
    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 10000 });

    const titleInput = modal.locator('input').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    const testTitle = `E2E_TEST_QUESTION_${Date.now()}`;
    await titleInput.fill(testTitle);

    const descArea = modal.locator('textarea').first();
    if (await descArea.count() > 0) {
      await descArea.fill('E2E test description for automated suite.');
    }

    // Click the "Create Challenge" submit button (type="submit" inside the form)
    await modal.getByRole('button', { name: 'Create Challenge' }).click();

    // Modal closes
    await expect(modal).not.toBeVisible({ timeout: 15000 });

    // VERIFY CREATE – reload and find the question in the table
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testTitle).first()).toBeVisible({ timeout: 12000 });

    // EDIT – find row and click edit button
    const row = page.locator(`tr:has-text("${testTitle}")`).first();
    await row.locator('button[title="Edit"]').first().click();

    const editModal = page.locator('.fixed.inset-0').last();
    await expect(editModal).toBeVisible({ timeout: 10000 });

    const editTitleInput = editModal.locator('input').first();
    await expect(editTitleInput).toBeVisible({ timeout: 10000 });
    const updatedTitle = `${testTitle}_UPDATED`;
    await editTitleInput.fill(updatedTitle);

    await editModal.getByRole('button', { name: 'Update Challenge' }).click();
    await expect(editModal).not.toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 12000 });

    // ARCHIVE / DELETE
    const updatedRow = page.locator(`tr:has-text("${updatedTitle}")`).first();
    page.once('dialog', (dialog) => dialog.accept());
    const deleteBtn = updatedRow.locator('button[title="Archive"], button[title="Delete"]').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /Confirm|Yes/i }).last();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      // VERIFY it's no longer visible
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(updatedTitle)).toBeHidden({ timeout: 12000 });
    }
  });


  test('Responsive Layouts: Admin UI is functional on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    // On mobile, sidebar is hidden by default
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible({ timeout: 12000 });

    // Open mobile menu via hamburger (aria-label="Toggle menu")
    const hamburger = page.getByRole('button', { name: /Toggle menu/i }).first();
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
    }

    // After menu opens, Question Bank nav item should be visible
    await expect(page.getByRole('button', { name: 'Question Bank' }).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Question Bank' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Question Bank Management' })).toBeVisible({ timeout: 10000 });
  });
});
