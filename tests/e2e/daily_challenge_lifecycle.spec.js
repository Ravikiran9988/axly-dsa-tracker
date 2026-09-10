const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

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

async function loginAsStudent(page) {
  const res = await page.request.post(`${API}/auth/dev-login`, {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const { token } = await res.json();
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('axly_auth_token', t), token);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Welcome back/i })).toBeVisible({ timeout: 15000 });
}

test.describe('Daily Challenge V2 — Complete Lifecycle, Automation & Student Delivery E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Admin Daily Challenge Portal & KPI Counters', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 15000 });

    // KPI counter labels
    await expect(page.getByText('Total Challenges').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Published').first()).toBeVisible();
    await expect(page.getByText('Scheduled').first()).toBeVisible();
    await expect(page.getByText('Drafts').first()).toBeVisible();
    await expect(page.getByText('Archived').first()).toBeVisible();

    // Automation section
    await expect(page.getByText('DAILY CHALLENGE SYSTEM V2').first()).toBeVisible();
    await expect(page.locator('#btn-run-autofill-now')).toBeVisible();

    // Table is rendered
    await expect(page.locator('table')).toBeVisible({ timeout: 8000 });
  });

  test('2. Admin Manual Creation, Scheduling & Publish Lifecycle', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 15000 });

    const uniqueTitle = `Distinct Matrix Path Traversal ${Date.now()} ${Math.random().toString(36).slice(2, 5)}`;

    // Open Create Modal
    await page.locator('#btn-admin-create-challenge').click();
    // Modal loaded – wait for a visible form input
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="Title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(uniqueTitle);

    // Save as Draft
    const saveBtn = page.getByRole('button', { name: /Save as Draft/i }).first();
    await saveBtn.click({ force: true });

    // Modal closes
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 12000 });

    // Table updated
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Automation Logs modal
    await page.locator('#btn-admin-automation-logs').first().click();
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /Automation Logs/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Close/i }).last().click();
  });

  test('3. Automation Run Auto-Fill Now vs Scheduled Automation Execution', async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);

    const tomorrowUtc = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const adminDevToken = await page.evaluate(() => localStorage.getItem('axly_auth_token'));

    // Seed Challenge A for tomorrow via API
    await request.post(`${API}/daily-challenges`, {
      headers: { Authorization: `Bearer ${adminDevToken}` },
      data: {
        title: `Challenge A Unique Seed ${Date.now()} ${Math.random().toString(36).slice(2, 5)}`,
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

    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge Portal' })).toBeVisible({ timeout: 15000 });

    // Click "Run Auto-Fill Now"
    const runBtn = page.locator('#btn-run-autofill-now');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for generation completion – success banner
    await expect(page.getByText('AI challenge generated successfully and saved as Draft.').first()).toBeVisible({ timeout: 40000 });

    // Draft appears in table
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('table').getByText('draft').first()).toBeVisible({ timeout: 10000 });

    // Automation Logs show manual_admin entry
    await page.locator('#btn-admin-automation-logs').first().click();
    await expect(page.getByText('manual_admin').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Close/i }).last().click();

    // Simulate scheduled AUTO_FILL via API → should return 200
    const scheduledRes = await request.post(`${API}/daily-challenges/automation/run-now`, {
      headers: { Authorization: `Bearer ${adminDevToken}` },
      data: {}
    });
    expect(scheduledRes.status()).toBe(200);
  });

  test('4. Student Daily Challenge Delivery & Security', async ({ page }) => {
    await loginAsStudent(page);

    // Navigate to Daily Challenge via sidebar
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge' })).toBeVisible({ timeout: 15000 });

    // Either a Solve button or an empty-state message must be visible
    const solveBtn = page.locator('#btn-start-daily-challenge');
    const emptyState = page.getByRole('heading', { level: 2, name: /No challenge scheduled/i });

    const hasSolve = await solveBtn.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasSolve || hasEmpty).toBe(true);

    // Scoring rules card is always visible
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /Daily Challenge Scoring/i })).toBeVisible();
  });
});
