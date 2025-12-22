const { chromium } = require('playwright');

// Get GHL Media URLs and set up signature

(async () => {
  console.log('📤 GHL Get Image URLs & Set Signature');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // Store the URLs we find
  const imageUrls = {
    owl: null,
    apply: null,
    equal: null
  };

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

    // ===== GO TO MEDIA STORAGE =====
    console.log('📍 Step 3: Going to Media Storage...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/media-library', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // ===== GET IMAGE URLS =====
    console.log('📍 Step 4: Getting image URLs...');

    // Click on owl-logo.gif to get its URL
    const owlImage = page.locator('text=owl-logo.gif').first();
    if (await owlImage.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click the Copy button next to owl-logo
      const owlCopy = page.locator('text=owl-logo.gif').locator('..').locator('..').locator('text=Copy');
      if (await owlCopy.isVisible({ timeout: 3000 }).catch(() => false)) {
        await owlCopy.click();
        console.log('   ✓ Copied owl-logo.gif URL');
        // Get from clipboard
        imageUrls.owl = await page.evaluate(() => navigator.clipboard.readText());
        console.log(`   URL: ${imageUrls.owl}`);
      }
    }
    await page.waitForTimeout(1000);

    // Click on apply-button.png Copy
    const applyCopy = page.locator('text=apply-button.png').locator('..').locator('..').locator('text=Copy');
    if (await applyCopy.isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyCopy.click();
      console.log('   ✓ Copied apply-button.png URL');
      imageUrls.apply = await page.evaluate(() => navigator.clipboard.readText());
      console.log(`   URL: ${imageUrls.apply}`);
    }
    await page.waitForTimeout(1000);

    // Click on equal-housing.png Copy
    const equalCopy = page.locator('text=equal-housing.png').locator('..').locator('..').locator('text=Copy');
    if (await equalCopy.isVisible({ timeout: 3000 }).catch(() => false)) {
      await equalCopy.click();
      console.log('   ✓ Copied equal-housing.png URL');
      imageUrls.equal = await page.evaluate(() => navigator.clipboard.readText());
      console.log(`   URL: ${imageUrls.equal}`);
    }
    await page.waitForTimeout(1000);

    // Alternative: Click on each image thumbnail to open details and get URL
    console.log('\n📍 Alternative: Clicking images to get URLs from detail view...');

    // Click owl-logo thumbnail
    const owlThumb = page.locator('img[alt="owl-logo.gif"]').first();
    if (await owlThumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await owlThumb.click();
      await page.waitForTimeout(2000);

      // Look for the URL in the detail panel
      const urlInput = page.locator('input[value*="msgsndr.com"]').first();
      if (await urlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        imageUrls.owl = await urlInput.inputValue();
        console.log(`   Owl URL: ${imageUrls.owl}`);
      }

      // Close the panel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Click apply-button thumbnail
    const applyThumb = page.locator('img[alt="apply-button.png"]').first();
    if (await applyThumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyThumb.click();
      await page.waitForTimeout(2000);

      const urlInput = page.locator('input[value*="msgsndr.com"]').first();
      if (await urlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        imageUrls.apply = await urlInput.inputValue();
        console.log(`   Apply URL: ${imageUrls.apply}`);
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Click equal-housing thumbnail
    const equalThumb = page.locator('img[alt="equal-housing.png"]').first();
    if (await equalThumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await equalThumb.click();
      await page.waitForTimeout(2000);

      const urlInput = page.locator('input[value*="msgsndr.com"]').first();
      if (await urlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        imageUrls.equal = await urlInput.inputValue();
        console.log(`   Equal URL: ${imageUrls.equal}`);
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-urls.png' });

    // ===== OUTPUT RESULTS =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 IMAGE URLs FOUND:');
    console.log('='.repeat(50));
    console.log(`Owl Logo:      ${imageUrls.owl || 'NOT FOUND'}`);
    console.log(`Apply Button:  ${imageUrls.apply || 'NOT FOUND'}`);
    console.log(`Equal Housing: ${imageUrls.equal || 'NOT FOUND'}`);
    console.log('='.repeat(50));

    // Save URLs to file
    const fs = require('fs');
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/ghl-image-urls.json', JSON.stringify(imageUrls, null, 2));
    console.log('\n✅ URLs saved to ghl-image-urls.json');

    // ===== KEEP BROWSER OPEN =====
    console.log('\n📋 MANUAL STEPS:');
    console.log('1. Click each image thumbnail in Media Storage');
    console.log('2. Copy the URL from the details panel');
    console.log('3. Or click the "Copy" button next to each file name');
    console.log('\nBrowser will stay open for 10 minutes.');

    await page.waitForTimeout(600000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/url-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
