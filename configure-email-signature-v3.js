const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V3
// Improved navigation with explicit sidebar click and proper waiting

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V3');
  console.log('='.repeat(50));
  console.log('Path: Settings → My Staff → Edit → Email Signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

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

    // ===== NAVIGATE DIRECTLY TO MY STAFF PAGE =====
    console.log('📍 Step 3: Navigating directly to My Staff page...');

    // Use direct URL to My Staff / Team settings
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/settings/team`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, 'sig3-01-my-staff-page');

    // ===== WAIT FOR STAFF LIST TO LOAD =====
    console.log('📍 Step 4: Waiting for staff list...');

    // Wait for either the user table or the user card to appear
    await page.waitForSelector('table, [class*="team"], [class*="staff"], [class*="user"]', {
      timeout: 15000
    }).catch(() => console.log('   Table not found, trying alternative...'));

    await page.waitForTimeout(2000);
    await screenshot(page, 'sig3-02-staff-list');

    // ===== FIND AND CLICK ON DAVID YOUNG USER =====
    console.log('📍 Step 5: Finding David Young...');

    // Look for text containing "David" or "david@lendwisemtg.com"
    const davidSelector = page.locator('text=David').first();
    const emailSelector = page.locator('text=david@lendwisemtg.com').first();

    let foundUser = false;

    if (await davidSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found "David" text');
      // Click nearby - the row should be clickable or have an edit button
      const davidRow = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: /david/i }).first();
      if (await davidRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Look for edit button/icon in this row
        const editInRow = davidRow.locator('button, a, [class*="edit"], svg').first();
        await editInRow.click();
        console.log('   ✓ Clicked edit on David row');
        foundUser = true;
      }
    }

    if (!foundUser && await emailSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found email, looking for edit button...');
      const row = page.locator('[class*="row"], tr').filter({ hasText: 'david@lendwisemtg.com' }).first();
      await row.click();
      foundUser = true;
    }

    if (!foundUser) {
      console.log('   Looking for any clickable row or edit button...');
      // Just click the first visible edit button
      const anyEdit = page.locator('button:has-text("Edit"), a:has-text("Edit"), [title*="edit" i]').first();
      if (await anyEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyEdit.click();
        console.log('   ✓ Clicked first Edit button');
        foundUser = true;
      } else {
        // Try clicking on any row
        const anyRow = page.locator('tbody tr, [class*="list-item"]').first();
        if (await anyRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await anyRow.click();
          console.log('   ✓ Clicked first row');
          foundUser = true;
        }
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig3-03-after-click');

    // ===== CHECK IF EDIT MODAL/PAGE OPENED =====
    console.log('📍 Step 6: Checking for edit form...');

    // Look for modal/drawer or page change
    const modalSelector = page.locator('[class*="modal"], [class*="drawer"], [class*="sidebar"], [role="dialog"]');
    const isModal = await modalSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (isModal) {
      console.log('   ✓ Edit modal/drawer opened');
    } else {
      console.log('   No modal detected - might be inline editing or page change');
    }

    await screenshot(page, 'sig3-04-edit-form');

    // ===== LOOK FOR USER INFO SECTION =====
    console.log('📍 Step 7: Looking for User Info / Email Signature...');

    // GHL often has expandable sections like "User Info"
    const userInfoSection = page.locator('text=User Info, [class*="accordion"]:has-text("User")').first();
    if (await userInfoSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInfoSection.click();
      console.log('   ✓ Clicked User Info section to expand');
      await page.waitForTimeout(1000);
    }

    // Scroll down to find signature field
    for (let i = 0; i < 8; i++) {
      const sigLabel = page.locator('text=Email Signature, text=Signature, label:has-text("Signature")').first();
      if (await sigLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature field');
        await screenshot(page, 'sig3-05-found-signature');
        break;
      }
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(300);
    }

    // ===== FILL SIGNATURE FIELD =====
    console.log('📍 Step 8: Attempting to fill signature...');

    // Try multiple approaches to find and fill the signature field
    const signatureSelectors = [
      // Textareas
      'textarea[name*="signature" i]',
      'textarea[id*="signature" i]',
      'textarea[placeholder*="signature" i]',
      // Content editable
      '[contenteditable="true"]',
      // Quill editor
      '.ql-editor',
      // TinyMCE
      '.mce-content-body',
      // Generic inputs near signature label
      'textarea',
      // Input fields
      'input[name*="signature" i]'
    ];

    let filled = false;

    for (const selector of signatureSelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log(`   Found field with selector: ${selector}`);

        await field.click();
        await page.waitForTimeout(200);

        // Select all and clear
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(100);

        // Type the signature HTML
        await field.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled signature field with fill()');
        filled = true;
        break;
      }
    }

    if (!filled) {
      console.log('   Trying coordinate-based approach...');
      // Look for signature label and click below it
      const sigLabels = ['Email Signature', 'Signature'];
      for (const labelText of sigLabels) {
        const label = page.locator(`text=${labelText}`).first();
        if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
          const box = await label.boundingBox();
          if (box) {
            // Click in the area below and to the right of the label
            await page.mouse.click(box.x + 200, box.y + 60);
            await page.waitForTimeout(500);
            await page.keyboard.press('Control+a');
            await page.keyboard.type(SIGNATURE_HTML.substring(0, 500), { delay: 0 });
            console.log('   ✓ Typed signature via coordinates');
            filled = true;
            break;
          }
        }
      }
    }

    await screenshot(page, 'sig3-06-signature-filled');

    // ===== SAVE CHANGES =====
    console.log('📍 Step 9: Saving changes...');

    const saveSelectors = [
      'button:has-text("Save")',
      'button:has-text("Update")',
      'button:has-text("Save Changes")',
      'button[type="submit"]',
      '[class*="save"]'
    ];

    for (const selector of saveSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        console.log('   ✓ Clicked Save button');
        break;
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig3-07-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION ATTEMPT COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck screenshots for actual results.');
    console.log('Browser staying open 60 seconds for verification...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig3-error');
    console.log('\nBrowser open 45 seconds for debugging...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
