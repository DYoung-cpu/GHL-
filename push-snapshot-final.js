/**
 * Push Mortgage Playbook to Mission Control - FINAL
 * Use exact pixel coordinates from visual analysis
 * Icons at end of row: + (1290), refresh (1318), upload (1345), menu (1375)
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/final-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control FINAL');
  console.log('  Using exact pixel coordinates');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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

    // === MORTGAGE PLAYBOOK ROW Y-COORDINATE ===
    // Find exact Y position of the Mortgage Playbook row
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();
    let rowY = 430; // Default
    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      const box = await mortgageRow.boundingBox();
      rowY = box.y + box.height / 2;
      console.log(`   Mortgage Playbook row center Y: ${rowY}`);
    }

    // === TRY EACH ICON FROM LEFT TO RIGHT ===
    // Based on visual analysis of 1600px viewport:
    // The icons are roughly at: +~1290, refresh~1318, upload~1345, menu~1375

    const icons = [
      { name: 'Plus (+)', x: 1295 },
      { name: 'Refresh', x: 1322 },
      { name: 'Upload', x: 1348 },
    ];

    let pushDialogFound = false;

    for (const icon of icons) {
      console.log(`📍 Trying ${icon.name} icon at (${icon.x}, ${rowY})...`);

      // Click somewhere else first to reset any open menus
      await page.mouse.click(800, 600);
      await page.waitForTimeout(500);

      await page.mouse.click(icon.x, rowY);
      await page.waitForTimeout(2000);
      await ss(page, `${icon.name.toLowerCase().replace(/[^a-z]/g, '')}-clicked`);

      // Check if a push dialog appeared
      const pushOptions = [
        'Push to Sub-Account',
        'Select Sub-Account',
        'Push Snapshot',
        'Select the Sub-Accounts'
      ];

      for (const text of pushOptions) {
        const el = page.locator(`text=${text}`).first();
        if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log(`   ✅ FOUND PUSH DIALOG! (${icon.name} icon works)`);
          pushDialogFound = true;
          break;
        }
      }

      if (pushDialogFound) break;

      // Check if it opened the same kebab menu
      const kebabMenu = page.locator('text=Copy Snapshot ID');
      if (await kebabMenu.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   This is the kebab menu, not push dialog`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // === IF PUSH DIALOG FOUND, COMPLETE IT ===
    if (pushDialogFound) {
      console.log('📍 Step 4: Completing push...');
      await ss(page, 'push-dialog');

      // Wait for dialog to fully load
      await page.waitForTimeout(2000);

      // Look for checkbox to select Mission Control - David Young
      const mcCheckbox = page.locator('input[type="checkbox"]').first();
      if (await mcCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await mcCheckbox.isChecked();
        if (!isChecked) {
          await mcCheckbox.click();
          await page.waitForTimeout(500);
          console.log('   Checked checkbox');
        } else {
          console.log('   Checkbox already checked');
        }
      }

      // Look for "Select All" if available
      const selectAll = page.locator('text=Select All');
      if (await selectAll.isVisible({ timeout: 1000 }).catch(() => false)) {
        await selectAll.click();
        await page.waitForTimeout(500);
        console.log('   Clicked Select All');
      }

      await ss(page, 'before-push-confirm');

      // Click Push/Confirm button
      const pushBtn = page.locator('button:has-text("Push")').last();
      if (await pushBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pushBtn.click();
        await page.waitForTimeout(5000);
        console.log('   ✅ PUSH CONFIRMED!');
        await ss(page, 'push-confirmed');
      } else {
        // Try Confirm button
        const confirmBtn = page.locator('button:has-text("Confirm")').last();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(5000);
          console.log('   ✅ CONFIRMED!');
          await ss(page, 'confirmed');
        }
      }
    } else {
      console.log('⚠️  Push dialog not found from any icon');
      console.log('   The push might be in the snapshot settings or via API');
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/final-*.png');
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
