const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V6
// FIX: Click "My Staff" (not "Team") in sidebar

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V6');
  console.log('='.repeat(50));
  console.log('Path: Settings → My Staff → Edit David → Email Signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 700
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

    // ===== NAVIGATE TO SETTINGS =====
    console.log('📍 Step 3: Clicking Settings...');
    await page.click('text=Settings');
    await page.waitForTimeout(4000);
    await screenshot(page, 'sig6-01-settings');

    // ===== CLICK "My Staff" IN SIDEBAR =====
    console.log('📍 Step 4: Clicking "My Staff" in sidebar...');

    // The sidebar shows "My Staff" text - click it
    // It's under MY BUSINESS section in the settings sidebar
    const myStaffLink = page.locator('text=My Staff').first();

    if (await myStaffLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await myStaffLink.click();
      console.log('   ✓ Clicked "My Staff"');
    } else {
      console.log('   "My Staff" not visible, trying scroll...');
      // Try scrolling sidebar to find it
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(500);
      const myStaff2 = page.locator('text=My Staff').first();
      if (await myStaff2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await myStaff2.click();
        console.log('   ✓ Clicked "My Staff" after scroll');
      }
    }

    await page.waitForTimeout(5000);
    await screenshot(page, 'sig6-02-my-staff-page');

    // ===== VERIFY WE'RE ON TEAM PAGE =====
    console.log('📍 Step 5: Verifying Team page loaded...');

    // Check URL or page content
    const url = page.url();
    console.log(`   Current URL: ${url}`);

    // Check if we see "David Young" or the table
    const hasDavid = await page.locator('text=David Young').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   "David Young" visible: ${hasDavid}`);

    await screenshot(page, 'sig6-03-team-list');

    // ===== CLICK EDIT ICON ON DAVID'S ROW =====
    console.log('📍 Step 6: Clicking edit icon on David Young...');

    if (hasDavid) {
      // Find the row with David Young
      const davidRow = page.locator('tr').filter({ hasText: 'David Young' }).first();

      if (await davidRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // The edit icon is an SVG (pencil) in the last column
        // From screenshot: Action column has pencil and trash icons
        const editPencil = davidRow.locator('svg, [class*="edit"], button').first();

        if (await editPencil.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editPencil.click();
          console.log('   ✓ Clicked edit icon');
        } else {
          // Fallback: click the row itself
          await davidRow.click();
          console.log('   ✓ Clicked row (fallback)');
        }
      }
    } else {
      // Alternative: find any edit icon and click
      console.log('   Trying to find any edit icon...');
      const anyPencil = page.locator('svg[data-icon="pen"], svg[data-icon="edit"], [title="Edit"]').first();
      if (await anyPencil.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyPencil.click();
        console.log('   ✓ Clicked first edit icon');
      }
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig6-04-edit-drawer');

    // ===== CHECK FOR EDIT MODAL/DRAWER =====
    console.log('📍 Step 7: Looking for edit form...');

    // GHL uses n-drawer class for side panels
    const drawer = page.locator('.n-drawer, [class*="drawer"], [role="dialog"]').first();
    const isDrawerOpen = await drawer.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   Drawer open: ${isDrawerOpen}`);

    // ===== LOOK FOR USER INFO / SIGNATURE =====
    console.log('📍 Step 8: Looking for Email Signature field...');

    // Check for "User Info" expandable section
    const userInfo = page.locator('text=User Info').first();
    if (await userInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInfo.click();
      console.log('   ✓ Expanded User Info section');
      await page.waitForTimeout(1000);
    }

    // Scroll to find Email Signature
    let foundSignature = false;
    for (let i = 0; i < 15; i++) {
      const sigLabel = page.locator('text=Email Signature').first();
      if (await sigLabel.isVisible({ timeout: 300 }).catch(() => false)) {
        console.log('   ✓ Found "Email Signature" label');
        foundSignature = true;
        break;
      }

      // Scroll within drawer if open
      if (isDrawerOpen) {
        await drawer.evaluate(el => el.scrollTop += 100);
      } else {
        await page.mouse.wheel(0, 100);
      }
      await page.waitForTimeout(200);
    }

    await screenshot(page, 'sig6-05-signature-area');

    // ===== FILL SIGNATURE =====
    console.log('📍 Step 9: Filling Email Signature...');

    let filled = false;

    // Try textarea
    const textareas = page.locator('textarea');
    const taCount = await textareas.count();
    console.log(`   Found ${taCount} textareas`);

    for (let i = 0; i < taCount; i++) {
      const ta = textareas.nth(i);
      if (await ta.isVisible({ timeout: 500 }).catch(() => false)) {
        const name = await ta.getAttribute('name').catch(() => '');
        const id = await ta.getAttribute('id').catch(() => '');
        console.log(`   Textarea ${i}: name="${name}", id="${id}"`);

        // Fill any visible textarea (signature should be the main one)
        await ta.click();
        await page.keyboard.press('Control+a');
        await ta.fill(SIGNATURE_HTML);
        console.log(`   ✓ Filled textarea ${i}`);
        filled = true;
        break;
      }
    }

    // Try content editable
    if (!filled) {
      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editor.click();
        await page.keyboard.press('Control+a');
        await editor.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled contenteditable');
        filled = true;
      }
    }

    if (!filled) {
      console.log('   ⚠️ Could not find signature field');
    }

    await screenshot(page, 'sig6-06-filled');

    // ===== SAVE =====
    console.log('📍 Step 10: Saving...');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig6-07-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds for verification...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig6-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
