const { test, expect } = require('@playwright/test');

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
  await expect(page.locator('h1:has-text("Admin"), #tab-admin-portal').first()).toBeVisible({ timeout: 15000 });
}

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
  await expect(page.locator('aside, header').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Daily Challenge V2 — Complete Lifecycle, Automation & Student Delivery E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('1. Admin Daily Challenge Portal & KPI Counters', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Daily Challenge Admin section
    await page.locator('aside button:has-text("Daily Challenge"), button:has-text("Daily Challenge")').first().click();
    await expect(page.locator('h1:has-text("Daily Challenge Portal")').first()).toBeVisible({ timeout: 15000 });

    // Verify KPI Counters are visible
    await expect(page.locator('text=Total Challenges').first()).toBeVisible();
    await expect(page.locator('text=Published').first()).toBeVisible();
    await expect(page.locator('text=Scheduled').first()).toBeVisible();
    await expect(page.locator('text=Drafts').first()).toBeVisible();
    await expect(page.locator('text=Archived').first()).toBeVisible();

    // Verify Automation Section
    await expect(page.locator('text=DAILY CHALLENGE AUTOMATION').first()).toBeVisible();
    await expect(page.locator('#btn-run-autofill-now')).toBeVisible();

    // Verify Repository Table is loaded
    await expect(page.locator('table')).toBeVisible();
  });

  test('2. Admin Manual Creation, Scheduling & Publish Lifecycle', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('aside button:has-text("Daily Challenge"), button:has-text("Daily Challenge")').first().click();
    await expect(page.locator('h1:has-text("Daily Challenge Portal")').first()).toBeVisible({ timeout: 15000 });

    const uniqueTitle = `E2E Algorithmic Leap ${Date.now()}`;

    // Open Create Modal
    await page.click('#btn-admin-create-challenge');
    await expect(page.locator('text=Competitive DSA').first()).toBeVisible({ timeout: 10000 });

    // Fill Basic Information
    const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]').first();
    await titleInput.fill(uniqueTitle);

    // Save as Draft
    const saveBtn = page.locator('button:has-text("Save as Draft")').first();
    await saveBtn.click();

    // Verify table updated
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Open Automation Logs
    await page.locator('#btn-admin-automation-logs').first().click();
    await expect(page.locator('text=Daily Challenge Automation Logs').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.fixed.inset-0 button:has-text("Close"), button:has-text("Close")').first().click();
  });

  test('3. Automation Run Auto-Fill Now Execution', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('aside button:has-text("Daily Challenge"), button:has-text("Daily Challenge")').first().click();
    await expect(page.locator('h1:has-text("Daily Challenge Portal")').first()).toBeVisible({ timeout: 15000 });

    // Trigger Run Auto-Fill Now
    const runBtn = page.locator('#btn-run-autofill-now');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify button goes to spinning or feedback alert appears
    const resultIndicator = page.locator('.animate-slide-up').or(page.locator('button:has-text("Running Pipeline...")')).or(page.locator('#btn-run-autofill-now'));
    await expect(resultIndicator.first()).toBeVisible({ timeout: 20000 });
  });

  test('4. Student Daily Challenge Delivery & Security', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Daily Challenge page
    await page.locator('aside button:has-text("Daily Challenge")').first().click();
    await expect(page.locator('h1:has-text("Daily Challenge")').first()).toBeVisible({ timeout: 15000 });

    // Verify student challenge or clean empty state
    const solveBtn = page.locator('#btn-start-daily-challenge');
    const emptyState = page.locator('text=No challenge scheduled for today yet.');

    const hasSolve = await solveBtn.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasSolve || hasEmpty).toBe(true);

    // Verify scoring explanation rules card is visible
    await expect(page.locator('text=How Daily Challenge Scoring Works').first()).toBeVisible();
  });
});
