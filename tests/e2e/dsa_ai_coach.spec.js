const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

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

test.describe('DSA AI Coach — Ask First → Contextual "What Next?" Flow E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Full Flow: Ask First → Help Type → AI Response → Contextual "What Next?" Actions', async ({ page }) => {
    test.setTimeout(90000);
    await loginAsStudent(page);

    // Navigate to AI Coach via sidebar
    await page.getByRole('button', { name: 'DSA AI Coach' }).click();
    // Heading is an h3 inside the panel
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /DSA AI Coach/i }).first()).toBeVisible({ timeout: 15000 });

    // Clean empty state with starter suggestions
    await expect(page.getByText('Ask a question, paste code, or describe your DSA problem.').first()).toBeVisible();
    await expect(page.getByText('Starter Suggestions').first()).toBeVisible();

    const input = page.locator('#input-dsa-ai-query');
    const askBtn = page.locator('#btn-dsa-ai-ask, button:has-text("Ask")').first();

    await expect(input).toBeVisible();
    await expect(askBtn).toBeVisible();

    // Type a query
    await input.fill('Explain BFS');
    await expect(input).toHaveValue('Explain BFS');

    // Click Ask
    await askBtn.click();

    // Input clears immediately
    await expect(input).toHaveValue('');

    // User message appears in chat
    await expect(page.locator('.text-xs').filter({ hasText: 'Explain BFS' }).first()).toBeVisible({ timeout: 10000 });

    // Contextual help selector appears
    await expect(page.getByText('What do you need help with?').first()).toBeVisible({ timeout: 10000 });

    // Select Explain action
    const explainBtn = page.locator('#btn-action-explain, button:has-text("Explain")').first();
    await explainBtn.click();

    // First AI response appears
    const firstAiResponse = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' }).first();
    await expect(firstAiResponse).toBeVisible({ timeout: 30000 });

    // "What would you like to do next?" appears
    await expect(page.getByText('What would you like to do next?').first()).toBeVisible({ timeout: 10000 });

    // Click "Approach" from what-next actions
    const nextApproachBtn = page.locator('#btn-next-action-approach, button:has-text("Approach")').first();
    await expect(nextApproachBtn).toBeVisible();
    await nextApproachBtn.click();

    // Second AI response appears (count = 2)
    const allAiResponses = page.locator('.bg-slate-900\\/80, .border-slate-800').filter({ hasText: 'DSA AI Coach' });
    await expect(allAiResponses).toHaveCount(2, { timeout: 30000 });

    // First response still visible
    await expect(firstAiResponse).toBeVisible();

    // Both responses have their own "What next?" sections
    const whatNextSections = page.getByText('What would you like to do next?');
    await expect(whatNextSections).toHaveCount(2, { timeout: 10000 });

    // Click "Complexity" from second AI response's what-next section
    const nextComplexityBtn = page.locator('#btn-next-action-complexity, button:has-text("Complexity")').last();
    await expect(nextComplexityBtn).toBeVisible();
    await nextComplexityBtn.click();

    // Third AI response appears (count = 3)
    await expect(allAiResponses).toHaveCount(3, { timeout: 30000 });

    // Ask a follow-up via Enter
    await input.fill('Why do we use a queue?');
    await input.press('Enter');

    await expect(input).toHaveValue('');
    await expect(page.locator('.text-xs').filter({ hasText: 'Why do we use a queue?' }).first()).toBeVisible({ timeout: 10000 });

    // Clear chat
    const clearBtn = page.locator('#btn-dsa-ai-clear, button:has-text("Clear")').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Empty state returns
    await expect(page.getByText('Starter Suggestions').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.text-xs').filter({ hasText: 'Explain BFS' })).not.toBeVisible();
  });

  test('2. Starter Suggestions populate input and Enter sends query with cleared input', async ({ page }) => {
    test.setTimeout(45000);
    await loginAsStudent(page);

    await page.getByRole('button', { name: 'DSA AI Coach' }).click();
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: /DSA AI Coach/i }).first()).toBeVisible({ timeout: 15000 });

    // Click a starter suggestion – it should populate the input
    const suggBtn = page.getByRole('button', { name: /Find an approach/i }).first();
    await suggBtn.click();

    const input = page.locator('#input-dsa-ai-query');
    await expect(input).not.toHaveValue('');

    // Press Enter to submit
    await input.press('Enter');

    // Input immediately clears
    await expect(input).toHaveValue('');

    // Contextual help appears
    await expect(page.getByText('What do you need help with?').first()).toBeVisible({ timeout: 15000 });
  });

});
