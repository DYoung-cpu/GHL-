/**
 * Load Snapshot to Mission Control - CORRECT METHOD
 * Path: Sub-Accounts → Manage Client → Actions → Load Snapshot
 * Based on GHL documentation
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/load-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(60));
  console.log('  Load Snapshot to Mission Control - CORRECT METHOD');
  console.log('  Sub-Accounts → Manage Client → Actions → Load Snapshot');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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

    // === NAVIGATE TO SUB-ACCOUNTS ===
    console.log('📍 Step 3: Going to Sub-Accounts...');
    const subAccountsLink = page.locator('text=Sub-Accounts').first();
    await subAccountsLink.click();
    await page.waitForTimeout(3000);
    await ss(page, 'sub-accounts-list');

    // === FIND MISSION CONTROL - DAVID YOUNG ===
    console.log('📍 Step 4: Finding Mission Control - David Young...');

    // Search for Mission Control
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Mission Control');
      await page.waitForTimeout(2000);
      await ss(page, 'searched');
    }

    // Look for Mission Control row
    const mcRow = page.locator('text=Mission Control - David Young').first();
    if (await mcRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found Mission Control - David Young');

      // Find the three-dot menu for this row
      // The menu is typically at the end of the row
      const mcRowParent = page.locator('tr:has-text("Mission Control - David Young"), [class*="row"]:has-text("Mission Control - David Young")').first();

      if (await mcRowParent.isVisible({ timeout: 3000 })) {
        // Click the three-dot menu
        const menuBtn = mcRowParent.locator('button:last-child, [class*="menu"], svg').last();
        await menuBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'menu-open');

        // Look for "Manage Client" option
        console.log('📍 Step 5: Clicking Manage Client...');
        const manageClient = page.locator('text=Manage Client');
        if (await manageClient.isVisible({ timeout: 3000 }).catch(() => false)) {
          await manageClient.click();
          await page.waitForTimeout(3000);
          await ss(page, 'manage-client');
          console.log('   ✅ Opened Manage Client');
        }
      }
    } else {
      // Try clicking directly on the map marker or card
      console.log('   Searching on map view...');
      await ss(page, 'map-view');

      // Try list view if available
      const listViewBtn = page.locator('text=List View, button:has-text("List")');
      if (await listViewBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await listViewBtn.first().click();
        await page.waitForTimeout(2000);
        await ss(page, 'list-view');
      }
    }

    // === CLICK ACTIONS BUTTON ===
    console.log('📍 Step 6: Clicking Actions button...');
    await ss(page, 'before-actions');

    const actionsBtn = page.locator('button:has-text("Actions")');
    if (await actionsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await actionsBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'actions-dropdown');

      // Look for "Load Snapshot" option
      console.log('📍 Step 7: Clicking Load Snapshot...');
      const loadSnapshot = page.locator('text=Load Snapshot');
      if (await loadSnapshot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await loadSnapshot.click();
        await page.waitForTimeout(2000);
        await ss(page, 'load-snapshot-dialog');
        console.log('   ✅ Opened Load Snapshot dialog');

        // === SELECT SNAPSHOT ===
        console.log('📍 Step 8: Selecting Mortgage Playbook snapshot...');

        // Click the "Pick a Snapshot" dropdown
        const snapshotDropdown = page.locator('text=Pick a Snapshot, [class*="select"], [class*="dropdown"]').first();
        await snapshotDropdown.click();
        await page.waitForTimeout(1500);
        await ss(page, 'snapshot-dropdown');

        // Look for Mortgage Playbook
        const mortgagePlaybook = page.locator('text=Mortgage Playbook').first();
        if (await mortgagePlaybook.isVisible({ timeout: 3000 }).catch(() => false)) {
          await mortgagePlaybook.click();
          await page.waitForTimeout(1000);
          console.log('   ✅ Selected Mortgage Playbook');
          await ss(page, 'snapshot-selected');

          // Click Proceed
          const proceedBtn = page.locator('button:has-text("Proceed")');
          if (await proceedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await proceedBtn.click();
            await page.waitForTimeout(2000);
            await ss(page, 'after-proceed-1');
          }

          // === SELECT ASSETS ===
          console.log('📍 Step 9: Selecting all assets...');

          // Look for "Select All" option
          const selectAll = page.locator('text=Select All, label:has-text("Select All"), input[type="checkbox"]').first();
          if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
            await selectAll.click();
            await page.waitForTimeout(1000);
            console.log('   ✅ Selected all assets');
          }
          await ss(page, 'assets-selected');

          // Click Proceed again
          const proceed2 = page.locator('button:has-text("Proceed")');
          if (await proceed2.isVisible({ timeout: 3000 }).catch(() => false)) {
            await proceed2.click();
            await page.waitForTimeout(2000);
            await ss(page, 'after-proceed-2');
          }

          // === HANDLE CONFLICTS ===
          console.log('📍 Step 10: Handling conflicts (if any)...');
          await ss(page, 'conflicts-page');

          // Look for Override all button or proceed
          const overrideAll = page.locator('text=Override All, button:has-text("Override")');
          if (await overrideAll.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await overrideAll.first().click();
            await page.waitForTimeout(1000);
          }

          // Click Proceed
          const proceed3 = page.locator('button:has-text("Proceed")');
          if (await proceed3.isVisible({ timeout: 2000 }).catch(() => false)) {
            await proceed3.click();
            await page.waitForTimeout(2000);
            await ss(page, 'after-proceed-3');
          }

          // === CONFIRM IMPORT ===
          console.log('📍 Step 11: Confirming import...');
          await ss(page, 'confirm-page');

          // Type "confirm" in the verification field
          const confirmInput = page.locator('input[placeholder*="confirm"], input[type="text"]').last();
          if (await confirmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await confirmInput.fill('confirm');
            await page.waitForTimeout(500);
            console.log('   Typed "confirm"');
          }

          // Click final Proceed button
          const finalProceed = page.locator('button:has-text("Proceed")');
          if (await finalProceed.isVisible({ timeout: 3000 }).catch(() => false)) {
            await finalProceed.click();
            await page.waitForTimeout(5000);
            console.log('   ✅ SNAPSHOT IMPORT INITIATED!');
            await ss(page, 'import-initiated');
          }
        }
      }
    } else {
      console.log('   Actions button not found, checking current page...');
      await ss(page, 'no-actions-button');
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(60));
    console.log('  Screenshots saved to ./screenshots/load-*.png');
    console.log('  Check email for completion notification');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 3 minutes to verify...');
    await page.waitForTimeout(180000);
    await browser.close();
  }
})();
