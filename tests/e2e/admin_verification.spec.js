const { test, expect } = require('./braveFixture');

let networkErrors = [];

test.beforeEach(async ({ page }) => {
  networkErrors = [];
  page.on('response', async (response) => {
    const url = response.url();
    // Only monitor our backend production API
    if (url.includes('dsa-tracker-ee58e15ab674.herokuapp.com/api/v1')) {
      const status = response.status();
      if (status >= 400) {
        let body = '';
        try {
          body = await response.text();
        } catch (e) {}
        
        // Exclude 401s that are standard auth checks (like the initial page load check)
        // Wait, the prompt says fail on unexpected 401. Let's record them.
        networkErrors.push({ url, status, body });
      } else {
        // Even if status is 200, check if body has postgres errors just in case
        try {
          const body = await response.text();
          const psqlErrors = [
            'relation does not exist',
            'column does not exist',
            'operator does not exist',
            'boolean = integer',
            'invalid input syntax',
            'Authentication failed',
            'deadlock detected'
          ];
          for (const err of psqlErrors) {
            if (body.includes(err)) {
              networkErrors.push({ url, status, body: `PSQL ERROR DETECTED: ${err} in ${body.substring(0, 200)}` });
            }
          }
        } catch (e) {}
      }
    }
  });
});

test.afterEach(() => {
  // We throw after the test so we don't abort immediately on the first network error without seeing what caused it.
  if (networkErrors.length > 0) {
    const criticalErrors = networkErrors.filter(e => 
      // Filter out expected 404s for avatars etc. if any, but since it's an API, 404 is bad.
      true
    );
    if (criticalErrors.length > 0) {
      console.error('NETWORK ERRORS DETECTED:', criticalErrors);
      throw new Error(`Test failed due to network/API errors: ${JSON.stringify(criticalErrors, null, 2)}`);
    }
  }
});

