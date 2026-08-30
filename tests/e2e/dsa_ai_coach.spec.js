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

test.describe('DSA AI Coach — Ask First → Contextual "What Next?" Flow E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('1. Full Flow: Ask First → Help Type → AI Response → Contextual "What Next?" Actions', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsStudent(page);

    // 1. Open DSA AI Coach
    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    // 2. Verify clean empty state with Starter Suggestions
    await expect(page.locator('text=Ask a question, paste code, or describe your DSA problem.').first()).toBeVisible();
    await expect(page.locator('text=Starter Suggestions').first()).toBeVisible();

    const input = page.locator('#input-dsa-ai-query, input[placeholder*="Ask a DSA question"]');
    const askBtn = page.locator('#btn-dsa-ai-ask, button:has-text("Ask")').first();

    await expect(input).toBeVisible();
    await expect(askBtn).toBeVisible();

    // 3. Type "Explain BFS"
    await input.fill('Explain BFS');
    await expect(input).toHaveValue('Explain BFS');

    // 4. Click Ask
    await askBtn.click();

    // 5. Verify input is IMMEDIATELY cleared
    await expect(input).toHaveValue('');

    // 6. Verify user message appears in chat
    await expect(page.locator('.text-xs:has-text("Explain BFS")').first()).toBeVisible({ timeout: 10000 });

    // 7. Verify contextual help selector appears
    await expect(page.locator('text=What do you need help with?').first()).toBeVisible({ timeout: 10000 });

    // 8. Select Explain action
    const explainBtn = page.locator('#btn-action-explain, button:has-text("Explain")').first();
    await explainBtn.click();

    // 9. Verify first AI response appears
    const firstAiResponse = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' }).first();
    await expect(firstAiResponse).toBeVisible({ timeout: 25000 });

    // 10. Verify "What would you like to do next?" appears directly below the AI response
    await expect(page.locator('text=What would you like to do next?').first()).toBeVisible({ timeout: 10000 });

    // 11. Click "Approach" from the "What next?" actions
    const nextApproachBtn = page.locator('#btn-next-action-approach, button:has-text("Approach")').first();
    await expect(nextApproachBtn).toBeVisible();
    await nextApproachBtn.click();

    // 12. Verify a NEW AI response appears (count = 2)
    const allAiResponses = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' });
    await expect(allAiResponses).toHaveCount(2, { timeout: 25000 });

    // 13. Verify previous Explain response remains visible
    await expect(firstAiResponse).toBeVisible();

    // 14. Verify second AI response also has its own "What would you like to do next?" section
    const whatNextSections = page.locator('text=What would you like to do next?');
    await expect(whatNextSections).toHaveCount(2, { timeout: 10000 });

    // 15. Click "Complexity" from the second AI response's "What next?" section
    const nextComplexityBtn = page.locator('#btn-next-action-complexity, button:has-text("Complexity")').last();
    await expect(nextComplexityBtn).toBeVisible();
    await nextComplexityBtn.click();

    // 16. Verify third AI response appears (count = 3)
    await expect(allAiResponses).toHaveCount(3, { timeout: 25000 });

    // 17. Ask a new follow-up question via input
    await input.fill('Why do we use a queue?');
    await input.press('Enter');

    // 18. Verify input cleared and message added to stream
    await expect(input).toHaveValue('');
    await expect(page.locator('.text-xs:has-text("Why do we use a queue?")').first()).toBeVisible({ timeout: 10000 });

    // 19. Click Clear button
    const clearBtn = page.locator('#btn-dsa-ai-clear, button:has-text("Clear")').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // 20. Verify clean empty state returns and old messages are gone
    await expect(page.locator('text=Starter Suggestions').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.text-xs:has-text("Explain BFS")')).not.toBeVisible();
  });

  test('2. Starter Suggestions populate input and Enter sends query with cleared input', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.locator('aside button:has-text("DSA AI Coach"), button:has-text("DSA AI Coach")').first().click();
    await expect(page.locator('h3:has-text("DSA AI Coach")').first()).toBeVisible({ timeout: 15000 });

    // Click starter suggestion
    const suggBtn = page.locator('button:has-text("Find an approach")').first();
    await suggBtn.click();

    const input = page.locator('#input-dsa-ai-query');
    await expect(input).not.toHaveValue('');

    // Press Enter to submit
    await input.press('Enter');

    // Input immediately clears
    await expect(input).toHaveValue('');

    // Contextual help appears
    await expect(page.locator('text=What do you need help with?').first()).toBeVisible({ timeout: 10000 });
  });

});
