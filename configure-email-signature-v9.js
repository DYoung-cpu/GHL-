const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V9
// Use DOM traversal and force clicks

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V9');
  console.log('='.repeat(50));
  console.log('DOM traversal + force clicks\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
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

    await page.waitForSelector('text=LENDWISE', { timeout: 30000 }).catch(() => null);
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
    await page.click('text=Settings');
    await page.waitForTimeout(4000);
    await page.click('text=My Staff');
    await page.waitForTimeout(6000);
    await screenshot(page, 'sig9-01-my-staff');

    // ===== FIND DAVID'S ROW AND CLICK EDIT =====
    console.log('📍 Step 4: Finding David Young row...');

    // Method 1: Find by email and traverse to parent row, then find SVG
    const davidEmail = page.locator('text=david@lendwisemtg.com');
    const emailCount = await davidEmail.count();
    console.log(`   Found ${emailCount} elements with David's email`);

    if (emailCount > 0) {
      // Get the bounding box of David's email to estimate row position
      const emailBox = await davidEmail.first().boundingBox();
      if (emailBox) {
        console.log(`   David's email at y=${emailBox.y}`);

        // The pencil icon should be at x≈1175 on the same row
        // Click at that position
        const pencilX = 1175;
        const pencilY = emailBox.y + 10; // Middle of the row

        console.log(`   Clicking pencil at (${pencilX}, ${pencilY})`);
        await page.mouse.click(pencilX, pencilY);
      }
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig9-02-after-click');

    // ===== CHECK FOR DRAWER =====
    console.log('📍 Step 5: Checking for edit drawer...');

    // Wait for drawer to appear
    let drawerFound = false;

    // Method 1: Check for n-drawer class (Naive UI framework)
    const nDrawer = page.locator('.n-drawer, .n-drawer-body-wrapper');
    if (await nDrawer.count() > 0) {
      console.log('   ✓ Found n-drawer element');
      drawerFound = true;
    }

    // Method 2: Check for any new overlay/modal
    const overlays = page.locator('[class*="drawer"], [class*="modal"], [class*="overlay"]');
    const overlayCount = await overlays.count();
    console.log(`   Found ${overlayCount} drawer/modal/overlay elements`);

    await screenshot(page, 'sig9-03-drawer-check');

    // ===== IF NO DRAWER, TRY CLICKING THE ROW DIRECTLY =====
    if (!drawerFound && overlayCount === 0) {
      console.log('   Drawer not found, trying to click the row directly...');

      // Try clicking anywhere on David's row to select it
      const davidEmail2 = page.locator('text=david@lendwisemtg.com').first();
      await davidEmail2.click({ force: true });
      await page.waitForTimeout(2000);

      await screenshot(page, 'sig9-03b-after-row-click');
    }

    // ===== LOOK FOR EMAIL SIGNATURE =====
    console.log('📍 Step 6: Looking for Email Signature...');

    // Try to find and expand User Info section
    const userInfoExpander = page.locator('text=User Info').first();
    if (await userInfoExpander.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInfoExpander.click({ force: true });
      console.log('   ✓ Clicked User Info');
      await page.waitForTimeout(1000);
    }

    // Scroll to find Email Signature
    for (let i = 0; i < 30; i++) {
      const sigLabel = page.locator('text=Email Signature').first();
      if (await sigLabel.isVisible({ timeout: 200 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature');
        break;
      }
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(100);
    }

    await screenshot(page, 'sig9-04-signature-area');

    // ===== FILL SIGNATURE =====
    console.log('📍 Step 7: Filling signature...');

    let filled = false;

    // Get all textareas and try filling each
    const allTextareas = await page.$$('textarea');
    console.log(`   Found ${allTextareas.length} textareas via $$`);

    for (let i = 0; i < allTextareas.length; i++) {
      try {
        await allTextareas[i].scrollIntoViewIfNeeded();
        await allTextareas[i].click({ force: true });
        await allTextareas[i].fill(SIGNATURE_HTML);
        console.log(`   ✓ Filled textarea ${i}`);
        filled = true;
        break;
      } catch (e) {
        // Skip
      }
    }

    // Try contenteditable
    if (!filled) {
      const allEditable = await page.$$('[contenteditable="true"]');
      console.log(`   Found ${allEditable.length} contenteditable via $$`);

      for (let i = 0; i < allEditable.length; i++) {
        try {
          await allEditable[i].scrollIntoViewIfNeeded();
          await allEditable[i].click({ force: true });
          await allEditable[i].fill(SIGNATURE_HTML);
          console.log(`   ✓ Filled contenteditable ${i}`);
          filled = true;
          break;
        } catch (e) {
          // Skip
        }
      }
    }

    if (!filled) {
      console.log('   ⚠️ No editable field found');
    }

    await screenshot(page, 'sig9-05-filled');

    // ===== SAVE =====
    console.log('📍 Step 8: Saving...');

    // Find and click save button
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '');
      if (/^save$/i.test(text.trim()) || /^update$/i.test(text.trim())) {
        try {
          await btn.click({ force: true });
          console.log(`   ✓ Clicked "${text.trim()}"`);
          break;
        } catch (e) {
          // Skip
        }
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig9-06-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig9-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
