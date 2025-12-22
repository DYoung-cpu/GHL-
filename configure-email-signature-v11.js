const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V11
// Use JavaScript to click the pencil icon in David's row

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V11');
  console.log('='.repeat(50));
  console.log('Using JavaScript click for pencil icon\n');

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
    await screenshot(page, 'sig11-01-my-staff');

    // ===== CLICK DAVID'S PENCIL ICON USING JAVASCRIPT =====
    console.log('📍 Step 4: Clicking edit pencil via JavaScript...');

    // Use JavaScript to find and click the pencil icon
    const clicked = await page.evaluate(() => {
      // Find all rows in the table
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        // Check if this row contains "David Young" or "david@lendwisemtg.com"
        if (row.textContent.includes('David Young') || row.textContent.includes('david@lendwisemtg.com')) {
          // Find the first SVG (pencil icon) in this row
          const svg = row.querySelector('svg');
          if (svg) {
            svg.click();
            return 'clicked SVG in David row';
          }
          // Try finding any clickable element in the last cell
          const lastCell = row.querySelector('td:last-child');
          if (lastCell) {
            const clickable = lastCell.querySelector('button, a, svg, [role="button"]');
            if (clickable) {
              clickable.click();
              return 'clicked element in last cell';
            }
          }
        }
      }
      return 'not found';
    });

    console.log(`   Result: ${clicked}`);
    await page.waitForTimeout(5000);
    await screenshot(page, 'sig11-02-after-click');

    // ===== CHECK FOR EDIT FORM =====
    console.log('📍 Step 5: Checking for edit form...');

    // Check if we see "Edit or manage your team" or "User Info"
    const editHeader = await page.locator('text=Edit or manage your team').isVisible({ timeout: 3000 }).catch(() => false);
    const userInfoTab = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`   "Edit or manage your team": ${editHeader}`);
    console.log(`   "User Info" tab: ${userInfoTab}`);

    await screenshot(page, 'sig11-03-edit-check');

    if (!editHeader && !userInfoTab) {
      console.log('   Edit form not found, trying alternative method...');

      // Try clicking the row element directly
      await page.evaluate(() => {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          if (row.textContent.includes('david@lendwisemtg.com')) {
            // Find ALL svgs and click the first one (pencil)
            const svgs = row.querySelectorAll('svg');
            if (svgs.length > 0) {
              // Create and dispatch a click event
              const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              svgs[0].dispatchEvent(event);
            }
          }
        }
      });

      await page.waitForTimeout(5000);
      await screenshot(page, 'sig11-03b-retry-click');
    }

    // ===== SCROLL AND FIND SIGNATURE =====
    console.log('📍 Step 6: Looking for Signature section...');

    // First click User Info tab if visible
    const userInfo = page.locator('text=User Info').first();
    if (await userInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInfo.click();
      console.log('   ✓ Clicked User Info tab');
      await page.waitForTimeout(2000);
    }

    // Scroll to find Signature
    for (let i = 0; i < 25; i++) {
      const sigLabel = page.locator('text=Signature').first();
      if (await sigLabel.isVisible({ timeout: 200 }).catch(() => false)) {
        console.log('   ✓ Found Signature section');
        break;
      }
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(150);
    }

    await screenshot(page, 'sig11-04-signature-area');

    // ===== ENABLE TOGGLE AND FILL SIGNATURE =====
    console.log('📍 Step 7: Enabling signature and filling...');

    // Look for toggle
    const toggle = page.locator('[role="switch"], .n-switch').first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isChecked = await toggle.getAttribute('aria-checked');
      if (isChecked !== 'true') {
        await toggle.click({ force: true });
        console.log('   ✓ Enabled toggle');
      }
    }

    // Find and fill the editor
    const editor = page.locator('.ql-editor, [contenteditable="true"]').first();
    if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editor.click();
      await page.keyboard.press('Control+a');
      await editor.fill(SIGNATURE_HTML);
      console.log('   ✓ Filled editor');
    } else {
      // Try clicking placeholder text
      const placeholder = page.locator('text=Create your email signature');
      if (await placeholder.isVisible({ timeout: 1000 }).catch(() => false)) {
        await placeholder.click();
        await page.keyboard.type(SIGNATURE_HTML.substring(0, 200));
        console.log('   ✓ Typed in placeholder area');
      }
    }

    await screenshot(page, 'sig11-05-filled');

    // ===== SAVE =====
    console.log('📍 Step 8: Saving...');

    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      console.log('   ✓ Clicked Next');
      await page.waitForTimeout(2000);
    }

    const saveBtn = page.locator('button:has-text("Save")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig11-06-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig11-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
