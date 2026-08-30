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

test.describe('DSA AI Coach — Ask First → Choose Help Type UX Flow & E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('1. Ask First → Contextual Help Selection Flow with Immediate Input Clearing', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    // 1. Open DSA AI Coach
    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    // 2. Verify clean empty state with Starter Suggestions
    await expect(page.locator('text=Ask a question, paste code, or describe your DSA problem.').first()).toBeVisible();
    await expect(page.locator('text=Starter Suggestions').first()).toBeVisible();

    // 3. Locate input and submit button
    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask a DSA question"]');
    const askBtn = page.locator('#btn-dsa-ai-ask, button:has-text("Ask")').first();

    await expect(input).toBeVisible();
    await expect(askBtn).toBeVisible();

    // 4. Type question: "How can I solve Two Sum?"
    await input.fill('How can I solve Two Sum?');
    await expect(input).toHaveValue('How can I solve Two Sum?');

    // 5. Click Ask
    await askBtn.click();

    // 6. CRITICAL: Verify input is IMMEDIATELY cleared
    await expect(input).toHaveValue('');

    // 7. Verify user message appears in chat
    await expect(page.locator('.text-xs:has-text("How can I solve Two Sum?")').first()).toBeVisible({ timeout: 10000 });

    // 8. Verify contextual help picker appears: "What do you need help with?"
    await expect(page.locator('text=What do you need help with?').first()).toBeVisible({ timeout: 10000 });

    // 9. Verify action buttons appear (Hint, Approach, Explain, etc.)
    const hintBtn = page.locator('#btn-action-hint, button:has-text("Hint")').first();
    const approachBtn = page.locator('#btn-action-approach, button:has-text("Approach")').first();
    const explainBtn = page.locator('#btn-action-explain, button:has-text("Explain")').first();

    await expect(hintBtn).toBeVisible();
    await expect(approachBtn).toBeVisible();
    await expect(explainBtn).toBeVisible();

    // 10. Click Hint action
    await hintBtn.click();

    // 11. Verify selected action is marked
    await expect(page.locator('text=Selected:').first()).toBeVisible({ timeout: 10000 });

    // 12. Verify AI Coach responds
    await expect(page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' }).first()).toBeVisible({ timeout: 25000 });

    // 13. Verify input REMAINS empty
    await expect(input).toHaveValue('');

    // 14. Ask follow-up question: "Why is hash map lookup O(1)?"
    await input.fill('Why is hash map lookup O(1)?');
    await expect(input).toHaveValue('Why is hash map lookup O(1)?');

    await askBtn.click();

    // 15. Verify input cleared immediately again
    await expect(input).toHaveValue('');

    // 16. Verify second user message appears
    await expect(page.locator('.text-xs:has-text("Why is hash map lookup O(1)?")').first()).toBeVisible({ timeout: 10000 });

    // 17. Verify new contextual help picker for the second question
    const secondExplainBtn = page.locator('#btn-action-explain, button:has-text("Explain")').last();
    await secondExplainBtn.click();

    // 18. Verify both user messages and both AI responses remain in conversation
    await expect(page.locator('.text-xs:has-text("How can I solve Two Sum?")').first()).toBeVisible();
    await expect(page.locator('.text-xs:has-text("Why is hash map lookup O(1)?")').first()).toBeVisible();

    const aiResponses = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' });
    await expect(aiResponses).toHaveCount(2, { timeout: 25000 });

    // 19. Verify input is STILL empty
    await expect(input).toHaveValue('');
  });

  test('2. Submitting via Enter key triggers Ask First flow and immediately clears input', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask a DSA question"]');
    await input.fill('two pointers technique');
    await expect(input).toHaveValue('two pointers technique');

    // Press Enter
    await input.press('Enter');

    // Verify input immediately cleared
    await expect(input).toHaveValue('');

    // Verify user message in chat
    await expect(page.locator('.text-xs:has-text("two pointers technique")').first()).toBeVisible({ timeout: 10000 });

    // Verify contextual help picker
    await expect(page.locator('text=What do you need help with?').first()).toBeVisible({ timeout: 10000 });

    // Click Approach
    const approachBtn = page.locator('#btn-action-approach, button:has-text("Approach")').first();
    await approachBtn.click();

    // Verify AI response arrives
    await expect(page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' }).first()).toBeVisible({ timeout: 25000 });
    await expect(input).toHaveValue('');
  });

  test('3. Starter Suggestions populate input and allow prompt submission', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    // Click "Explain a concept" starter suggestion
    const suggBtn = page.locator('button:has-text("Explain a concept")').first();
    await expect(suggBtn).toBeVisible();
    await suggBtn.click();

    const input = page.locator('#input-dsa-ai-query');
    await expect(input).not.toHaveValue('');

    // Click Ask
    const askBtn = page.locator('#btn-dsa-ai-ask');
    await askBtn.click();

    // Input clears immediately
    await expect(input).toHaveValue('');

    // Contextual help appears
    await expect(page.locator('text=What do you need help with?').first()).toBeVisible({ timeout: 10000 });
  });

  test('4. Clear button resets conversation back to clean empty state', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    const input = page.locator('#input-dsa-ai-query');
    await input.fill('What is a binary tree?');
    await input.press('Enter');

    await expect(input).toHaveValue('');
    await expect(page.locator('.text-xs:has-text("What is a binary tree?")').first()).toBeVisible({ timeout: 10000 });

    // Click Clear button in header
    const clearBtn = page.locator('#btn-dsa-ai-clear, button:has-text("Clear")').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Verify empty state is restored
    await expect(page.locator('text=Starter Suggestions').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.text-xs:has-text("What is a binary tree?")')).not.toBeVisible();
  });

});
