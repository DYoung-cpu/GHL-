const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V4
// Use sidebar navigation instead of direct URL

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V4');
  console.log('='.repeat(50));
  console.log('Path: Settings → My Staff (sidebar click) → Edit → Email Signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600
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

    // ===== NAVIGATE TO SETTINGS VIA SIDEBAR =====
    console.log('📍 Step 3: Clicking Settings in main sidebar...');

    // Click Settings in main nav (bottom of sidebar usually)
    await page.click('text=Settings');
    await page.waitForTimeout(5000);
    await screenshot(page, 'sig4-01-settings');

    // ===== CLICK MY STAFF IN SETTINGS SIDEBAR =====
    console.log('📍 Step 4: Clicking My Staff in settings sidebar...');

    // The settings page has a secondary sidebar with: Business Profile, My Profile, Billing, My Staff...
    // We need to click "My Staff" - try multiple approaches

    // Approach 1: Click text "My Staff"
    const myStaffOptions = [
      page.locator('a:has-text("My Staff")').first(),
      page.locator('text=My Staff').first(),
      page.locator('[href*="team"]').first(),
      page.locator('nav a, aside a').filter({ hasText: 'My Staff' }).first()
    ];

    let clicked = false;
    for (const option of myStaffOptions) {
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        console.log('   ✓ Clicked My Staff');
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Approach 2: Use coordinates based on screenshot - My Staff is 4th item in sidebar
      // From screenshot: sidebar left edge ~20px, My Staff at y ~420px
      console.log('   Trying coordinate click for My Staff...');
      await page.mouse.click(80, 418);
    }

    await page.waitForTimeout(5000);
    await screenshot(page, 'sig4-02-my-staff');

    // ===== LOOK FOR TEAM/USER LIST =====
    console.log('📍 Step 5: Looking for user list...');

    // Check if we're on the team/staff page
    const pageTitle = await page.locator('h1, h2, [class*="title"]').first().textContent().catch(() => '');
    console.log(`   Page title: "${pageTitle}"`);

    // Wait for user list to load
    await page.waitForTimeout(3000);
    await screenshot(page, 'sig4-03-user-list');

    // ===== FIND AND CLICK ON USER =====
    console.log('📍 Step 6: Looking for David Young user...');

    // Look for David or the email
    const davidFound = await page.locator('text=David, text=david@').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`   David visible: ${davidFound}`);

    // Try clicking on a row containing David
    if (davidFound) {
      // Look for an actions button (three dots, edit, etc) in David's row
      const davidRow = page.locator('tr, [class*="row"], [class*="card"], [class*="item"]').filter({ hasText: /david/i }).first();

      if (await davidRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try to find edit/actions button
        const actionsBtn = davidRow.locator('button, [class*="action"], [class*="menu"], svg').first();
        if (await actionsBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await actionsBtn.click();
          console.log('   ✓ Clicked actions on David row');
        } else {
          // Just click the row
          await davidRow.click();
          console.log('   ✓ Clicked David row');
        }
      }
    } else {
      // Try clicking first user row
      const firstRow = page.locator('tbody tr, [class*="user-row"], [class*="team-member"]').first();
      if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstRow.click();
        console.log('   ✓ Clicked first user row');
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig4-04-after-user-click');

    // ===== CHECK FOR DROPDOWN MENU =====
    console.log('📍 Step 7: Looking for Edit option in dropdown...');

    const editOption = page.locator('text=Edit, [role="menuitem"]:has-text("Edit")').first();
    if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editOption.click();
      console.log('   ✓ Clicked Edit in dropdown');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'sig4-05-edit-form');

    // ===== LOOK FOR USER INFO EXPANDABLE SECTION =====
    console.log('📍 Step 8: Looking for User Info section...');

    // In GHL, user edit often has expandable sections
    const userInfoSection = page.locator('text=User Info').first();
    if (await userInfoSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInfoSection.click();
      console.log('   ✓ Clicked User Info to expand');
      await page.waitForTimeout(1000);
    }

    // ===== SCROLL TO FIND EMAIL SIGNATURE =====
    console.log('📍 Step 9: Scrolling to find Email Signature...');

    for (let i = 0; i < 10; i++) {
      const sigLabel = page.locator('text=Email Signature, label:has-text("Signature")').first();
      if (await sigLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature field');
        break;
      }
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(400);
    }

    await screenshot(page, 'sig4-06-signature-area');

    // ===== FILL SIGNATURE =====
    console.log('📍 Step 10: Filling Email Signature...');

    // Try to find and fill the signature textarea
    const signatureField = page.locator('textarea').first();
    if (await signatureField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signatureField.click();
      await page.keyboard.press('Control+a');
      await signatureField.fill(SIGNATURE_HTML);
      console.log('   ✓ Filled signature textarea');
    } else {
      // Try content editable
      const editableField = page.locator('[contenteditable="true"], .ql-editor').first();
      if (await editableField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editableField.click();
        await page.keyboard.press('Control+a');
        await editableField.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled content editable field');
      } else {
        console.log('   ⚠️ Could not find signature field');
      }
    }

    await screenshot(page, 'sig4-07-signature-filled');

    // ===== SAVE =====
    console.log('📍 Step 11: Saving...');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig4-08-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser staying open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig4-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
