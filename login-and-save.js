/**
 * Launch browser, let user log in manually, save session
 */
const { chromium } = require('playwright');

async function loginAndSave() {
  console.log('Launching browser...');
  console.log('You will need to log in to GHL manually.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to GHL login
  await page.goto('https://app.gohighlevel.com/');

  console.log('='.repeat(50));
  console.log('BROWSER IS OPEN');
  console.log('='.repeat(50));
  console.log('');
  console.log('1. Log in to GHL with your Google account');
  console.log('2. Select "LENDWISE MORTGA" sub-account');
  console.log('3. Navigate to Automation > Workflows');
  console.log('4. Open a workflow you want to edit');
  console.log('');
  console.log('When you are on the workflow builder page,');
  console.log('come back here and press ENTER to save the session.');
  console.log('');
  console.log('='.repeat(50));

  // Wait for user to press enter
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Save the session
  console.log('\nSaving session...');
  await context.storageState({ path: 'auth.json' });
  console.log('Session saved to auth.json');

  // Take screenshot
  await page.screenshot({ path: 'screenshots/logged-in-state.png' });
  console.log('Screenshot saved');

  // Show current URL
  console.log('Current URL:', page.url());

  console.log('\nKeeping browser open for automation...');
  console.log('Press ENTER again to close browser when done.');

  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await browser.close();
  console.log('Browser closed.');
}

loginAndSave();
