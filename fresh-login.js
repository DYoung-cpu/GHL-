/**
 * Fresh Login Script for GHL
 * Logs in and saves auth state
 */

require('dotenv').config();
const { chromium } = require('playwright');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_EMAIL = 'david@lendwisemtg.com';
const GHL_PASSWORD = 'Fafa2185!';

async function main() {
  console.log('=== GHL Fresh Login ===\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Go to login page
    console.log('1. Going to GHL login page...');
    await page.goto('https://app.gohighlevel.com/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/fresh-01-login-page.png' });

    // Fill email
    console.log('2. Entering email...');
    const emailInput = await page.locator('input[placeholder="Your email address"]');
    await emailInput.fill(GHL_EMAIL);
    await page.waitForTimeout(500);

    // Fill password
    console.log('3. Entering password...');
    const passInput = await page.locator('input[placeholder="The password you picked"]');
    await passInput.fill(GHL_PASSWORD);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/fresh-02-credentials-entered.png' });

    // Click Sign in button
    console.log('4. Clicking Sign in...');
    await page.locator('button:has-text("Sign in")').click();

    // Wait for navigation
    console.log('5. Waiting for login to complete...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'screenshots/fresh-03-after-login.png' });

    // Check if we need to select a sub-account
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Look for sub-account switcher
    const switcher = await page.locator('text=Click here to switch').first();
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('6. Switching to LENDWISE sub-account...');
      await switcher.click();
      await page.waitForTimeout(2000);

      const lendwise = await page.locator('text=LENDWISE').first();
      if (await lendwise.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
      }
    }

    await page.screenshot({ path: 'screenshots/fresh-04-logged-in.png' });

    // Navigate to workflows to verify login works
    console.log('7. Verifying access to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/fresh-05-workflows.png' });

    // Save auth state
    console.log('8. Saving authentication state...');
    await context.storageState({ path: 'auth.json' });
    console.log('   Auth saved to auth.json');

    console.log('\n=== Login Complete ===');
    console.log('Browser will stay open for 60 seconds...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/fresh-error.png' });
  }

  await browser.close();
}

main().catch(console.error);
