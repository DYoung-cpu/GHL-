/**
 * Push Mortgage Playbook to Mission Control
 * Using coordinate-based clicking (proven working method)
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push2-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control');
  console.log('  Using coordinate-based clicking');
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

    // === FIND AND RIGHT-CLICK OR HOVER ON MORTGAGE PLAYBOOK ROW ===
    console.log('📍 Step 4: Finding Mortgage Playbook row...');

    // The snapshots table - Mortgage Playbook is the second row
    // First row header is around y=343, each row is ~50px
    // Mortgage Playbook row should be around y=420

    // First, let's hover over the row to reveal the action menu
    // The row starts around x=260 and the menu button should be at the far right around x=1350

    await page.mouse.move(700, 420);  // Move to middle of Mortgage Playbook row
    await page.waitForTimeout(1000);
    await ss(page, 'hover-row');

    // Look for 3-dot menu button that appears on hover (usually far right of row)
    // Try clicking at the right side of the row where menu button typically is
    console.log('   Clicking action menu...');
    await page.mouse.click(1350, 420);
    await page.waitForTimeout(1500);
    await ss(page, 'menu-clicked');

    // Check if a dropdown appeared
    // If not, try clicking directly on the row to open snapshot details
    const menuVisible = await page.locator('text=Push to Sub-Account').isVisible({ timeout: 2000 }).catch(() => false);

    if (menuVisible) {
      console.log('   ✅ Found Push to Sub-Account option');
      await page.locator('text=Push to Sub-Account').click();
      await page.waitForTimeout(2000);
    } else {
      console.log('   Menu not visible, trying to click row...');
      // Click on the row name to open snapshot details
      await page.mouse.click(400, 420);
      await page.waitForTimeout(2000);
      await ss(page, 'row-clicked');
    }

    await ss(page, 'after-menu-action');

    // === LOOK FOR PUSH OPTION IN SNAPSHOT DETAILS ===
    console.log('📍 Step 5: Looking for Push option...');

    // If we're in Snapshot Details modal, look for Linked Sub-Accounts or Push button
    // The modal typically has tabs: Snapshot Details, Notification Preferences, Linked Sub-Accounts

    const linkedTab = page.locator('text=Linked Sub-Accounts');
    if (await linkedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Linked Sub-Accounts tab');
      await linkedTab.click();
      await page.waitForTimeout(2000);
      await ss(page, 'linked-tab');
    }

    // Check current state
    await ss(page, 'current-state');

    // Try to find Push button or go to Sub-Accounts section
    // In the Snapshot settings, there's usually a way to push

    // Let's check the left sidebar for options while in snapshot settings
    const snapshotSettings = await page.locator('text=Snapshot Settings').isVisible({ timeout: 2000 }).catch(() => false);

    // Try clicking on different areas to find the push functionality
    // Based on GHL's UI, push is usually in a dropdown from the row, or in the Linked Sub-Accounts tab

    // Let's try going back to the list and using right-click
    console.log('📍 Step 6: Trying right-click context menu...');

    // Press Escape to close any modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Go back to snapshots list
    const backBtn = page.locator('text=Account Snapshots').first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
    }

    await ss(page, 'back-to-list');

    // Now try right-clicking on the Mortgage Playbook row
    console.log('   Right-clicking on Mortgage Playbook row...');
    await page.mouse.click(400, 420, { button: 'right' });
    await page.waitForTimeout(1500);
    await ss(page, 'right-click-menu');

    // Look for Push option
    const pushOption = page.locator('text=Push to Sub-Account, text=Push, text=Deploy, text=Update Sub-Account');
    if (await pushOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Found Push option in context menu');
      await pushOption.first().click();
      await page.waitForTimeout(2000);
      await ss(page, 'push-clicked');
    }

    // === TRY HOVER + CLICK ON ROW END ===
    console.log('📍 Step 7: Trying hover + action icon...');

    // Move to the row and look for an icon/button that appears
    await page.mouse.move(1300, 420);
    await page.waitForTimeout(1500);
    await ss(page, 'hover-end-of-row');

    // Click where the 3-dots or action button typically appears
    await page.mouse.click(1320, 420);
    await page.waitForTimeout(1500);
    await ss(page, 'click-action-area');

    // === SCREENSHOT FINAL STATE ===
    await ss(page, 'final-state');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push2-*.png');
    console.log('  Browser staying open - please complete manually if needed');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 2 minutes for manual completion...');
    await page.waitForTimeout(120000);
    await browser.close();
  }
})();
