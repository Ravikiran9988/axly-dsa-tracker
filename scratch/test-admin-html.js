const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
    data: { email: 'admin@axly.in', role: 'admin' }
  });
  const body = await res.json();
  
  await page.addInitScript((token) => {
    window.localStorage.setItem('axly_auth_token', token);
  }, body.token);
  
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(3000);
  
  const content = await page.evaluate(() => {
    return document.body.innerHTML;
  });
  
  const fs = require('fs');
  fs.writeFileSync('scratch/admin_html.txt', content);
  
  console.log('Admin HTML saved to scratch/admin_html.txt');
  
  await browser.close();
})();
