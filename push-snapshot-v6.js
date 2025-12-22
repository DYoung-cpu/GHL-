/**
 * Push Mortgage Playbook to Mission Control - v6
 * Click ⋮ menu → Settings → Find Push option
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push6-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v6');
  console.log('  Menu → Settings → Push');
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

    // === CLICK KEBAB MENU ON MORTGAGE PLAYBOOK ===
    console.log('📍 Step 4: Clicking ⋮ menu on Mortgage Playbook...');

    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();
    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      // Find and click the last button (kebab menu) in this row
      const kebab = mortgageRow.locator('button:last-child');
      await kebab.click();
      await page.waitForTimeout(1500);
      await ss(page, 'kebab-menu-open');

      // === CLICK SETTINGS ===
      console.log('📍 Step 5: Clicking Settings...');
      const settingsOption = page.locator('text=Settings').first();
      if (await settingsOption.isVisible({ timeout: 2000 })) {
        await settingsOption.click();
        await page.waitForTimeout(3000);
        await ss(page, 'settings-page');
        console.log('   ✅ Opened Settings');
      }
    }

    // === LOOK FOR PUSH/LINKED SUB-ACCOUNTS ===
    console.log('📍 Step 6: Looking for push functionality...');

    // Check for Linked Sub-Accounts tab
    const linkedTab = page.locator('text=Linked Sub-Accounts');
    if (await linkedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Linked Sub-Accounts tab');
      await linkedTab.click();
      await page.waitForTimeout(2000);
      await ss(page, 'linked-tab');
    }

    // Check for Snapshot Settings (might have Push option)
    const snapshotSettingsTab = page.locator('text=Snapshot Settings');
    if (await snapshotSettingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found Snapshot Settings tab');
      await snapshotSettingsTab.click();
      await page.waitForTimeout(2000);
      await ss(page, 'snapshot-settings');
    }

    // Look for Push button or Update button
    console.log('📍 Step 7: Looking for Push/Update button...');

    const pushButtons = [
      'button:has-text("Push")',
      'button:has-text("Update Sub-Account")',
      'button:has-text("Update")',
      'button:has-text("Sync")',
      'text=Push to Sub-Account'
    ];

    let pushFound = false;
    for (const selector of pushButtons) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        const btnText = await btn.textContent().catch(() => selector);
        console.log(`   ✅ Found: "${btnText.trim()}"`);
        await btn.click();
        await page.waitForTimeout(2000);
        await ss(page, 'push-clicked');
        pushFound = true;
        break;
      }
    }

    if (!pushFound) {
      console.log('   No push button found, checking page for options...');
      await ss(page, 'no-push-found');

      // Print all visible buttons for debugging
      const allButtons = await page.locator('button').all();
      console.log(`   Found ${allButtons.length} buttons on page`);
      for (const btn of allButtons.slice(0, 15)) {
        const text = await btn.textContent().catch(() => '');
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible && text.trim()) {
          console.log(`   - "${text.trim().substring(0, 50)}"`);
        }
      }
    }

    // === HANDLE PUSH CONFIRMATION ===
    if (pushFound) {
      console.log('📍 Step 8: Handling push confirmation...');
      await page.waitForTimeout(2000);
      await ss(page, 'push-dialog');

      // Click confirm button
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Push")').last();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(5000);
        console.log('   ✅ Push confirmed!');
        await ss(page, 'push-confirmed');
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push6-*.png');
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
