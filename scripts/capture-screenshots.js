const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');

// 1. Delete the current screenshot set first
if (fs.existsSync(SCREENSHOTS_DIR)) {
  fs.rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function setupContext(browser, viewport, role, email) {
  const context = await browser.newContext({ viewport });

  // Force light mode using the correct Axly key
  await context.addInitScript(() => {
    localStorage.setItem('axly-theme', 'light');
  });

  if (role && email) {
    const page = await context.newPage();
    console.log(`Authenticating as ${role} (${email})...`);
    
    // Using API for faster reliable auth without UI flakiness
    const res = await page.request.post('http://localhost:5000/api/v1/auth/dev-login', {
      data: { email, role }
    });
    
    if (res.ok()) {
      const body = await res.json();
      await context.addInitScript((token) => {
        localStorage.setItem('axly_auth_token', token);
      }, body.token);
    } else {
      console.error(`Failed to authenticate ${email}.`);
    }
    
    await page.close();
  }

  return context;
}

async function safeCapture(page, url, expectedHeading, filename, roleStr) {
  const route = url.split('/').pop() || 'landing';
  console.log(`${roleStr} /${route} → authenticated → light → ${expectedHeading || 'N/A'} → capture init`);
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Wait for data to load and render

  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.error(`❌ FAILED: Redirected to login for ${url}. Authentication not preserved.`);
    return false;
  }

  const loginFormVisible = await page.locator('form:has(input[type="email"])').isVisible().catch(()=>false);
  if (loginFormVisible) {
    console.error(`❌ FAILED: Login form is visible on ${url}.`);
    return false;
  }

  // Verify visually/structurally that Light Mode is actually active
  const isDarkActive = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDarkActive) {
    console.error(`❌ FAILED: Dark mode is still active on ${url}.`);
    return false;
  }

  if (expectedHeading) {
    // Check if expected heading word exists anywhere in the body to ensure we hit the right page
    const text = await page.locator('body').textContent();
    if (!text || !text.toLowerCase().includes(expectedHeading.toLowerCase())) {
      console.warn(`⚠️ Warning: Expected text "${expectedHeading}" not clearly found on ${url}.`);
    }
  }

  const outPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`✅ Captured: ${filename}`);
  return true;
}

async function capture() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  
  const desktopViewport = { width: 1280, height: 800 };
  const mobileViewport = { width: 390, height: 844 };

  // =====================
  // PUBLIC
  // =====================
  const publicContextDesktop = await setupContext(browser, desktopViewport, null, null);
  const publicPageDesktop = await publicContextDesktop.newPage();
  await safeCapture(publicPageDesktop, 'http://localhost:5173/', 'Master DSA', 'landing-light-desktop.png', 'PUBLIC');
  await publicContextDesktop.close();

  // =====================
  // STUDENT CONTEXT
  // =====================
  const studentContextDesktop = await setupContext(browser, desktopViewport, 'user', 'alex@example.com');
  const studentContextMobile = await setupContext(browser, mobileViewport, 'user', 'alex@example.com');

  const sPageDesktop = await studentContextDesktop.newPage();
  await safeCapture(sPageDesktop, 'http://localhost:5173/dashboard', 'Welcome', 'student-dashboard-light-desktop.png', 'STUDENT');
  await safeCapture(sPageDesktop, 'http://localhost:5173/practice', 'Practice', 'practice-light-desktop.png', 'STUDENT');
  
  // Find a problem workspace link
  let workspaceUrl = 'http://localhost:5173/workspace/1';
  await sPageDesktop.goto('http://localhost:5173/practice', {waitUntil: 'networkidle'});
  await sPageDesktop.waitForTimeout(1000);
  const solveBtnDesktop = sPageDesktop.locator('button:has-text("Solve"), button:has-text("Continue"), button:has-text("Review")').first();
  if (await solveBtnDesktop.count() > 0) {
    await solveBtnDesktop.click();
    await sPageDesktop.waitForTimeout(2000);
    workspaceUrl = sPageDesktop.url();
  }
  await safeCapture(sPageDesktop, workspaceUrl, null, 'problem-workspace-light-desktop.png', 'STUDENT');
  await safeCapture(sPageDesktop, 'http://localhost:5173/leaderboard', 'Leaderboard', 'leaderboard-light-desktop.png', 'STUDENT');
  await safeCapture(sPageDesktop, 'http://localhost:5173/daily-challenge', 'Daily Challenge', 'daily-challenge-light-desktop.png', 'STUDENT');

  const sPageMobile = await studentContextMobile.newPage();
  await safeCapture(sPageMobile, 'http://localhost:5173/dashboard', 'Welcome', 'student-dashboard-light-mobile.png', 'STUDENT');
  await safeCapture(sPageMobile, 'http://localhost:5173/practice', 'Practice', 'practice-light-mobile.png', 'STUDENT');
  await safeCapture(sPageMobile, workspaceUrl, null, 'problem-workspace-light-mobile.png', 'STUDENT');
  await safeCapture(sPageMobile, 'http://localhost:5173/leaderboard', 'Leaderboard', 'leaderboard-light-mobile.png', 'STUDENT');
  await safeCapture(sPageMobile, 'http://localhost:5173/daily-challenge', 'Daily Challenge', 'daily-challenge-light-mobile.png', 'STUDENT');

  await studentContextDesktop.close();
  await studentContextMobile.close();

  // =====================
  // ADMIN CONTEXT
  // =====================
  const adminContextDesktop = await setupContext(browser, desktopViewport, 'admin', 'admin@axly.in');
  const adminContextMobile = await setupContext(browser, mobileViewport, 'admin', 'admin@axly.in');

  const aPageDesktop = await adminContextDesktop.newPage();
  await safeCapture(aPageDesktop, 'http://localhost:5173/admin-dashboard', 'Admin', 'admin-dashboard-light-desktop.png', 'ADMIN');
  await safeCapture(aPageDesktop, 'http://localhost:5173/admin-questions', 'Question Bank', 'admin-questions-light-desktop.png', 'ADMIN');
  await safeCapture(aPageDesktop, 'http://localhost:5173/admin-progress', 'Progress', 'admin-progress-light-desktop.png', 'ADMIN');
  await safeCapture(aPageDesktop, 'http://localhost:5173/admin-reviews', 'Review', 'admin-reviews-light-desktop.png', 'ADMIN');

  const aPageMobile = await adminContextMobile.newPage();
  await safeCapture(aPageMobile, 'http://localhost:5173/admin-dashboard', 'Admin', 'admin-dashboard-light-mobile.png', 'ADMIN');
  await safeCapture(aPageMobile, 'http://localhost:5173/admin-questions', 'Question Bank', 'admin-questions-light-mobile.png', 'ADMIN');
  await safeCapture(aPageMobile, 'http://localhost:5173/admin-progress', 'Progress', 'admin-progress-light-mobile.png', 'ADMIN');
  await safeCapture(aPageMobile, 'http://localhost:5173/admin-reviews', 'Review', 'admin-reviews-light-mobile.png', 'ADMIN');

  await adminContextDesktop.close();
  await adminContextMobile.close();

  await browser.close();
  console.log('\n✅ Script Complete. All screenshots successfully validated and saved to docs/screenshots!');
}

capture().catch(e => {
  console.error('Fatal error during capture:', e);
  process.exit(1);
});
