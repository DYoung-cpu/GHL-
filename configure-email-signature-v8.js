const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V8
// Use direct coordinate clicks based on known UI positions

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V8');
  console.log('='.repeat(50));
  console.log('Using coordinate clicks for reliability\n');

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

    await screenshot(page, 'sig8-01-my-staff');

    // ===== CLICK DAVID'S EDIT ICON BY COORDINATE =====
    console.log('📍 Step 4: Clicking edit pencil on David Young row...');

    // From screenshot analysis:
    // - David Young row is at y ≈ 356
    // - Pencil icon (first in Action column) is at x ≈ 1175
    // Viewport is 1400x900

    // First wait a moment for table to fully render
    await page.waitForTimeout(2000);

    // Click the pencil icon for David Young (second row)
    // Row positions: Anthony ~285, David ~356
    await page.mouse.click(1175, 356);
    console.log('   ✓ Clicked at (1175, 356) - David edit icon');

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig8-02-after-edit-click');

    // ===== CHECK IF EDIT DRAWER OPENED =====
    console.log('📍 Step 5: Checking for edit drawer...');

    // Look for any new content that appeared
    const pageContent = await page.content();
    const hasDrawer = pageContent.includes('drawer') || pageContent.includes('modal');
    console.log(`   Has drawer/modal in DOM: ${hasDrawer}`);

    // Check if URL changed (edit mode often changes URL)
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    await screenshot(page, 'sig8-03-drawer-state');

    // ===== LOOK FOR EMAIL SIGNATURE =====
    console.log('📍 Step 6: Looking for Email Signature...');

    // First check for expandable User Info section
    const userInfoTexts = await page.locator('text=User Info').all();
    console.log(`   Found ${userInfoTexts.length} "User Info" elements`);

    if (userInfoTexts.length > 0) {
      for (const el of userInfoTexts) {
        if (await el.isVisible().catch(() => false)) {
          await el.click();
          console.log('   ✓ Clicked User Info to expand');
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    // Scroll to find Email Signature
    let foundSignature = false;
    for (let i = 0; i < 25; i++) {
      const sigElements = await page.locator('text=Email Signature').all();
      for (const el of sigElements) {
        if (await el.isVisible().catch(() => false)) {
          console.log('   ✓ Found visible "Email Signature" label');
          foundSignature = true;
          break;
        }
      }
      if (foundSignature) break;
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(150);
    }

    await screenshot(page, 'sig8-04-signature-area');

    // ===== FILL SIGNATURE =====
    console.log('📍 Step 7: Filling signature...');

    let filled = false;

    // Try all textareas (use .all() to get array)
    const textareas = await page.locator('textarea').all();
    console.log(`   Found ${textareas.length} textareas`);

    for (let i = 0; i < textareas.length; i++) {
      const ta = textareas[i];
      try {
        // Force interaction even if "hidden"
        await ta.scrollIntoViewIfNeeded({ timeout: 1000 });
        await ta.click({ force: true });
        await ta.fill(SIGNATURE_HTML);
        console.log(`   ✓ Filled textarea ${i}`);
        filled = true;
        break;
      } catch (e) {
        console.log(`   Textarea ${i} failed: ${e.message.split('\n')[0]}`);
      }
    }

    // Try contenteditable
    if (!filled) {
      const editors = await page.locator('[contenteditable="true"]').all();
      console.log(`   Found ${editors.length} contenteditable elements`);

      for (let i = 0; i < editors.length; i++) {
        const ed = editors[i];
        try {
          await ed.scrollIntoViewIfNeeded({ timeout: 1000 });
          await ed.click({ force: true });
          await ed.fill(SIGNATURE_HTML);
          console.log(`   ✓ Filled contenteditable ${i}`);
          filled = true;
          break;
        } catch (e) {
          console.log(`   Contenteditable ${i} failed: ${e.message.split('\n')[0]}`);
        }
      }
    }

    if (!filled) {
      console.log('   ⚠️ No editable field found');
    }

    await screenshot(page, 'sig8-05-filled');

    // ===== SAVE =====
    console.log('📍 Step 8: Saving...');

    const saveButtons = await page.locator('button').all();
    for (const btn of saveButtons) {
      const text = await btn.textContent().catch(() => '');
      if (/save|update/i.test(text)) {
        try {
          await btn.click({ force: true });
          console.log(`   ✓ Clicked "${text.trim()}" button`);
          break;
        } catch (e) {
          console.log(`   Button click failed: ${e.message.split('\n')[0]}`);
        }
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig8-06-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig8-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
