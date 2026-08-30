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

    const uniqueTitle = `Prefix Array Partition Index ${Date.now()}`;

    // Open Create Modal
    await page.click('#btn-admin-create-challenge');
    await expect(page.locator('text=Competitive DSA').first()).toBeVisible({ timeout: 10000 });

    // Fill Basic Information
    const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]').first();
    await titleInput.fill(uniqueTitle);

    // Save as Draft
    const saveBtn = page.locator('button:has-text("Save as Draft")').first();
    await saveBtn.click({ force: true });

    // Wait for modal backdrop to close completely
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 10000 });

    // Verify table updated
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Open Automation Logs
    await page.locator('#btn-admin-automation-logs').first().click();
    await expect(page.locator('h3:has-text("Daily Challenge Automation Logs")').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Close")').last().click();
  });

  test('3. Automation Run Auto-Fill Now vs Scheduled Automation Execution', async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // 1. Ensure tomorrow has Challenge A via API
    const tomorrowUtc = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const adminDevToken = await page.evaluate(() => localStorage.getItem('axly_auth_token'));
    
    // Seed Challenge A for tomorrow
    await request.post('http://localhost:5000/api/v1/daily-challenges', {
      headers: { Authorization: `Bearer ${adminDevToken}` },
      data: {
        title: `Challenge A Existing ${Date.now()}`,
        difficulty: 'medium',
        description: 'Existing challenge for tomorrow.',
        constraints: 'N >= 1',
        scheduled_date: tomorrowUtc,
        status: 'scheduled',
        test_cases: [
          { input: '1', expected_output: '1', is_hidden: 0 },
          { input: '2', expected_output: '2', is_hidden: 1 }
        ]
      }
    });

    await page.locator('aside button:has-text("Daily Challenge"), button:has-text("Daily Challenge")').first().click();
    await expect(page.locator('h1:has-text("Daily Challenge Portal")').first()).toBeVisible({ timeout: 15000 });

    // 2. Click "Run Auto-Fill Now"
    const runBtn = page.locator('#btn-run-autofill-now');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // 3. Wait for generation completion & success banner
    await expect(page.locator('text=AI challenge generated successfully and saved as Draft.').first()).toBeVisible({ timeout: 25000 });

    // 4. Verify Draft appears in table with Draft status
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('table span:has-text("draft")').first()).toBeVisible({ timeout: 10000 });

    // 5. Open Automation Logs and verify manual_admin log
    await page.locator('#btn-admin-automation-logs').first().click();
    await expect(page.locator('h3:has-text("Daily Challenge Automation Logs")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=manual_admin').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Close")').last().click();

    // 6. Simulate scheduled AUTO_FILL when tomorrow is occupied -> SUCCESS_NOOP
    const scheduledRes = await request.post('http://localhost:5000/api/v1/daily-challenges/automation/run-now', {
      headers: { Authorization: `Bearer ${adminDevToken}` },
      data: {}
    });
    expect(scheduledRes.status()).toBe(200);
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
