/**
 * Push Mortgage Playbook to Mission Control - v8
 * Click the UPLOAD icon (3rd icon) - likely Push to Sub-Account
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push8-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v8');
  console.log('  Clicking the Upload/Push icon (3rd action icon)');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // === LOGIN ===
    console.log('📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    console.log('✅ Logged in!\n');
    await page.waitForTimeout(2000);

    // === SWITCH TO AGENCY VIEW ===
    console.log('📍 Step 2: Switching to Agency View...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      const agencyView = page.locator('text=Switch to Agency View');
      if (await agencyView.isVisible({ timeout: 3000 }).catch(() => false)) {
        await agencyView.click();
        await page.waitForTimeout(4000);
        console.log('✅ In Agency View\n');
      }
    }

    await ss(page, 'agency-view');

    // === NAVIGATE TO ACCOUNT SNAPSHOTS ===
    console.log('📍 Step 3: Going to Account Snapshots...');
    await page.locator('text=Account Snapshots').click();
    await page.waitForTimeout(3000);
    await ss(page, 'snapshots-list');

    // === CLICK THE UPLOAD/PUSH ICON ON MORTGAGE PLAYBOOK ROW ===
    console.log('📍 Step 4: Clicking Upload/Push icon...');

    // Find the Mortgage Playbook row
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();

    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      const rowBox = await mortgageRow.boundingBox();
      console.log(`   Row bounds: x=${rowBox.x}, y=${rowBox.y}, w=${rowBox.width}, h=${rowBox.height}`);

      // The 4 icons are at the end of the row:
      // From right to left: ⋮ (menu), upload, refresh, +
      // With 1600px viewport:
      // - Menu (⋮) is at ~x=1378
      // - Upload is at ~x=1348 (30px left of menu)
      // - Refresh is at ~x=1323 (25px left of upload)
      // - Plus (+) is at ~x=1298 (25px left of refresh)

      // Let's click each icon and see what it does
      // Start with the upload icon (3rd from right)
      const uploadX = rowBox.x + rowBox.width - 45;  // ~45px from the right edge
      const uploadY = rowBox.y + rowBox.height / 2;

      console.log(`   Clicking upload icon at (${uploadX}, ${uploadY})`);
      await page.mouse.click(uploadX, uploadY);
      await page.waitForTimeout(2000);
      await ss(page, 'upload-clicked');

      // Check what happened
      const bodyText = await page.locator('body').textContent();

      // Check for any dialog
      if (bodyText.includes('Push') || bodyText.includes('Update') || bodyText.includes('Sync')) {
        console.log('   Found Push/Update/Sync option!');
      }
    }

    // === CHECK FOR PUSH DIALOG ===
    console.log('📍 Step 5: Checking for push dialog...');
    await ss(page, 'after-upload-click');

    // Check if a modal or dropdown appeared
    const pushDialogSelectors = [
      'text=Push to Sub-Account',
      'text=Push Snapshot',
      'text=Select Sub-Accounts',
      'text=Mission Control - David Young',
      '[role="dialog"]',
      '[class*="modal"]'
    ];

    let dialogFound = false;
    for (const selector of pushDialogSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        const text = await el.textContent().catch(() => selector);
        console.log(`   ✅ Found: "${text.trim().substring(0, 50)}"`);
        dialogFound = true;
        break;
      }
    }

    if (!dialogFound) {
      // Try clicking refresh icon (maybe that's the sync/push)
      console.log('📍 Step 6: Trying refresh icon...');
      const refreshX = rowBox.x + rowBox.width - 70;  // ~70px from right
      const refreshY = rowBox.y + rowBox.height / 2;
      console.log(`   Clicking refresh icon at (${refreshX}, ${refreshY})`);
      await page.mouse.click(refreshX, refreshY);
      await page.waitForTimeout(2000);
      await ss(page, 'refresh-clicked');
    }

    // === IF DIALOG FOUND, COMPLETE THE PUSH ===
    if (dialogFound) {
      console.log('📍 Step 7: Completing push...');

      // Check for checkboxes to select
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.click();
          console.log('   Selected checkbox');
        }
      }

      await ss(page, 'before-confirm');

      // Click Push/Confirm button
      const confirmBtns = ['button:has-text("Push")', 'button:has-text("Confirm")', 'button:has-text("Update")'];
      for (const selector of confirmBtns) {
        const btn = page.locator(selector).last();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          const btnText = await btn.textContent();
          console.log(`   Clicking: "${btnText.trim()}"`);
          await btn.click();
          await page.waitForTimeout(5000);
          console.log('   ✅ Push completed!');
          await ss(page, 'push-completed');
          break;
        }
      }
    }

    // === TRY PLUS ICON AS LAST RESORT ===
    if (!dialogFound) {
      console.log('📍 Step 8: Trying + icon...');
      const mortgageRow2 = page.locator('tr:has-text("Mortgage Playbook")').first();
      if (await mortgageRow2.isVisible({ timeout: 3000 })) {
        const rowBox2 = await mortgageRow2.boundingBox();
        const plusX = rowBox2.x + rowBox2.width - 95;  // ~95px from right (leftmost icon)
        const plusY = rowBox2.y + rowBox2.height / 2;
        console.log(`   Clicking + icon at (${plusX}, ${plusY})`);
        await page.mouse.click(plusX, plusY);
        await page.waitForTimeout(2000);
        await ss(page, 'plus-clicked');
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push8-*.png');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 2 minutes...');
    await page.waitForTimeout(120000);
    await browser.close();
  }
})();
