const { chromium } = require('playwright');

// Enable Labs features and configure signature in GHL

(async () => {
  console.log('🔧 GHL Labs & Signature Configuration');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

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

    // ===== GO TO SETTINGS → LABS =====
    console.log('📍 Step 3: Going to Settings → Labs...');
    await page.click('text=Settings');
    await page.waitForTimeout(3000);

    // Look for Labs in the settings menu
    const labsLink = page.locator('text=Labs');
    if (await labsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await labsLink.click();
      console.log('   ✓ Clicked Labs');
      await page.waitForTimeout(3000);
    } else {
      console.log('   Labs not found in menu, scrolling...');
      // Scroll the sidebar to find Labs
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(300);
        if (await labsLink.isVisible({ timeout: 500 }).catch(() => false)) {
          await labsLink.click();
          console.log('   ✓ Found and clicked Labs');
          break;
        }
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/labs-page.png' });
    console.log('   📸 labs-page.png\n');

    // ===== LOOK FOR PROFILE V2 =====
    console.log('📍 Step 4: Looking for Profile V2 feature...');

    // Search for Profile V2 or similar features
    const profileV2 = page.locator('text=Profile V2');
    const newComposer = page.locator('text=New Message Composer');
    const emailSignature = page.locator('text=Email Signature');

    if (await profileV2.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Profile V2!');
      await profileV2.click();
    } else if (await newComposer.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found New Message Composer!');
      await newComposer.click();
    } else {
      console.log('   Profile V2 not immediately visible');
      console.log('   Listing visible Labs features...');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/labs-features.png' });
    console.log('   📸 labs-features.png\n');

    // ===== INSTRUCTIONS =====
    console.log('='.repeat(50));
    console.log('📋 MANUAL STEPS:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. Look for "Profile V2" or "New Message Composer" in Labs');
    console.log('2. Toggle it ON if found');
    console.log('3. Then go to Settings → My Staff → Edit David Young');
    console.log('4. Try the signature again');
    console.log('');
    console.log('Browser will stay open for 5 minutes.');
    console.log('='.repeat(50));

    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/labs-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
