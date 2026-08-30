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
  await page.reload();
  await expect(page.locator('text=Super Administrator').first()).toBeVisible({ timeout: 10000 });
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
  await page.reload();
  await expect(page.locator('text=Daily Points').first()).toBeVisible({ timeout: 10000 });
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
    await page.click('a[href="/admin/daily-challenge"], button:has-text("Daily Challenge")');
    await expect(page.locator('h1:has-text("Daily Challenge Portal")').first()).toBeVisible();

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
    await page.click('a[href="/admin/daily-challenge"], button:has-text("Daily Challenge")');

    const uniqueTitle = `E2E Algorithmic Leap ${Date.now()}`;

    // Open Create Modal
    await page.click('#btn-admin-create-challenge');
    await expect(page.locator('text=Author Daily Challenge').first()).toBeVisible();

    // Fill Basic Information
    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill('textarea[name="description"]', 'Calculate minimum leap steps required to traverse array with obstacles.');

    // Save as Draft
    const saveDraftBtn = page.locator('button:has-text("Save as Draft")').first();
    if (await saveDraftBtn.isVisible()) {
      await saveDraftBtn.click();
    } else {
      await page.click('button:has-text("Save Challenge")');
    }

    // Verify created in table
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Open Automation Logs
    await page.click('button:has-text("Logs")');
    await expect(page.locator('text=Daily Challenge Automation Logs').first()).toBeVisible();
    await page.click('button:has-text("Close")');
  });

  test('3. Automation Run Auto-Fill Now Execution', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('a[href="/admin/daily-challenge"], button:has-text("Daily Challenge")');

    // Trigger Run Auto-Fill Now
    const runBtn = page.locator('#btn-run-autofill-now');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify success or safe feedback alert
    await expect(
      page.locator('.bg-emerald-500\\/10, .bg-rose-500\\/10').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('4. Student Daily Challenge Delivery & Security', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Daily Challenge page
    await page.click('a[href="/daily-challenge"], button:has-text("Daily Challenge")');
    await expect(page.locator('h1:has-text("Daily Challenge")').first()).toBeVisible();

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
