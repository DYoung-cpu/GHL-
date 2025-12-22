/**
 * Push Mortgage Playbook to Mission Control - v7
 * Click snapshot name → Linked Sub-Accounts → Push
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push7-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v7');
  console.log('  Click row name → Linked Sub-Accounts → Push');
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

    // === CLICK ON SNAPSHOT NAME TO OPEN DETAILS ===
    console.log('📍 Step 4: Clicking Mortgage Playbook name...');

    // Click directly on the "Mortgage Playbook" text link
    const snapshotLink = page.locator('text=Mortgage Playbook').first();
    await snapshotLink.click();
    await page.waitForTimeout(3000);
    await ss(page, 'snapshot-details');

    // === CHECK MODAL/PAGE FOR TABS ===
    console.log('📍 Step 5: Looking for Linked Sub-Accounts...');

    // The snapshot details modal has tabs
    // We saw earlier: Assets (90), Version History
    // There might be more tabs or a Linked Sub-Accounts section

    // First, let's see what tabs are available
    const allText = await page.locator('body').textContent();
    console.log('   Checking for tab options...');

    // Check for Linked Sub-Accounts tab
    const linkedTab = page.locator('text=Linked Sub-Accounts');
    if (await linkedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Linked Sub-Accounts tab');
      await linkedTab.click();
      await page.waitForTimeout(2000);
      await ss(page, 'linked-tab');
    } else {
      console.log('   Linked Sub-Accounts tab not visible');
    }

    // Check for Snapshot Settings tab
    const snapshotSettingsTab = page.locator('text=Snapshot Settings');
    if (await snapshotSettingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found Snapshot Settings tab');
      await snapshotSettingsTab.click();
      await page.waitForTimeout(2000);
      await ss(page, 'snapshot-settings');
    }

    // Check for any tab that might contain push functionality
    const tabs = await page.locator('[role="tab"], [class*="tab"]').all();
    console.log(`   Found ${tabs.length} tabs`);
    for (const tab of tabs) {
      const text = await tab.textContent().catch(() => '');
      if (text.trim()) {
        console.log(`   - Tab: "${text.trim()}"`);
      }
    }

    await ss(page, 'current-modal-state');

    // === LOOK FOR PUSH BUTTON OR UPDATE OPTION ===
    console.log('📍 Step 6: Looking for Push/Update functionality...');

    // The modal might have a "Push" or "Update" button
    const pushSelectors = [
      'button:has-text("Push")',
      'button:has-text("Update")',
      'button:has-text("Sync")',
      'button:has-text("Deploy")',
      'text=Push to Sub-Account',
      'text=Update Sub-Account'
    ];

    for (const selector of pushSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        const text = await el.textContent().catch(() => selector);
        console.log(`   ✅ Found: "${text.trim()}"`);
        await el.click();
        await page.waitForTimeout(2000);
        await ss(page, 'push-clicked');
        break;
      }
    }

    // === TRY THE + ICON TO ADD/PUSH TO SUB-ACCOUNT ===
    console.log('📍 Step 7: Trying + icon in the original row...');

    // Close modal first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Go back to snapshots if needed
    const accountSnapshots = page.locator('text=Account Snapshots').first();
    if (await accountSnapshots.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accountSnapshots.click();
      await page.waitForTimeout(2000);
    }

    await ss(page, 'back-to-list');

    // Click the + icon in the Mortgage Playbook row
    // Based on the screenshots, the icons in order are: +, refresh, upload, ⋮
    // The + is likely "Add Sub-Account" or "Push"
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();
    if (await mortgageRow.isVisible({ timeout: 3000 })) {
      // Get all buttons in the row
      const rowButtons = await mortgageRow.locator('button, svg, [role="button"]').all();
      console.log(`   Found ${rowButtons.length} buttons in row`);

      // Click the first button (should be +)
      if (rowButtons.length > 0) {
        // Try clicking the + button (first action icon)
        const rowBox = await mortgageRow.boundingBox();
        // Based on layout: + is around x=1298, refresh around x=1323, upload around x=1348, menu around x=1378
        const plusX = rowBox.x + rowBox.width - 110;  // Approximately where + icon is
        const plusY = rowBox.y + rowBox.height / 2;
        console.log(`   Clicking + icon at (${plusX}, ${plusY})`);
        await page.mouse.click(plusX, plusY);
        await page.waitForTimeout(2000);
        await ss(page, 'plus-clicked');
      }
    }

    // === CHECK WHAT APPEARED ===
    console.log('📍 Step 8: Checking result...');
    await ss(page, 'after-plus');

    // Look for any dialog or dropdown that appeared
    const dialogVisible = await page.locator('[role="dialog"], [class*="modal"], [class*="popup"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogVisible) {
      console.log('   Dialog appeared!');
      await ss(page, 'dialog');

      // Check for Push button
      const pushBtn = page.locator('button:has-text("Push"), button:has-text("Confirm")').first();
      if (await pushBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pushBtn.click();
        await page.waitForTimeout(5000);
        console.log('   ✅ Push confirmed!');
        await ss(page, 'push-confirmed');
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push7-*.png');
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
