/**
 * BNTouch Login Automation
 * Logs into BNTouch CRM and explores the interface
 */

const { chromium } = require('playwright');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  loginUrl: 'https://www.bntouchmortgage.net/'
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('='.repeat(50));
  console.log('  BNTOUCH LOGIN');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to: ${CONFIG.loginUrl}`);
    await page.goto(CONFIG.loginUrl);
    await sleep(3000);

    await page.screenshot({ path: 'screenshots/bntouch-login-page.png' });
    console.log('Screenshot saved: bntouch-login-page.png\n');

    // Find and fill username field
    console.log('Looking for username field...');
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="login"]',
      'input[name="Username"]',
      'input[id="username"]',
      'input[id="user"]',
      'input[type="text"]'
    ];

    let usernameFound = false;
    for (const selector of usernameSelectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        console.log(`  Found: ${selector}`);
        await field.fill(CONFIG.username);
        usernameFound = true;
        break;
      }
    }

    if (!usernameFound) {
      console.log('  Username field not found with standard selectors');
      // Try to find any visible text input
      const allInputs = await page.locator('input').all();
      console.log(`  Found ${allInputs.length} input fields total`);
    }

    // Find and fill password field
    console.log('Looking for password field...');
    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.count() > 0 && await passwordField.isVisible()) {
      console.log('  Found password field');
      await passwordField.fill(CONFIG.password);
    }

    await sleep(1000);
    await page.screenshot({ path: 'screenshots/bntouch-filled.png' });
    console.log('\nCredentials entered. Screenshot: bntouch-filled.png');

    // Find and click login button
    console.log('\nLooking for login button...');
    const loginSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'input[type="submit"]',
      'button[type="submit"]',
      '.btn-login',
      '#login-btn'
    ];

    let loginClicked = false;
    for (const selector of loginSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        console.log(`  Clicking: ${selector}`);
        await btn.click();
        loginClicked = true;
        break;
      }
    }

    if (!loginClicked) {
      // Try clicking any button that looks like login
      console.log('  Trying to find button with Login text...');
      await page.locator('button').filter({ hasText: /login/i }).first().click().catch(() => {});
    }

    console.log('\nWaiting for login to complete...');
    await sleep(8000);

    await page.screenshot({ path: 'screenshots/bntouch-after-login.png' });
    console.log('\nCurrent URL:', page.url());
    console.log('Screenshot saved: bntouch-after-login.png');

    // If logged in, explore the dashboard
    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      console.log('\n=== LOGGED IN SUCCESSFULLY ===');

      // Map the dashboard elements
      console.log('\nExploring dashboard...');
      await sleep(2000);

      // Take a screenshot of the main dashboard
      await page.screenshot({ path: 'screenshots/bntouch-dashboard.png', fullPage: true });
      console.log('Dashboard screenshot saved');

      // Look for navigation elements
      const navItems = await page.locator('nav a, .nav-link, .menu-item, [class*="sidebar"] a').allTextContents();
      if (navItems.length > 0) {
        console.log('\nNavigation items found:');
        navItems.slice(0, 20).forEach((item, i) => {
          const text = item.trim();
          if (text && text.length < 50) {
            console.log(`  ${i + 1}. ${text}`);
          }
        });
      }
    } else {
      console.log('\nLogin may have failed - still on login page');
    }

    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 60 seconds for inspection...');
    await sleep(60000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/bntouch-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
