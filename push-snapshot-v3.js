/**
 * Push Mortgage Playbook to Mission Control - v3
 * Based on screenshot analysis: scroll table to reveal actions, click menu
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push3-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v3');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }  // Wider viewport
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

    // === FIND MORTGAGE PLAYBOOK ROW ===
    console.log('📍 Step 4: Finding Mortgage Playbook row...');

    // The table has horizontal scroll - let's scroll right to see the actions column
    // First, find the table container
    const tableContainer = page.locator('.hl_snapshots--table, [class*="table"], table').first();

    // Scroll the page right to reveal any hidden columns
    await page.evaluate(() => {
      const scrollable = document.querySelector('.hl_snapshots--table') ||
                        document.querySelector('[class*="table-container"]') ||
                        document.querySelector('table')?.parentElement;
      if (scrollable) {
        scrollable.scrollLeft = 500;
      }
    });
    await page.waitForTimeout(1000);
    await ss(page, 'after-scroll');

    // === HOVER ON MORTGAGE PLAYBOOK ROW TO REVEAL MENU ===
    console.log('📍 Step 5: Hovering on Mortgage Playbook row...');

    // Based on screenshot: Mortgage Playbook is second row
    // Row 1 (Mission Control Transfer) is around y=381
    // Row 2 (Mortgage Playbook) is around y=420
    // Table rows are roughly 40-50px apart

    // Find the row by text
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook"), [class*="row"]:has-text("Mortgage Playbook")').first();

    if (await mortgageRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found Mortgage Playbook row');

      // Hover to reveal menu
      await mortgageRow.hover();
      await page.waitForTimeout(1500);
      await ss(page, 'row-hovered');

      // Look for 3-dot menu button that appears on hover
      // Try multiple selectors
      const menuSelectors = [
        'button[aria-label*="menu"]',
        'button[aria-label*="action"]',
        '[class*="dropdown-trigger"]',
        '[class*="action-menu"]',
        '[class*="more-actions"]',
        'button:has(svg)',
        '[class*="kebab"]',
        '[class*="ellipsis"]'
      ];

      let menuBtn = null;
      for (const selector of menuSelectors) {
        const btn = mortgageRow.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          menuBtn = btn;
          console.log(`   Found menu button with: ${selector}`);
          break;
        }
      }

      if (menuBtn) {
        await menuBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'menu-open');
      } else {
        // Fallback: click at the far right of the row
        console.log('   Trying coordinate click at row end...');
        const box = await mortgageRow.boundingBox();
        if (box) {
          // Click at the far right of the row
          await page.mouse.click(box.x + box.width - 30, box.y + box.height / 2);
          await page.waitForTimeout(1500);
          await ss(page, 'row-end-clicked');
        }
      }
    } else {
      // Fallback to coordinate-based approach
      console.log('   Using coordinate-based click...');
      // Mortgage Playbook row is approximately at y=420
      // The action menu might be at the far right
      await page.mouse.move(1400, 420);
      await page.waitForTimeout(1000);
      await ss(page, 'coord-hover');

      await page.mouse.click(1450, 420);
      await page.waitForTimeout(1500);
      await ss(page, 'coord-click');
    }

    // === LOOK FOR PUSH TO SUB-ACCOUNT OPTION ===
    console.log('📍 Step 6: Looking for Push to Sub-Account option...');

    const pushOptions = [
      'text=Push to Sub-Account',
      'text=Push to Sub Account',
      'text=Push Snapshot',
      'text=Push',
      'text=Deploy'
    ];

    let pushFound = false;
    for (const selector of pushOptions) {
      const option = page.locator(selector).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`   ✅ Found: ${selector}`);
        await option.click();
        await page.waitForTimeout(2000);
        await ss(page, 'push-clicked');
        pushFound = true;
        break;
      }
    }

    if (!pushFound) {
      console.log('   Push option not found in dropdown, trying snapshot details...');
      await ss(page, 'no-push-option');

      // Try clicking on the row name to open snapshot settings
      const snapshotLink = page.locator('text=Mortgage Playbook').first();
      await snapshotLink.click();
      await page.waitForTimeout(2000);
      await ss(page, 'snapshot-details');

      // Look for Settings tab or Push button in modal
      const settingsTab = page.locator('text=Snapshot Settings');
      if (await settingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settingsTab.click();
        await page.waitForTimeout(1500);
        await ss(page, 'settings-tab');
      }

      // Look for Linked Sub-Accounts tab
      const linkedTab = page.locator('text=Linked Sub-Accounts');
      if (await linkedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await linkedTab.click();
        await page.waitForTimeout(1500);
        await ss(page, 'linked-tab');

        // Look for Push button
        const pushBtn = page.locator('button:has-text("Push"), button:has-text("Update")');
        if (await pushBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await pushBtn.first().click();
          await page.waitForTimeout(2000);
          await ss(page, 'push-btn-clicked');
          pushFound = true;
        }
      }
    }

    // === HANDLE PUSH DIALOG ===
    if (pushFound) {
      console.log('📍 Step 7: Handling push dialog...');
      await page.waitForTimeout(2000);
      await ss(page, 'push-dialog');

      // Look for Mission Control checkbox or selection
      const mcOption = page.locator('text=Mission Control - David Young');
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        // It might already be selected since it's linked
        console.log('   Found Mission Control option');

        // Click checkbox if needed
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.click();
            await page.waitForTimeout(500);
          }
        }
      }

      await ss(page, 'before-confirm');

      // Look for confirm/push button
      const confirmSelectors = [
        'button:has-text("Push")',
        'button:has-text("Confirm")',
        'button:has-text("Update")',
        'button:has-text("Yes")',
        'button:has-text("Apply")'
      ];

      for (const selector of confirmSelectors) {
        const btn = page.locator(selector).last();  // Usually the action button is last
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`   Clicking: ${selector}`);
          await btn.click();
          await page.waitForTimeout(5000);
          await ss(page, 'push-confirmed');
          break;
        }
      }

      console.log('✅ Push initiated!');
    }

    // === FINAL STATE ===
    await ss(page, 'final-state');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push3-*.png');
    console.log('  Browser staying open for manual verification');
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
