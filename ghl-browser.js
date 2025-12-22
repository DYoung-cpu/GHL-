/**
 * GHL Browser with Persistent Session
 *
 * Uses a persistent browser context to save cookies/login state.
 * First run: Log in manually via Google
 * Subsequent runs: Automatically logged in
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Store browser data in this folder
const USER_DATA_DIR = path.join(__dirname, 'browser-data');

// URLs
const GHL_URL = 'https://app.gohighlevel.com';
const WORKFLOW_URL = 'https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/workflow/folder';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startBrowser() {
  console.log('='.repeat(60));
  console.log('GHL BROWSER - PERSISTENT SESSION');
  console.log('='.repeat(60));
  console.log('');

  // Ensure browser-data directory exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    console.log('Created browser data directory: ' + USER_DATA_DIR);
  }

  // Launch browser with persistent context
  console.log('Launching browser with persistent storage...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    slowMo: 50
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Go to GHL
    console.log('\nNavigating to GHL...');
    await page.goto(GHL_URL);
    await delay(3000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check if logged in
    if (currentUrl.includes('login') || currentUrl.includes('oauth')) {
      console.log('\n' + '='.repeat(60));
      console.log('LOGIN REQUIRED');
      console.log('='.repeat(60));
      console.log('');
      console.log('Please log in via Google in the browser window.');
      console.log('After logging in, select the LENDWISE MORTGA sub-account.');
      console.log('');
      console.log('The browser will remember your login for future runs.');
      console.log('');
      console.log('Waiting for login... (watching for dashboard)');
      console.log('');

      // Wait for successful login (URL changes to dashboard)
      try {
        await page.waitForURL('**/location/**', { timeout: 300000 }); // 5 min timeout
        console.log('Login detected! URL:', page.url());
      } catch (e) {
        // Check if they made it somewhere else
        const newUrl = page.url();
        if (!newUrl.includes('login')) {
          console.log('Navigation detected to:', newUrl);
        }
      }
    } else {
      console.log('Already logged in!');
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/ghl-session.png' });
    console.log('Screenshot saved: ghl-session.png');

    // Navigate to workflows
    console.log('\nNavigating to Workflows...');
    await page.goto(WORKFLOW_URL);
    await delay(3000);

    // Take screenshot of workflows
    await page.screenshot({ path: 'screenshots/ghl-workflows.png' });
    console.log('Screenshot saved: ghl-workflows.png');

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    // Export session as auth.json for other scripts
    const cookies = await context.cookies();
    const storageState = {
      cookies: cookies,
      origins: []
    };
    fs.writeFileSync('auth.json', JSON.stringify(storageState, null, 2));
    console.log('Session exported to auth.json');

    console.log('\n' + '='.repeat(60));
    console.log('BROWSER READY');
    console.log('='.repeat(60));
    console.log('');
    console.log('The browser is now open and logged in.');
    console.log('You can interact with it manually.');
    console.log('');
    console.log('Press Ctrl+C to close the browser.');
    console.log('');

    // Keep browser open
    await delay(600000); // 10 minutes

  } catch (error) {
    console.error('\nError:', error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await context.close();
    console.log('\nBrowser closed.');
  }
}

startBrowser();
