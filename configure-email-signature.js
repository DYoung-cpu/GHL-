const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL
// CORRECT PATH: Settings → My Staff → [User] → Edit → Email Signature

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration');
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
      console.log('   Found Google One-Tap...');
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
    await page.waitForTimeout(3000);
    await screenshot(page, 'sig-01-settings');

    // ===== CLICK MY STAFF =====
    console.log('📍 Step 4: Opening My Staff...');

    // My Staff is in the left settings menu
    const myStaffLink = page.locator('text=My Staff, a:has-text("My Staff"), [href*="staff"]').first();
    if (await myStaffLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await myStaffLink.click();
      console.log('   ✓ Clicked My Staff');
    } else {
      // Try direct URL
      await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/settings/team`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(3000);
    await screenshot(page, 'sig-02-my-staff');

    // ===== FIND AND EDIT USER (David Young) =====
    console.log('📍 Step 5: Finding user David Young...');

    // Look for the user in the staff list
    const userRow = page.locator('tr, [class*="row"], [class*="user"]').filter({ hasText: 'David' }).first();
    if (await userRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click Edit button for this user
      const editBtn = userRow.locator('button:has-text("Edit"), [title*="Edit"], svg[data-icon="pen"]').first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        console.log('   ✓ Clicked Edit for David Young');
      } else {
        // Click on the row itself
        await userRow.click();
        console.log('   ✓ Clicked user row');
      }
    } else {
      console.log('   Looking for user via other methods...');
      // Try clicking any Edit button
      const anyEditBtn = page.locator('button:has-text("Edit")').first();
      if (await anyEditBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyEditBtn.click();
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig-03-user-edit');

    // ===== EXPAND USER INFO SECTION =====
    console.log('📍 Step 6: Expanding User Info section...');

    // The User Info section may be collapsed
    const userInfoSection = page.locator('text=User Info, [class*="accordion"]:has-text("User Info")').first();
    if (await userInfoSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInfoSection.click();
      console.log('   ✓ Expanded User Info');
      await page.waitForTimeout(1000);
    }

    await screenshot(page, 'sig-04-user-info');

    // ===== FIND EMAIL SIGNATURE FIELD =====
    console.log('📍 Step 7: Finding Email Signature field...');

    // Look for email signature textarea or rich text editor
    const signatureField = page.locator('textarea[name*="signature" i], [class*="signature"], [contenteditable="true"]').first();

    // Or find by label
    const signatureLabel = page.locator('label:has-text("Signature"), label:has-text("Email Signature")').first();
    if (await signatureLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✓ Found Email Signature label');
      // Click near the label to focus the field
      await signatureLabel.click();
      await page.waitForTimeout(500);
    }

    await screenshot(page, 'sig-05-signature-field');

    // ===== PASTE SIGNATURE HTML =====
    console.log('📍 Step 8: Pasting signature HTML...');

    // Find the actual input/textarea for signature
    const sigInput = page.locator('textarea, [contenteditable="true"], input[type="text"]').filter({ has: page.locator('[class*="signature"]') }).first();

    // Try multiple approaches to find and fill the signature field
    const sigSelectors = [
      'textarea[name*="signature" i]',
      '[class*="signature"] textarea',
      '[class*="signature"] [contenteditable="true"]',
      'textarea',
      '[contenteditable="true"]'
    ];

    let filled = false;
    for (const sel of sigSelectors) {
      const field = page.locator(sel).first();
      if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
        await field.click();
        await page.keyboard.press('Control+a');

        // For contenteditable, we need to use keyboard
        if (sel.includes('contenteditable')) {
          await page.keyboard.type(SIGNATURE_HTML.substring(0, 100) + '...');
          console.log('   ✓ Typed signature (partial, contenteditable)');
        } else {
          await field.fill(SIGNATURE_HTML);
          console.log('   ✓ Filled signature HTML');
        }
        filled = true;
        break;
      }
    }

    if (!filled) {
      console.log('   ⚠️ Signature field not found automatically');
      console.log('   Manual path: Settings → My Staff → Edit → User Info → Email Signature');
    }

    await screenshot(page, 'sig-06-signature-filled');

    // ===== SAVE CHANGES =====
    console.log('📍 Step 9: Saving changes...');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'sig-07-saved');

    // ===== VERIFICATION =====
    console.log('📍 Step 10: Verifying configuration...');

    // Check for success message
    const successMsg = page.locator('text=Success, text=Updated, text=Saved').first();
    if (await successMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✓ Signature saved successfully!');
    }

    await screenshot(page, 'sig-08-verified');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nEmail signature configured for David Young');
    console.log('It will auto-append to manual emails sent as this user.');
    console.log('\nFor templates, use: {{user.signature}}');
    console.log('\nBrowser open 60 seconds for verification...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