test.describe('Admin E2E Verification & Feature Testing', () => {

  test('Should authenticate via existing Brave profile and verify Admin access', async ({ page }) => {
    test.setTimeout(120000); // 2 mins for auth flow
    await page.setViewportSize({ width: 1440, height: 900 });
    
    console.log('Navigating to production...');
    await page.goto('https://dsatracker.axly.in');

    // Wait to see if we land on dashboard or login
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || await page.locator('text="Sign In"').isVisible()) {
      console.log('Not logged in. Attempting Google OAuth...');
      // Click Google login button (assuming there's a button with text like "Continue with Google" or similar)
      const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google")').first();
      if (await googleBtn.isVisible()) {
        await googleBtn.click();
        
        // Wait for redirect to google
        await page.waitForTimeout(5000);
        
        // If we are on Google accounts page, try to click the specific email
        if (page.url().includes('accounts.google.com')) {
          console.log('On Google accounts page. Looking for medicharlaravikiran88@gmail.com');
          const emailLocator = page.locator('text="medicharlaravikiran88@gmail.com"');
          if (await emailLocator.isVisible()) {
            await emailLocator.click();
          }
          // Now wait for the user to complete MFA if required, or for it to redirect automatically
          await page.waitForURL('https://dsatracker.axly.in/**', { timeout: 60000 });
        }
      }
    }

    console.log('Verifying Admin authentication...');
    // Should be on admin dashboard
    await expect(page.locator('text="Admin Dashboard"').first()).toBeVisible({ timeout: 15000 });
    
    // Verify specific admin navigation items are visible
    const navItems = [
      'Dashboard',
      'Question Bank',
      'Daily Challenge',
      'Reviews',
      'Students',
      'Progress',
      'Submissions',
      'Audit Logs',
      'Profile'
    ];

    for (const item of navItems) {
      await expect(page.locator(`text="${item}"`).first()).toBeVisible();
    }
  });

  test('Should test all Admin sidebar routes and features', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('https://dsatracker.axly.in');
    await expect(page.locator('text="Admin Dashboard"').first()).toBeVisible({ timeout: 15000 });

    // 1. Questions
    await page.locator('text="Question Bank"').first().click();
    await expect(page.locator('text="Question Management"').first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();

    // 2. Daily Challenge
    await page.locator('text="Daily Challenge"').first().click();
    await expect(page.locator('text="Daily Challenge Config"').or(page.locator('text="Daily Challenge Management"')).first()).toBeVisible();

    // 3. Reviews
    await page.locator('text="Reviews"').first().click();
    await expect(page.locator('text="Submission Reviews"').or(page.locator('text="Review Console"')).first()).toBeVisible();

    // 4. Students
    await page.locator('text="Students"').first().click();
    await expect(page.locator('text="Student Management"').or(page.locator('text="User Management"')).first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();

    // 5. Progress
    await page.locator('text="Progress"').first().click();
    await expect(page.locator('text="Progress Tracking"').or(page.locator('text="Student Progress"')).first()).toBeVisible();

    // 6. Submissions
    await page.locator('text="Submissions"').first().click();
    await expect(page.locator('text="All Submissions"').first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();

    // 7. Audit Logs
    await page.locator('text="Audit Logs"').first().click();
    await expect(page.locator('text="System Audit Logs"').or(page.locator('text="Audit"')).first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();

    // 8. Profile
    await page.locator('text="Profile"').last().click();
    await expect(page.locator('text="Profile"').or(page.locator('text="User Profile"')).first()).toBeVisible();
  });

  test('Should perform CRUD on Admin Questions safely', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('https://dsatracker.axly.in');
    await expect(page.locator('text="Admin Dashboard"').first()).toBeVisible({ timeout: 15000 });
    
    // Go to Questions
    await page.locator('text="Question Bank"').first().click();
    await expect(page.locator('text="Question Management"').first()).toBeVisible();

    // CREATE
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add Question")').first();
    await createBtn.click();
    
    // Fill form (Assuming standard fields, might need adjustment based on exact DOM)
    const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]');
    await expect(titleInput).toBeVisible();
    
    const testTitle = `E2E_TEST_QUESTION_${Date.now()}`;
    await titleInput.fill(testTitle);
    
    // Attempt to save
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create")').last();
    await saveBtn.click();
    
    // Wait for modal to close
    await expect(titleInput).toBeHidden({ timeout: 10000 });
    
    // VERIFY CREATE
    await page.reload();
    await expect(page.locator(`text="${testTitle}"`).first()).toBeVisible({ timeout: 10000 });

    // EDIT
    // Find the row with our title and click the edit button (usually a pencil icon or an "Edit" text button in the same row)
    const row = page.locator(`tr:has-text("${testTitle}")`).first();
    await row.locator('button:has-text("Edit"), button[aria-label="Edit"], svg').first().click();
    
    const editTitleInput = page.locator('input[placeholder*="Title"], input[name="title"]');
    await expect(editTitleInput).toBeVisible();
    await editTitleInput.fill(`${testTitle}_UPDATED`);
    const updateBtn = page.locator('button:has-text("Save"), button:has-text("Update")').last();
    await updateBtn.click();
    await expect(editTitleInput).toBeHidden({ timeout: 10000 });

    // VERIFY EDIT
    await page.reload();
    await expect(page.locator(`text="${testTitle}_UPDATED"`).first()).toBeVisible({ timeout: 10000 });

    // DELETE
    const updatedRow = page.locator(`tr:has-text("${testTitle}_UPDATED")`).first();
    await updatedRow.locator('button:has-text("Delete"), button[aria-label="Delete"]').first().click();
    
    // Confirm delete modal if any
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button.bg-red-600').last();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    
    // VERIFY DELETE
    await page.reload();
    await expect(page.locator(`text="${testTitle}_UPDATED"`).first()).toBeHidden({ timeout: 10000 });
  });

  test('Responsive Layouts check', async ({ page }) => {
    // Check mobile view
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('https://dsatracker.axly.in');
    
    // Wait for load
    await expect(page.locator('text="Admin Dashboard"').or(page.locator('text="Dashboard"')).first()).toBeVisible({ timeout: 15000 });
    
    // Check if hamburger menu works
    const hamburger = page.locator('button[aria-label="Toggle Menu"], button svg.lucide-menu').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }
    
    await expect(page.locator('text="Question Bank"').first()).toBeVisible();
    await page.locator('text="Question Bank"').first().click();
    await expect(page.locator('table').or(page.locator('.grid')).first()).toBeVisible();
  });
});
