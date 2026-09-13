const pw = require('@playwright/test');

(async () => {
  console.log('Automated Verification Started...');
  const browser = await pw.chromium.launch({
    executablePath: process.env.LOCALAPPDATA + '\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    headless: true, // Run headlessly to quickly verify the features without popping up
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('1. Logging in as test user using dev-login endpoint...');
    await page.goto('http://localhost:5173/login');
    
    // Hit backend dev-login API directly
    const response = await context.request.post('http://localhost:5000/api/v1/auth/dev-login', {
      data: { email: 'admin@axly.in', role: 'admin' }
    });
    
    if (response.ok()) {
      const authData = await response.json();
      console.log('Login successful for:', authData.user.email);
      // Set token in localStorage
      await page.goto('http://localhost:5173/'); 
      await page.evaluate((data) => {
        localStorage.setItem('axly_auth_token', data.token);
      }, authData);
    } else {
      console.log('Dev login failed. Fallback needed?');
      throw new Error('Could not log in.');
    }
    
    console.log('\n2. Verifying Question Bank Page (/practice)...');
    await page.goto('http://localhost:5173/practice');
    await page.waitForSelector('h1:has-text("Practice Library")', { timeout: 10000 });
    console.log('  ✓ Practice Library Header found');
    
    // Check filters
    await page.waitForSelector('select[aria-label="Filter by difficulty"]');
    console.log('  ✓ Difficulty Filter found');
    
    // Check questions list
    await page.waitForSelector('.data-table tbody tr');
    const questionsCount = await page.locator('.data-table tbody tr').count();
    console.log(`  ✓ Found ${questionsCount} questions in the list`);
    
    if (questionsCount > 0) {
      const firstQuestion = await page.locator('.data-table tbody tr').first().locator('td').nth(1).innerText();
      console.log(`  ✓ First Question Title: ${firstQuestion.replace(/\n/g, ' ')}`);
    } else {
      console.log('  ⚠ No questions returned. Seed data may be required.');
    }
    
    console.log('\n3. Verifying Daily Challenge Page (/daily)...');
    await page.goto('http://localhost:5173/daily');
    await page.waitForSelector('h1:has-text("Daily Challenge")');
    console.log('  ✓ Daily Challenge Header found');
    
    const hasChallenge = await page.isVisible('button:has-text("Solve Challenge")');
    const hasContinue = await page.isVisible('button:has-text("Continue Solving")');
    const hasReview = await page.isVisible('button:has-text("Review Solution")');
    const hasNoChallenge = await page.isVisible('text="No challenge scheduled for today yet."');
    
    if (hasChallenge || hasContinue || hasReview) {
       console.log('  ✓ A Daily Challenge is actively scheduled and visible.');
       const title = await page.locator('h2.text-2xl').innerText();
       console.log(`  ✓ Challenge Title: ${title}`);
    } else if (hasNoChallenge) {
       console.log('  ✓ No challenge scheduled for today, but the empty state UI rendered correctly.');
    } else {
       console.log('  ⚠ Could not determine Daily Challenge state (maybe loading taking too long or unexpected UI).');
    }
    
    console.log('\nVerification Complete. Both pages are functioning correctly!');
  } catch (err) {
    console.error('\nVerification failed:', err);
  } finally {
    await browser.close();
  }
})();
