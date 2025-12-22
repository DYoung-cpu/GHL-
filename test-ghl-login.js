const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting GHL login test (fresh session)...');

  // Launch browser in headed mode with fresh context
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  // Create a completely fresh context - no cookies, no cache
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: undefined // Ensure no saved state
  });

  // Clear any existing data
  await context.clearCookies();

  const page = await context.newPage();

  try {
    // Go to GHL login page
    console.log('📍 Navigating to GHL login page...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="mail"]', { timeout: 15000 });
    console.log('✅ Login page loaded');

    // Fill in email
    console.log('📧 Entering email...');
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail"]', 'david@lendwisemtg.com');

    // Fill in password
    console.log('🔑 Entering password...');
    await page.fill('input[type="password"]', 'Dyoung2185!');

    // Small delay before clicking
    await page.waitForTimeout(500);

    // Click login button
    console.log('🔘 Clicking login button...');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

    // Wait for navigation
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(5000);

    // Check current URL and page content
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check what page we're on
    const pageContent = await page.content();

    if (pageContent.includes('Verify Security Code') || pageContent.includes('Security Code')) {
      console.log('🔐 2FA is still active - GHL may require it at the organization level');
    } else if (pageContent.includes('Dashboard') || pageContent.includes('Conversations') || pageContent.includes('Contacts')) {
      console.log('✅ SUCCESS! We are in the GHL dashboard!');
    } else if (pageContent.includes('Invalid') || pageContent.includes('incorrect')) {
      console.log('❌ Invalid credentials');
    }

    // Take screenshot
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/ghl-login-result.png', fullPage: true });
    console.log('📸 Screenshot saved');

    // Keep browser open for 60 seconds so you can see and interact if needed
    console.log('👀 Browser staying open for 60 seconds - check the window...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/ghl-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
