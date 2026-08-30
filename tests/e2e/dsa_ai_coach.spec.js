const { test, expect } = require('@playwright/test');

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

test.describe('DSA AI Coach — Input Clearing, Chat Stream & State Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('1. Submitting a question immediately clears input, displays user message, and appends AI response', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    // 1. Navigate to DSA AI Coach from sidebar
    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    // 2. Locate the Ask input & button
    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask about this problem"]');
    const askBtn = page.locator('#btn-dsa-ai-ask, button:has-text("Ask")').first();

    await expect(input).toBeVisible();
    await expect(askBtn).toBeVisible();

    // 3. Type "bfs"
    await input.fill('bfs');
    await expect(input).toHaveValue('bfs');

    // 4. Click Ask
    await askBtn.click();

    // 5. CRITICAL REQUIREMENT: Verify input is IMMEDIATELY cleared
    await expect(input).toHaveValue('');

    // 6. Verify "bfs" appears as a USER message in the conversation
    await expect(page.locator('.text-xs:has-text("bfs")').first()).toBeVisible({ timeout: 10000 });

    // 7. Verify AI response appears
    await expect(page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' }).first()).toBeVisible({ timeout: 25000 });

    // 8. CRITICAL REQUIREMENT: Verify input REMAINS empty after response
    await expect(input).toHaveValue('');

    // 9. Type second question: "explain bfs"
    await input.fill('explain bfs');
    await expect(input).toHaveValue('explain bfs');

    // 10. Click Ask
    await askBtn.click();

    // 11. Verify input is again IMMEDIATELY empty
    await expect(input).toHaveValue('');

    // 12. Verify both user messages remain visible in conversation history
    await expect(page.locator('.text-xs:has-text("bfs")').first()).toBeVisible();
    await expect(page.locator('.text-xs:has-text("explain bfs")').first()).toBeVisible();

    // 13. Verify second AI response also appears
    const aiResponses = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' });
    await expect(aiResponses).toHaveCount(2, { timeout: 25000 });

    // 14. Verify input STILL has value ''
    await expect(input).toHaveValue('');
  });

  test('2. Submitting via Enter key immediately clears input', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask about this problem"]');
    await input.fill('two pointers technique');
    await expect(input).toHaveValue('two pointers technique');

    // Press Enter
    await input.press('Enter');

    // Verify input immediately cleared
    await expect(input).toHaveValue('');

    // Verify message in chat
    await expect(page.locator('.text-xs:has-text("two pointers technique")').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Quick Actions work seamlessly without corrupting input field', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask about this problem"]');
    await expect(input).toHaveValue('');

    // Click Hint quick action
    const hintBtn = page.locator('#btn-action-hint, button:has-text("Hint")').first();
    await hintBtn.click();

    // Verify input remains completely empty
    await expect(input).toHaveValue('');

    // Verify AI response arrives
    await expect(page.locator('text=Hint #1').first()).toBeVisible({ timeout: 25000 });
    await expect(input).toHaveValue('');
  });

});
