const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in as admin...');
  const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const body = await res.json();
  
  await page.addInitScript((token) => {
    window.localStorage.setItem('axly_auth_token', token);
  }, body.token);
  
  console.log('Going to / ...');
  await page.goto('http://localhost:5173/');
  
  console.log('Waiting for load...');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'scratch/admin_test.png' });
  console.log('Screenshot saved to scratch/admin_test.png');
  
  await browser.close();
})();
