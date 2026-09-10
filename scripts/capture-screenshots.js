const { chromium, devices } = require('playwright');
const fs = require('fs');

async function capture() {
  if (fs.existsSync('docs/screenshots')) {
    fs.rmSync('docs/screenshots', { recursive: true, force: true });
  }
  fs.mkdirSync('docs/screenshots', { recursive: true });

  console.log('Launching browser...');
  const browser = await chromium.launch();
  
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 13'] });

  async function take(page, name) {
    console.log(`Taking screenshot: ${name}.png`);
    await page.waitForTimeout(2000); // Allow data/renders to settle
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
  }

  const dPage = await desktopContext.newPage();
  
  // 1. Landing
  await dPage.goto('http://localhost:5173/');
  await take(dPage, 'landing-desktop');
  
  // 2. Login as student via API
  console.log('Logging in as student...');
  const resStudent = await dPage.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'alex@example.com', role: 'user' }
  });
  const bodyStudent = await resStudent.json();
  
  await dPage.goto('http://localhost:5173/');
  await dPage.evaluate((token) => localStorage.setItem('axly_auth_token', token), bodyStudent.token);
  
  await dPage.goto('http://localhost:5173/dashboard');
  await take(dPage, 'student-dashboard-desktop');

  await dPage.goto('http://localhost:5173/practice');
  await take(dPage, 'practice-desktop');

  // Try to find a problem workspace
  await dPage.goto('http://localhost:5173/practice');
  await dPage.waitForTimeout(1000);
  const solveBtn = dPage.locator('button:has-text("Solve"), button:has-text("Continue"), button:has-text("Review")').first();
  if (await solveBtn.count() > 0) {
    await solveBtn.click();
    await take(dPage, 'problem-workspace-desktop');
  } else {
    await dPage.goto('http://localhost:5173/workspace/1');
    await take(dPage, 'problem-workspace-desktop');
  }

  // Go back to practice or somewhere safe
  await dPage.goto('http://localhost:5173/leaderboard');
  await take(dPage, 'leaderboard-desktop');

  // Mobile Student
  const mPage = await mobileContext.newPage();
  await mPage.goto('http://localhost:5173/');
  await mPage.evaluate((token) => localStorage.setItem('axly_auth_token', token), bodyStudent.token);
  await mPage.evaluate(() => localStorage.setItem('theme', 'light')); // Explicitly set light mode
  
  await mPage.goto('http://localhost:5173/dashboard');
  await take(mPage, 'student-dashboard-mobile');

  if (await solveBtn.count() > 0) {
    const href = await solveBtn.getAttribute('href') || '/workspace/1';
    await mPage.goto(`http://localhost:5173${href}`);
  } else {
    await mPage.goto('http://localhost:5173/workspace/1');
  }
  await take(mPage, 'problem-workspace-mobile');

  // Login as Admin
  console.log('Logging in as admin...');
  const adPage = await desktopContext.newPage();
  const resAdmin = await adPage.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const bodyAdmin = await resAdmin.json();

  await adPage.goto('http://localhost:5173/');
  await adPage.evaluate((token) => localStorage.setItem('axly_auth_token', token), bodyAdmin.token);
  
  await adPage.goto('http://localhost:5173/admin-dashboard');
  await take(adPage, 'admin-dashboard-desktop');
  
  await adPage.goto('http://localhost:5173/admin-progress');
  await take(adPage, 'admin-progress-desktop');
  
  await adPage.goto('http://localhost:5173/admin-reviews');
  await take(adPage, 'admin-reviews-desktop');

  await adPage.goto('http://localhost:5173/admin-questions');
  await take(adPage, 'admin-questions-desktop');

  // Admin Mobile
  const amPage = await mobileContext.newPage();
  await amPage.goto('http://localhost:5173/');
  await amPage.evaluate((token) => localStorage.setItem('axly_auth_token', token), bodyAdmin.token);
  await amPage.evaluate(() => localStorage.setItem('theme', 'light')); // Explicitly set light mode
  
  await amPage.goto('http://localhost:5173/admin-reviews');
  await take(amPage, 'admin-reviews-mobile');

  await browser.close();
  console.log('Finished capturing all screenshots!');
}

capture().catch(e => {
  console.error(e);
  process.exit(1);
});
