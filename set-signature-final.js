const { chromium } = require('playwright');
const fs = require('fs');

// Set the signature in David Young's profile

(async () => {
  console.log('✍️  GHL Signature Setup - Final');
  console.log('='.repeat(50));

  // Read the signature HTML
  const signatureHtml = fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/templates/email-signature-ghl.html', 'utf8');
  console.log('📄 Loaded signature HTML (' + signatureHtml.length + ' chars)\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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

    // ===== NAVIGATE TO SETTINGS → MY STAFF =====
    console.log('📍 Step 3: Going to Settings → My Staff...');

    // Click Settings in sidebar
    await page.click('text=Settings');
    await page.waitForTimeout(3000);

    // Click My Staff
    const myStaff = page.locator('a:has-text("My Staff")');
    if (await myStaff.isVisible({ timeout: 5000 }).catch(() => false)) {
      await myStaff.click();
      console.log('   ✓ Clicked My Staff');
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/my-staff-page.png' });
    console.log('   📸 my-staff-page.png\n');

    // ===== CLICK EDIT ON DAVID YOUNG =====
    console.log('📍 Step 4: Opening David Young\'s profile...');

    // Find the row with David Young and click the edit (pencil) icon
    // The pencil icon is an SVG in the Actions column
    const davidRow = page.locator('tr:has-text("David Young")');
    if (await davidRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click the pencil icon in that row
      const editBtn = davidRow.locator('svg').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        console.log('   ✓ Clicked edit icon');
      } else {
        // Try clicking anywhere in the row
        await davidRow.click();
        console.log('   ✓ Clicked row');
      }
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/edit-user-modal.png' });
    console.log('   📸 edit-user-modal.png\n');

    // ===== FIND SIGNATURE FIELD =====
    console.log('📍 Step 5: Finding Signature field...');

    // Look for "Signature" label and scroll to it if needed
    const signatureLabel = page.locator('text=Signature').first();
    if (await signatureLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signatureLabel.scrollIntoViewIfNeeded();
      console.log('   ✓ Found Signature section');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-section.png' });
    console.log('   📸 signature-section.png\n');

    // ===== INSTRUCTIONS FOR MANUAL PASTE =====
    console.log('='.repeat(50));
    console.log('📋 MANUAL STEPS TO SET SIGNATURE:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. Scroll down to find the "Signature" section');
    console.log('');
    console.log('2. Click the </> (source code) button in the toolbar');
    console.log('   This is CRITICAL - it lets you paste raw HTML');
    console.log('');
    console.log('3. Clear any existing content');
    console.log('');
    console.log('4. Paste the signature HTML from:');
    console.log('   ghl-automation/templates/email-signature-ghl.html');
    console.log('');
    console.log('5. Click "Save" or "Update"');
    console.log('');
    console.log('The signature HTML is in your clipboard!');
    console.log('');
    console.log('Browser will stay open for 10 minutes.');
    console.log('='.repeat(50));

    // Copy signature to clipboard (won't work in headless, but helpful)
    await page.evaluate((html) => {
      navigator.clipboard.writeText(html).catch(() => {});
    }, signatureHtml);

    await page.waitForTimeout(600000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-error.png' });
    await page.waitForTimeout(120000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
