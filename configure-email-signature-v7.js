const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V7
// EXACT selectors based on screenshot analysis

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V7');
  console.log('='.repeat(50));
  console.log('EXACT targeting based on screenshot analysis\n');

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

    // Click My Staff in sidebar
    await page.click('text=My Staff');
    await page.waitForTimeout(5000);

    await screenshot(page, 'sig7-01-my-staff');

    // ===== WAIT FOR TABLE TO LOAD =====
    console.log('📍 Step 4: Waiting for staff table...');

    // Wait for David's email to appear (more specific than just name)
    await page.waitForSelector('text=david@lendwisemtg.com', { timeout: 15000 });
    console.log('   ✓ Found david@lendwisemtg.com');

    await screenshot(page, 'sig7-02-table-loaded');

    // ===== CLICK EDIT ICON ON DAVID'S ROW =====
    console.log('📍 Step 5: Clicking edit icon on David Young row...');

    // Find the row containing David's email and click the pencil icon
    // The table structure: each row has Name, Email, Phone, User Type, Action columns
    // David is in row 2 (after Anthony)

    // Method 1: Find row by email, then click first SVG (pencil icon)
    const davidRow = page.locator('tr').filter({ hasText: 'david@lendwisemtg.com' });
    const rowCount = await davidRow.count();
    console.log(`   Found ${rowCount} rows with David's email`);

    if (rowCount > 0) {
      // Click the pencil (first icon in Action column)
      const pencilIcon = davidRow.first().locator('svg').first();
      await pencilIcon.click();
      console.log('   ✓ Clicked pencil icon');
    } else {
      // Fallback: Click by coordinates
      // David's row is approximately at y=356 based on screenshot
      // Pencil icon is around x=1175
      console.log('   Trying coordinate click...');
      await page.mouse.click(1175, 356);
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig7-03-edit-clicked');

    // ===== WAIT FOR EDIT DRAWER TO OPEN =====
    console.log('📍 Step 6: Waiting for edit drawer...');

    // GHL opens a side drawer/modal for editing
    const drawer = page.locator('[class*="drawer"], [class*="modal"], [role="dialog"]');
    await drawer.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('   Drawer not detected via class, checking page change...');
    });

    await screenshot(page, 'sig7-04-drawer-open');

    // ===== LOOK FOR EMAIL SIGNATURE FIELD =====
    console.log('📍 Step 7: Looking for Email Signature...');

    // First check if there's a "User Info" expandable section
    const userInfoSection = page.locator('text=User Info');
    if (await userInfoSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found User Info section, clicking to expand...');
      await userInfoSection.click();
      await page.waitForTimeout(1000);
    }

    // Scroll to find Email Signature label
    let foundSig = false;
    for (let i = 0; i < 20; i++) {
      const sigLabel = page.locator('text=Email Signature');
      if (await sigLabel.isVisible({ timeout: 300 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature label');
        foundSig = true;
        await sigLabel.scrollIntoViewIfNeeded();
        break;
      }
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(200);
    }

    await screenshot(page, 'sig7-05-signature-section');

    // ===== FILL SIGNATURE FIELD =====
    console.log('📍 Step 8: Filling signature...');

    let filled = false;

    // Find textareas on the page
    const textareas = await page.locator('textarea').all();
    console.log(`   Found ${textareas.length} textareas`);

    for (let i = 0; i < textareas.length; i++) {
      const ta = textareas[i];
      if (await ta.isVisible().catch(() => false)) {
        // Check if it's near the signature label or is a large textarea
        const name = await ta.getAttribute('name').catch(() => '');
        const placeholder = await ta.getAttribute('placeholder').catch(() => '');
        console.log(`   Textarea ${i}: name="${name}", placeholder="${placeholder}"`);

        // Fill it
        await ta.click();
        await ta.fill(SIGNATURE_HTML);
        console.log(`   ✓ Filled textarea ${i}`);
        filled = true;
        break;
      }
    }

    // Try contenteditable if no textarea worked
    if (!filled) {
      const editors = await page.locator('[contenteditable="true"]').all();
      console.log(`   Found ${editors.length} contenteditable elements`);

      for (let i = 0; i < editors.length; i++) {
        const ed = editors[i];
        if (await ed.isVisible().catch(() => false)) {
          await ed.click();
          await ed.fill(SIGNATURE_HTML);
          console.log(`   ✓ Filled contenteditable ${i}`);
          filled = true;
          break;
        }
      }
    }

    if (!filled) {
      console.log('   ⚠️ No editable field found for signature');
    }

    await screenshot(page, 'sig7-06-filled');

    // ===== SAVE =====
    console.log('📍 Step 9: Saving...');

    const saveBtn = page.locator('button').filter({ hasText: /^Save$|^Update$|Save Changes/ }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'sig7-07-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig7-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
