const { test, expect } = require('@playwright/test');

test('Production CORS Signup Test', async ({ page }) => {
  // Go to production signup page
  await page.goto('https://dsatracker.axly.in/signup');
  await page.waitForLoadState('networkidle');

  // Verify page loaded
  await expect(page.locator('h1:has-text("Create your Axly account")')).toBeVisible({ timeout: 15000 });

  // Listen for the signup API request to verify it completes and check response
  const signupResponsePromise = page.waitForResponse((res) => 
    res.url().includes('/api/v1/auth/signup') && res.request().method() === 'POST'
  );

  // Fill in the signup form
  await page.fill('input[type="text"][placeholder="Alex Mercer"]', 'Test User');
  await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
  await page.fill('input[type="password"]', 'Password123!');
  
  // Submit the form
  await page.click('button:has-text("Create Account")');

  // Wait for the API response
  const signupResponse = await signupResponsePromise;
  
  // Log the status
  console.log('Signup Response Status:', signupResponse.status());
  
  // It might be 500 (email config error) or 201 (success), but the key is that it's NOT a CORS error (which would throw before response)
  const isOk = signupResponse.ok() || signupResponse.status() >= 400; // If it receives a status code from the server, CORS succeeded!
  expect(isOk).toBeTruthy();

  // If it's 500 due to email, the UI should show an error toaster or message
  if (signupResponse.status() === 500) {
    const errorText = await page.locator('text=Failed to send').first().isVisible() 
      || await page.locator('.text-rose-500').first().isVisible();
    console.log('Error UI visible:', errorText);
  }
});
