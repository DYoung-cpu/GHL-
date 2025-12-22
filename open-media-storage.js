const { chromium } = require('playwright');

// Simple script to open GHL Media Storage for manual URL copying

(async () => {
  console.log('📂 Opening GHL Media Storage');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // ===== LOGIN =====
    console.log('📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   ✓ Clicked Google sign-in');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Step 2: Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
      }
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE VIA SIDEBAR =====
    console.log('📍 Step 3: Navigating to Media Storage via sidebar...');

    // Click Media Storage in sidebar
    const mediaStorage = page.locator('text=Media Storage');
    if (await mediaStorage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mediaStorage.click();
      console.log('   ✓ Clicked Media Storage');
    } else {
      // Scroll down in sidebar to find it
      console.log('   Scrolling to find Media Storage...');
      for (let i = 0; i < 10; i++) {
        await page.locator('nav').first().evaluate(el => el.scrollBy(0, 100));
        await page.waitForTimeout(300);
        if (await mediaStorage.isVisible({ timeout: 500 }).catch(() => false)) {
          await mediaStorage.click();
          console.log('   ✓ Found and clicked Media Storage');
          break;
        }
      }
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-storage-final.png' });
    console.log('   📸 media-storage-final.png\n');

    // ===== INSTRUCTIONS =====
    console.log('='.repeat(50));
    console.log('📋 MANUAL STEPS TO GET URLs:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. You should see the 3 uploaded images:');
    console.log('   - owl-logo.gif');
    console.log('   - apply-button.png');
    console.log('   - equal-housing.png');
    console.log('');
    console.log('2. Click on each image thumbnail');
    console.log('');
    console.log('3. In the right panel, find the URL field');
    console.log('   OR click the "Copy" link next to the image');
    console.log('');
    console.log('4. Paste each URL and give them to me');
    console.log('');
    console.log('The URLs will look like:');
    console.log('https://storage.googleapis.com/msgsndr/...');
    console.log('OR');
    console.log('https://images.leadconnectorhq.com/...');
    console.log('');
    console.log('Browser will stay open for 10 minutes.');
    console.log('='.repeat(50));

    await page.waitForTimeout(600000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-error-final.png' });
    console.log('   📸 media-error-final.png');
    await page.waitForTimeout(120000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
