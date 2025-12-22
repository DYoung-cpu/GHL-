/**
 * Load Snapshot to Mission Control - v2
 * Fixed: Dismiss dropdown overlay before navigating
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/loadv2-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(60));
  console.log('  Load Snapshot to Mission Control - v2');
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

    // Dismiss any open dropdown by pressing Escape or clicking elsewhere
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.mouse.click(800, 500);  // Click in middle of page to close dropdowns
    await page.waitForTimeout(1000);

    await ss(page, 'agency-view-clean');

    // === NAVIGATE TO SUB-ACCOUNTS ===
    console.log('📍 Step 3: Going to Sub-Accounts...');

    // Use direct navigation instead of clicking sidebar
    await page.goto('https://app.gohighlevel.com/v2/location/sub-accounts', {
      waitUntil: 'networkidle',
      timeout: 20000
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await ss(page, 'sub-accounts-page');

    // If that didn't work, try clicking the sidebar
    if (!page.url().includes('sub-accounts')) {
      const subAccountsLink = page.locator('text=Sub-Accounts');
      if (await subAccountsLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await subAccountsLink.first().click({ force: true });
        await page.waitForTimeout(3000);
      }
    }

    await ss(page, 'sub-accounts-list');

    // === FIND MISSION CONTROL - DAVID YOUNG ===
    console.log('📍 Step 4: Finding Mission Control - David Young...');

    // Look for a search box
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="sub-account"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill('Mission Control');
      await page.waitForTimeout(2000);
      await ss(page, 'searched');
    }

    // Find Mission Control row/card
    const mcElement = page.locator('text=Mission Control - David Young').first();
    if (await mcElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found Mission Control - David Young');

      // Try to find the row container and its menu
      const rowSelectors = [
        'tr:has-text("Mission Control - David Young")',
        '[class*="card"]:has-text("Mission Control - David Young")',
        '[class*="row"]:has-text("Mission Control - David Young")',
        '[class*="item"]:has-text("Mission Control - David Young")'
      ];

      let rowFound = false;
      for (const selector of rowSelectors) {
        const row = page.locator(selector).first();
        if (await row.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`   Found row with: ${selector}`);

          // Hover to reveal menu
          await row.hover();
          await page.waitForTimeout(1000);

          // Try clicking the 3-dot menu at the end of row
          const menuBtns = await row.locator('button, [class*="menu"], svg').all();
          if (menuBtns.length > 0) {
            await menuBtns[menuBtns.length - 1].click();
            await page.waitForTimeout(1500);
            await ss(page, 'row-menu-open');
            rowFound = true;
            break;
          }
        }
      }

      if (!rowFound) {
        // Try right-click context menu
        await mcElement.click({ button: 'right' });
        await page.waitForTimeout(1500);
        await ss(page, 'context-menu');
      }
    } else {
      console.log('   Mission Control not found in list view');
      // Check if we're on a map view
      await ss(page, 'current-view');

      // Try Add Manually link to see the list
      const listViewBtn = page.locator('text=List View, text=List, [class*="list-view"]');
      if (await listViewBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await listViewBtn.first().click();
        await page.waitForTimeout(2000);
        await ss(page, 'switched-to-list');
      }
    }

    // === LOOK FOR MANAGE CLIENT OPTION ===
    console.log('📍 Step 5: Looking for Manage Client...');

    const manageClient = page.locator('text=Manage Client');
    if (await manageClient.isVisible({ timeout: 3000 }).catch(() => false)) {
      await manageClient.click();
      await page.waitForTimeout(3000);
      await ss(page, 'manage-client-page');
      console.log('   ✅ Opened Manage Client');

      // === CLICK ACTIONS BUTTON ===
      console.log('📍 Step 6: Clicking Actions button...');

      const actionsBtn = page.locator('button:has-text("Actions")');
      if (await actionsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await actionsBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'actions-dropdown');

        // === CLICK LOAD SNAPSHOT ===
        console.log('📍 Step 7: Clicking Load Snapshot...');

        const loadSnapshot = page.locator('text=Load Snapshot');
        if (await loadSnapshot.isVisible({ timeout: 3000 }).catch(() => false)) {
          await loadSnapshot.click();
          await page.waitForTimeout(2000);
          await ss(page, 'load-snapshot-modal');
          console.log('   ✅ Opened Load Snapshot dialog');

          // === PICK SNAPSHOT ===
          console.log('📍 Step 8: Selecting Mortgage Playbook...');

          // Click the dropdown
          const dropdown = page.locator('[class*="select"], [class*="dropdown"], input[placeholder*="Pick"]').first();
          if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
            await dropdown.click();
            await page.waitForTimeout(1000);
          }

          // Select Mortgage Playbook
          const mortgageOption = page.locator('text=Mortgage Playbook').first();
          if (await mortgageOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await mortgageOption.click();
            await page.waitForTimeout(1000);
            console.log('   ✅ Selected Mortgage Playbook');
            await ss(page, 'snapshot-selected');

            // Click Proceed
            await page.locator('button:has-text("Proceed")').click();
            await page.waitForTimeout(2000);
            await ss(page, 'after-proceed-1');

            // === SELECT ALL ASSETS ===
            console.log('📍 Step 9: Selecting all assets...');
            const selectAll = page.locator('text=Select All');
            if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
              await selectAll.click();
              await page.waitForTimeout(500);
            }
            await ss(page, 'assets-selected');

            // Proceed
            await page.locator('button:has-text("Proceed")').click();
            await page.waitForTimeout(2000);
            await ss(page, 'after-proceed-2');

            // === HANDLE CONFLICTS ===
            console.log('📍 Step 10: Handling conflicts...');
            await ss(page, 'conflicts');

            // Try Override All if available
            const overrideAll = page.locator('text=Override All');
            if (await overrideAll.isVisible({ timeout: 2000 }).catch(() => false)) {
              await overrideAll.click();
              await page.waitForTimeout(500);
            }

            // Proceed
            const proceed3 = page.locator('button:has-text("Proceed")');
            if (await proceed3.isVisible({ timeout: 2000 }).catch(() => false)) {
              await proceed3.click();
              await page.waitForTimeout(2000);
              await ss(page, 'after-proceed-3');
            }

            // === CONFIRM ===
            console.log('📍 Step 11: Confirming import...');

            // Type "confirm"
            const confirmInput = page.locator('input').last();
            if (await confirmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await confirmInput.fill('confirm');
              await page.waitForTimeout(500);
            }
            await ss(page, 'typed-confirm');

            // Final Proceed
            const finalProceed = page.locator('button:has-text("Proceed")');
            if (await finalProceed.isVisible({ timeout: 3000 }).catch(() => false)) {
              await finalProceed.click();
              await page.waitForTimeout(5000);
              console.log('   ✅ SNAPSHOT IMPORT STARTED!');
              await ss(page, 'import-started');
            }
          }
        }
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(60));
    console.log('  Screenshots saved to ./screenshots/loadv2-*.png');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 3 minutes...');
    await page.waitForTimeout(180000);
    await browser.close();
  }
})();
