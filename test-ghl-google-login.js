const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting GHL login via Google...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  await context.clearCookies();
  const page = await context.newPage();

  try {
    // Go to GHL login page
    console.log('📍 Navigating to GHL login page...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // The Google button is inside an iframe. Find and click it.
    console.log('🔍 Looking for Google Sign-in iframe...');

    // Wait for the Google button container
    await page.waitForSelector('#g_id_signin, .g_id_signin', { timeout: 10000 });
    console.log('✅ Found Google sign-in container');

    // Get the iframe inside the Google button container
    const iframeElement = await page.$('#g_id_signin iframe, .g_id_signin iframe, .S9gUrf-YoZ4jf iframe');

    if (iframeElement) {
      console.log('✅ Found Google iframe, clicking...');
      const frame = await iframeElement.contentFrame();
      if (frame) {
        // Click the button inside the iframe
        await frame.click('div[role="button"], button, .nsm7Bb-HzV7m-LgbsSe');
      } else {
        // Fallback: click the iframe element directly
        await iframeElement.click();
      }
    } else {
      // Fallback: Click at the coordinates where the Google button should be
      // Based on the debug output: x: 455, y: 542, width: 370, height: 44
      console.log('⚠️ No iframe found, clicking by coordinates...');
      await page.mouse.click(640, 565); // Center of the Google button area
    }

    // Wait for Google popup or redirect
    console.log('⏳ Waiting for Google login...');
    await page.waitForTimeout(3000);

    // Check for popup window
    const pages = context.pages();
    console.log(`📍 Number of pages/windows: ${pages.length}`);

    let googlePage = page;
    if (pages.length > 1) {
      // Google opened in a popup
      googlePage = pages[pages.length - 1];
      console.log('✅ Found Google popup window');
    }

    const currentUrl = googlePage.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('accounts.google.com')) {
      console.log('✅ On Google login page!');

      // Enter email
      console.log('📧 Entering Google email...');
      await googlePage.waitForSelector('input[type="email"]', { timeout: 10000 });
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.waitForTimeout(500);
      await googlePage.keyboard.press('Enter');

      // Wait for password
      console.log('⏳ Waiting for password field...');
      await googlePage.waitForTimeout(4000);

      console.log('🔑 Entering Google password...');
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]', 'Fafa2185!');
      await googlePage.waitForTimeout(500);
      await googlePage.keyboard.press('Enter');

      // Wait for redirect back to GHL
      console.log('⏳ Waiting for redirect to GHL...');
      await page.waitForTimeout(10000);
    }

    // Final check - use the main page
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/ghl-google-login-result.png', fullPage: true });
    console.log('📸 Screenshot saved');

    const pageContent = await page.content();
    if (finalUrl.includes('dashboard') || finalUrl.includes('location') || pageContent.includes('Conversations') || pageContent.includes('Launchpad')) {
      console.log('🎉 SUCCESS! We are in GHL!');
    } else if (pageContent.includes('Verify') || pageContent.includes('Security Code')) {
      console.log('🔐 Still hitting security verification');
    } else {
      console.log('❓ Check screenshot for current state');
    }

    console.log('👀 Browser staying open for 90 seconds...');
    await page.waitForTimeout(90000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/ghl-google-error.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
