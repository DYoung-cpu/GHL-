const { chromium } = require('playwright');
const path = require('path');

// Upload images to GHL Media Library and get URLs

(async () => {
  console.log('📤 GHL Media Library Image Upload');
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

    // ===== GO TO MEDIA LIBRARY =====
    console.log('📍 Step 3: Going to Media Library...');

    // Navigate to Marketing → Media Library
    await page.click('text=Marketing');
    await page.waitForTimeout(2000);

    // Look for Media Library or Media Storage
    const mediaLink = page.locator('a:has-text("Media")').first();
    if (await mediaLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mediaLink.click();
      console.log('   ✓ Clicked Media Library');
    } else {
      // Try direct URL
      await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/media-library');
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-library.png' });
    console.log('   📸 media-library.png\n');

    // ===== UPLOAD IMAGES =====
    console.log('📍 Step 4: Uploading images...');

    const imagesToUpload = [
      { name: 'owl-logo.gif', path: '/mnt/c/Users/dyoun/ghl-automation/owl-logo.gif' },
      { name: 'apply-button.png', path: '/mnt/c/Users/dyoun/ghl-automation/apply-button.png' },
      { name: 'equal-housing.png', path: '/mnt/c/Users/dyoun/ghl-automation/equal-housing.png' }
    ];

    const uploadedUrls = [];

    for (const img of imagesToUpload) {
      console.log(`   Uploading ${img.name}...`);

      // Look for upload button
      const uploadBtn = page.locator('button:has-text("Upload")').first();
      if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await uploadBtn.click();
        await page.waitForTimeout(1000);
      }

      // Use file input
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(img.path);
        console.log(`   ✓ Selected ${img.name}`);
        await page.waitForTimeout(3000);

        // Wait for upload to complete
        await page.waitForTimeout(5000);
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-uploaded.png' });
    console.log('   📸 media-uploaded.png\n');

    // ===== INSTRUCTIONS =====
    console.log('='.repeat(50));
    console.log('📋 NEXT STEPS:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. Upload the 3 images to the Media Library if not done:');
    console.log('   - owl-logo.gif');
    console.log('   - apply-button.png');
    console.log('   - equal-housing.png');
    console.log('');
    console.log('2. Right-click each image → Copy URL');
    console.log('');
    console.log('3. Give me the URLs and I\'ll update the signature HTML');
    console.log('');
    console.log('Browser will stay open for 10 minutes.');
    console.log('='.repeat(50));

    await page.waitForTimeout(600000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
