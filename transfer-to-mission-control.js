/**
 * Transfer Content to Mission Control - David Young
 *
 * This script will login to GHL, navigate to Mission Control,
 * and link/push the snapshot or recreate content directly.
 */

const { chromium } = require('playwright');

// CORRECT TARGET
const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';
const SNAPSHOT_ID = 'cbBbH0NDDkg9Rq10dXV2';

(async () => {
  console.log('='.repeat(50));
  console.log('  Transfer to Mission Control - David Young');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // === LOGIN ===
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Google One-Tap
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google One-Tap...');
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(3000);

    // Handle Google popup
    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      console.log('   Entering credentials...');
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
    await page.waitForTimeout(3000);

    // === SWITCH TO AGENCY VIEW ===
    console.log('📍 Switching to Agency View...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      // Look for Agency View option
      const agencyView = page.locator('text=Switch to Agency View');
      if (await agencyView.isVisible({ timeout: 3000 }).catch(() => false)) {
        await agencyView.click();
        await page.waitForTimeout(3000);
        console.log('✅ In Agency View\n');
      }
    }

    // === NAVIGATE TO SNAPSHOTS ===
    console.log('📍 Navigating to Account Snapshots...');
    await page.click('text=Account Snapshots');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: './screenshots/transfer-01-snapshots.png' });
    console.log('   📸 Screenshot saved\n');

    // === FIND THE SNAPSHOT ===
    console.log('📍 Looking for snapshot: Mission Control Transfer...');

    // Click on the snapshot row or settings
    const snapshotRow = page.locator('text=Mission Control Transfer').first();
    if (await snapshotRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await snapshotRow.click();
      await page.waitForTimeout(2000);
    } else {
      // Try clicking on the snapshot by ID or finding it another way
      console.log('   Searching for snapshot...');
      const allSnapshots = await page.locator('tr, [class*="snapshot"], [class*="row"]').all();
      console.log(`   Found ${allSnapshots.length} potential snapshot rows`);
    }

    await page.screenshot({ path: './screenshots/transfer-02-snapshot-found.png' });

    // === TRY TO LINK SUB-ACCOUNT ===
    console.log('📍 Attempting to link Mission Control sub-account...');

    // Navigate to Linked Sub-Accounts
    const linkedTab = page.locator('text=Linked Sub-Accounts');
    if (await linkedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await linkedTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: './screenshots/transfer-03-linked-tab.png' });

    // Look for Add button or search
    const addBtn = page.locator('button:has-text("Add"), button:has-text("+"), text=Add Sub-Account');
    if (await addBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Add button');
    }

    // Try typing in search
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill('Mission Control');
      await page.waitForTimeout(2000);
      console.log('   Searched for Mission Control');

      // Click on result
      const mcResult = page.locator('text=Mission Control - David Young').first();
      if (await mcResult.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcResult.click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Selected Mission Control - David Young');
      }
    }

    await page.screenshot({ path: './screenshots/transfer-04-after-search.png' });

    // Click Save
    const saveBtn = page.locator('button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Saved');
    }

    await page.screenshot({ path: './screenshots/transfer-05-saved.png' });

    // === TRY PUSH TO SUB-ACCOUNT ===
    console.log('📍 Attempting to push snapshot...');

    // Go back to snapshot list
    const backBtn = page.locator('text=← Back, button:has-text("Back")').first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
    }

    // Find snapshot and click menu
    const snapshotMenu = page.locator('[class*="menu"], [class*="dropdown"], button:has-text("⋮"), button:has-text("...")').first();
    if (await snapshotMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      await snapshotMenu.click();
      await page.waitForTimeout(1000);

      const pushOption = page.locator('text=Push to Sub-Account, text=Deploy, text=Push');
      if (await pushOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await pushOption.first().click();
        await page.waitForTimeout(2000);
        console.log('   Clicked Push option');
      }
    }

    await page.screenshot({ path: './screenshots/transfer-06-push.png' });

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/transfer-*.png');
    console.log('  Review and continue manually if needed');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: './screenshots/transfer-error.png' });
  } finally {
    console.log('\nBrowser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
