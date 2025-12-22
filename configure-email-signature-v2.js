const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V2
// PATH: Settings → My Staff (in left sidebar) → Edit User → Email Signature

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V2');
  console.log('='.repeat(50));
  console.log('Path: Settings → My Staff → Edit → Email Signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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

    // ===== NAVIGATE TO SETTINGS =====
    console.log('📍 Step 3: Navigating to Settings...');
    await page.click('text=Settings');
    await page.waitForTimeout(4000);
    await screenshot(page, 'sig2-01-settings');

    // ===== CLICK MY STAFF IN LEFT SIDEBAR =====
    console.log('📍 Step 4: Clicking My Staff in sidebar...');

    // The sidebar shows: Business Profile, My Profile, Billing, My Staff...
    // Need to click "My Staff" link
    const myStaffLink = page.locator('a:has-text("My Staff"), text=My Staff').first();
    if (await myStaffLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await myStaffLink.click();
      console.log('   ✓ Clicked My Staff');
    } else {
      // Try direct URL navigation
      console.log('   Trying direct URL...');
      await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/settings/team`, {
        waitUntil: 'domcontentloaded'
      });
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig2-02-my-staff');

    // ===== FIND USER AND CLICK EDIT =====
    console.log('📍 Step 5: Finding David Young and clicking Edit...');

    // Wait for the staff list to load
    await page.waitForSelector('text=David, text=david@', { timeout: 10000 }).catch(() => null);

    // Look for the user row and its Edit button
    // The user might be listed as "David Young" or just show email "david@lendwisemtg.com"
    const userRow = page.locator('tr, [class*="row"], [class*="list-item"]').filter({ hasText: /david/i }).first();

    if (await userRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Find Edit button or three-dot menu in this row
      const editBtn = userRow.locator('button, a').filter({ hasText: /edit/i }).first();
      const menuBtn = userRow.locator('svg[data-icon="ellipsis-vertical"], [class*="menu"], button:has(svg)').first();

      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        console.log('   ✓ Clicked Edit button');
      } else if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuBtn.click();
        console.log('   ✓ Clicked menu button');
        await page.waitForTimeout(1000);

        // Click Edit in the dropdown
        const editOption = page.locator('text=Edit, [role="menuitem"]:has-text("Edit")').first();
        if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editOption.click();
          console.log('   ✓ Clicked Edit option');
        }
      } else {
        // Just click the row itself
        await userRow.click();
        console.log('   ✓ Clicked user row');
      }
    } else {
      console.log('   User row not found, looking for Edit button directly...');
      const anyEditBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      if (await anyEditBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyEditBtn.click();
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig2-03-edit-user');

    // ===== SCROLL TO FIND EMAIL SIGNATURE SECTION =====
    console.log('📍 Step 6: Looking for Email Signature field...');

    // The Edit User form might be in a modal or new page
    // Look for "User Info" section or directly for "Email Signature" label

    // Try scrolling down to find signature field
    for (let i = 0; i < 5; i++) {
      // Check if we can see "Signature" text
      const signatureLabel = page.locator('text=Signature, label:has-text("Signature")').first();
      if (await signatureLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature section');
        break;
      }

      // Scroll down
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(500);
    }

    await screenshot(page, 'sig2-04-signature-section');

    // ===== FIND AND FILL SIGNATURE FIELD =====
    console.log('📍 Step 7: Filling Email Signature field...');

    // The signature field could be a textarea, rich text editor, or code editor
    // Based on GHL docs, it should accept HTML

    // Try to find textarea or text input near "Signature" label
    const signatureInputs = [
      'textarea[name*="signature" i]',
      'textarea[id*="signature" i]',
      '[class*="signature"] textarea',
      '[class*="signature"] [contenteditable="true"]',
      'textarea',
      '[contenteditable="true"]'
    ];

    let signatureFilled = false;

    for (const selector of signatureInputs) {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
        await field.click();
        await page.waitForTimeout(300);

        // Clear existing content
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);

        // Paste signature HTML
        await page.keyboard.type(SIGNATURE_HTML, { delay: 1 });
        console.log('   ✓ Filled signature field');
        signatureFilled = true;
        break;
      }
    }

    if (!signatureFilled) {
      // Try finding by clicking near the label
      const sigLabel = page.locator('text=Email Signature, label:has-text("Signature")').first();
      if (await sigLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click below the label to focus the input
        const box = await sigLabel.boundingBox();
        if (box) {
          await page.mouse.click(box.x + 100, box.y + 50);
          await page.waitForTimeout(500);
          await page.keyboard.press('Control+a');
          await page.keyboard.type(SIGNATURE_HTML.substring(0, 1000), { delay: 1 });
          console.log('   ✓ Typed signature (coordinate click)');
          signatureFilled = true;
        }
      }
    }

    if (!signatureFilled) {
      console.log('   ⚠️ Could not find signature field automatically');
      console.log('   Please manually paste signature at:');
      console.log('   Settings → My Staff → Edit → Email Signature');
    }

    await screenshot(page, 'sig2-05-signature-filled');

    // ===== SAVE CHANGES =====
    console.log('📍 Step 8: Saving changes...');

    // Look for Save/Update button
    const saveButtons = [
      'button:has-text("Save")',
      'button:has-text("Update")',
      'button[type="submit"]',
      'button:has-text("Save Changes")'
    ];

    for (const selector of saveButtons) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log('   ✓ Clicked Save');
        break;
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig2-06-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nSignature HTML location: templates/email-signature.html');
    console.log('GHL path: Settings → My Staff → Edit → Email Signature');
    console.log('\nBrowser open 90 seconds for manual verification...\n');

    await page.waitForTimeout(90000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig2-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
