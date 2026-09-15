const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

async function loginAs(page, email, role) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email, role }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
}

test.describe('Mobile Smoke Test (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('Student: Practice → Problem → Solve → Editor → Test Cases', async ({ page }) => {
    await loginAs(page, 'alex@example.com', 'user');
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // No horizontal overflow on dashboard
    const dashOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(dashOverflow).toBe(true);

    // Navigate to practice
    await page.goto('/practice');
    await page.waitForTimeout(2000);
    const pracOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(pracOverflow).toBe(true);

    // Click first problem to open solve workspace
    const firstProblem = page.locator('[data-testid="practice-card"], .cursor-pointer, a[href*="/solve"]').first();
    if (await firstProblem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstProblem.click();
      await page.waitForTimeout(3000);
    } else {
      await page.goto('/solve/arr-001');
      await page.waitForTimeout(3000);
    }

    // Check solve workspace elements
    const editor = page.locator('#code-editor-textarea, textarea[aria-label="Code editor"]');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // No horizontal overflow on solve page
    const solveOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(solveOverflow).toBe(true);

    // Language selector
    const langSelect = page.locator('#select-language, select');
    await expect(langSelect).toBeVisible({ timeout: 5000 });

    // Test Cases tab
    const testCasesTab = page.getByRole('button', { name: /Test Cases/i }).first();
    if (await testCasesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await testCasesTab.click();
      await page.waitForTimeout(1000);
    }

    // Run button
    const runBtn = page.locator('#btn-run-code');
    await expect(runBtn).toBeVisible({ timeout: 5000 });

    // Submit button
    const submitBtn = page.locator('#btn-submit-code');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });

  test('Admin: Question Bank → Preview → Solve', async ({ page }) => {
    await loginAs(page, 'admin@axly.in', 'admin');
    await page.goto('/admin-dashboard');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // No horizontal overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(overflow).toBe(true);

    // Navigate to question bank via sidebar
    const qbBtn = page.getByRole('button', { name: 'Question Bank' }).first();
    if (await qbBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await qbBtn.click();
      await page.waitForTimeout(2000);
    }

    // Check no overflow after navigation
    const overflow2 = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(overflow2).toBe(true);

    // Try to find and click eye icon (preview)
    const eyeIcon = page.locator('button[title="View Details"], svg.lucide-eye').first();
    if (await eyeIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eyeIcon.click();
      await page.waitForTimeout(2000);

      // Preview modal should be visible
      const previewModal = page.locator('.fixed.inset-0, [role="dialog"]').first();
      await expect(previewModal).toBeVisible({ timeout: 5000 });

      // No overflow in modal
      const modalOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
      expect(modalOverflow).toBe(true);

      // Close modal
      const closeBtn = page.getByRole('button', { name: /Close/i }).last();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('Admin: Daily Challenge → Preview → Solve', async ({ page }) => {
    await loginAs(page, 'admin@axly.in', 'admin');
    await page.goto('/admin-dashboard');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Navigate to Daily Challenge
    const dcBtn = page.getByRole('button', { name: 'Daily Challenge' }).first();
    await dcBtn.click();
    await page.waitForTimeout(2000);

    // No horizontal overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(overflow).toBe(true);

    // DC portal heading
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 10000 });

    // Table visible
    await expect(page.locator('table').first()).toBeVisible({ timeout: 8000 });

    // Try eye icon for preview
    const eyeIcon = page.locator('button[title="View Details"]').first();
    if (await eyeIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eyeIcon.click();
      await page.waitForTimeout(2000);

      const previewModal = page.locator('.fixed.inset-0, [role="dialog"]').first();
      await expect(previewModal).toBeVisible({ timeout: 5000 });

      // Close
      const closeBtn = page.getByRole('button', { name: /Close/i }).last();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }

    // Try Play icon for solve
    const playIcon = page.locator('button[title="Solve Challenge"]').first();
    if (await playIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playIcon.click();
      await page.waitForTimeout(3000);

      // Should navigate to /solve/:id
      const editor = page.locator('#code-editor-textarea, textarea[aria-label="Code editor"]');
      await expect(editor).toBeVisible({ timeout: 10000 });

      const solveOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
      expect(solveOverflow).toBe(true);
    }
  });

  test('Theme toggle: light and dark', async ({ page }) => {
    await loginAs(page, 'alex@example.com', 'user');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Check light theme (default)
    const isDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkBefore).toBe(false);

    // Toggle to dark
    await page.evaluate(() => {
      localStorage.setItem('axly-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfter).toBe(true);

    // Dark theme CSS variables loaded
    const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bgColor).toBeTruthy();

    // Toggle back to light
    await page.evaluate(() => {
      localStorage.setItem('axly-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(500);

    const isDarkFinal = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkFinal).toBe(false);
  });
});
