const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V15
// SIMPLE: Just use hardcoded coordinates from screenshot
// David's pencil icon is at approximately (1171, 356) in 1400x900 viewport

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V15');
  console.log('='.repeat(50));
  console.log('Using hardcoded coordinates from screenshot\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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
    await page.waitForTimeout(8000); // Extra wait for table to load
    await screenshot(page, 'sig15-01-my-staff');

    // ===== CLICK PENCIL ICON - HARDCODED COORDINATES =====
    console.log('📍 Step 4: Clicking pencil icon at (1171, 356)...');

    // From screenshots, David Young row is at approximately y=356
    // The pencil icon (first in Action column) is at approximately x=1171

    // Click the pencil icon
    await page.mouse.click(1171, 356);
    console.log('   ✓ Clicked at (1171, 356)');
    await page.waitForTimeout(3000);
    await screenshot(page, 'sig15-02-after-click');

    // Check if drawer opened by looking for User Info tab
    let drawerOpened = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`   Drawer opened (User Info visible): ${drawerOpened}`);

    // If not, try clicking at slightly different positions
    if (!drawerOpened) {
      console.log('   Trying alternative click positions...');

      // Try positions around the expected pencil location
      const positions = [
        { x: 1171, y: 350 },
        { x: 1171, y: 360 },
        { x: 1165, y: 356 },
        { x: 1175, y: 356 },
        { x: 1180, y: 356 },
      ];

      for (const pos of positions) {
        console.log(`   Trying (${pos.x}, ${pos.y})...`);
        await page.mouse.click(pos.x, pos.y);
        await page.waitForTimeout(2000);

        drawerOpened = await page.locator('text=User Info').isVisible({ timeout: 1500 }).catch(() => false);
        if (drawerOpened) {
          console.log(`   ✓ Drawer opened at (${pos.x}, ${pos.y})!`);
          break;
        }
      }
    }

    await screenshot(page, 'sig15-03-drawer-check');

    // ===== IF DRAWER OPENED, CONFIGURE SIGNATURE =====
    if (drawerOpened) {
      console.log('\n📍 Step 5: Configuring signature...');

      // Click User Info tab
      await page.locator('text=User Info').first().click();
      await page.waitForTimeout(2000);
      console.log('   ✓ Clicked User Info tab');

      // Scroll down to find Signature section
      console.log('   Scrolling to Signature section...');
      for (let i = 0; i < 25; i++) {
        const sigVisible = await page.locator('text=Enable signature').isVisible({ timeout: 300 }).catch(() => false);
        if (sigVisible) {
          console.log('   ✓ Found Signature section');
          break;
        }
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(150);
      }

      await screenshot(page, 'sig15-04-signature');

      // Enable the toggle
      console.log('   Enabling signature toggle...');
      const toggle = page.locator('[role="switch"]').first();
      if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        const checked = await toggle.getAttribute('aria-checked');
        if (checked !== 'true') {
          await toggle.click();
          console.log('   ✓ Toggle enabled');
        } else {
          console.log('   Toggle already enabled');
        }
      }
      await page.waitForTimeout(1000);

      // Look for </> source button
      console.log('   Looking for HTML source button...');
      const sourceBtn = page.locator('button:has-text("</>")');
      if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sourceBtn.click();
        console.log('   ✓ Clicked </> source button');
        await page.waitForTimeout(1000);
      }

      // Fill the editor
      console.log('   Filling signature HTML...');
      const editor = page.locator('.ql-editor, [contenteditable="true"], textarea').first();
      if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editor.click();
        await page.keyboard.press('Control+a');
        await editor.fill(SIGNATURE_HTML);
        console.log('   ✓ HTML filled');
      }

      await screenshot(page, 'sig15-05-filled');

      // Close source mode if we opened it
      if (await sourceBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sourceBtn.click();
        console.log('   ✓ Closed source mode');
        await page.waitForTimeout(1000);
      }

      // Save
      console.log('   Saving...');
      const saveBtn = page.locator('button:has-text("Next"), button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        console.log('   ✓ Clicked Save/Next');
      }

      await page.waitForTimeout(3000);
      await screenshot(page, 'sig15-06-saved');
      console.log('\n✅ Signature configured!');

    } else {
      console.log('\n⚠️ Could not open the edit drawer automatically.');
      console.log('   Please manually click the pencil icon next to David Young.');
      console.log('   Browser will stay open for 2 minutes.\n');

      // Print the signature HTML for manual pasting
      console.log('   When you get to the Signature section:');
      console.log('   1. Enable the toggle');
      console.log('   2. Click </> button');
      console.log('   3. Paste the HTML from: templates/email-signature.html');
      console.log('   4. Click </> again');
      console.log('   5. Click Next/Save');
    }

    // ===== KEEP BROWSER OPEN =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 Browser open for 2 minutes');
    console.log('='.repeat(50));

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig15-error');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
