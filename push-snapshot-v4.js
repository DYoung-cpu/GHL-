/**
 * Push Mortgage Playbook to Mission Control - v4
 * Click the three-dots (⋮) kebab menu on Mortgage Playbook row
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push4-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v4');
  console.log('  Targeting the ⋮ kebab menu');
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

    // === CLICK THE THREE-DOTS MENU ON MORTGAGE PLAYBOOK ===
    console.log('📍 Step 4: Clicking ⋮ menu on Mortgage Playbook row...');

    // From the screenshot analysis:
    // - Table starts around x=234
    // - Header row at y=317
    // - Row 1 (Mission Control Transfer) at y=354
    // - Row 2 (Mortgage Playbook) at y=390
    // - Three dots icon at x=1378

    // First, find the exact position of the Mortgage Playbook row
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();

    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      const rowBox = await mortgageRow.boundingBox();
      console.log(`   Row bounds: x=${rowBox.x}, y=${rowBox.y}, w=${rowBox.width}, h=${rowBox.height}`);

      // The three dots (⋮) is at the very end of the row
      // Click at x = rowBox.x + rowBox.width - 15, y = rowBox.y + rowBox.height/2
      const kebabX = rowBox.x + rowBox.width - 15;
      const kebabY = rowBox.y + rowBox.height / 2;

      console.log(`   Clicking kebab menu at (${kebabX}, ${kebabY})`);
      await page.mouse.click(kebabX, kebabY);
      await page.waitForTimeout(1500);
      await ss(page, 'kebab-clicked');

    } else {
      // Fallback: coordinate-based
      console.log('   Using coordinate fallback...');
      // With 1600px viewport, kebab menu should be around x=1380, y=390
      await page.mouse.click(1380, 390);
      await page.waitForTimeout(1500);
      await ss(page, 'coord-kebab-clicked');
    }

    // === LOOK FOR PUSH OPTION IN DROPDOWN ===
    console.log('📍 Step 5: Looking for Push option in dropdown...');
    await ss(page, 'dropdown-state');

    // Check what options appeared
    const dropdownOptions = [
      'Push to Sub-Account',
      'Push to Sub Account',
      'Push Snapshot',
      'Update Sub-Account',
      'Update Sub Account',
      'Sync',
      'Deploy',
      'Push'
    ];

    let pushClicked = false;
    for (const optionText of dropdownOptions) {
      const option = page.locator(`text=${optionText}`).first();
      if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   ✅ Found: "${optionText}"`);
        await option.click();
        await page.waitForTimeout(2000);
        await ss(page, 'push-option-clicked');
        pushClicked = true;
        break;
      }
    }

    if (!pushClicked) {
      // Take a screenshot to see what options are available
      console.log('   Push option not found, checking dropdown contents...');
      await ss(page, 'dropdown-contents');

      // Try to find any visible menu items
      const menuItems = await page.locator('[role="menuitem"], [class*="dropdown"] a, [class*="menu"] button').all();
      console.log(`   Found ${menuItems.length} menu items`);

      for (const item of menuItems) {
        const text = await item.textContent().catch(() => '');
        console.log(`   - Menu item: "${text.trim()}"`);
      }
    }

    // === HANDLE PUSH DIALOG IF FOUND ===
    if (pushClicked) {
      console.log('📍 Step 6: Handling push dialog...');
      await page.waitForTimeout(2000);
      await ss(page, 'push-dialog');

      // Check if there's a confirmation dialog
      // Mission Control - David Young should be pre-selected since it's linked

      // Look for checkbox to select
      const mcCheckbox = page.locator('input[type="checkbox"]').first();
      if (await mcCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await mcCheckbox.isChecked();
        if (!isChecked) {
          await mcCheckbox.click();
          await page.waitForTimeout(500);
          console.log('   Selected checkbox');
        }
      }

      // Look for "Select All" option
      const selectAll = page.locator('text=Select All, label:has-text("Select All")');
      if (await selectAll.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await selectAll.first().click();
        await page.waitForTimeout(500);
        console.log('   Clicked Select All');
      }

      await ss(page, 'before-push-confirm');

      // Click Push/Confirm button
      const pushBtns = [
        'button:has-text("Push")',
        'button:has-text("Update")',
        'button:has-text("Confirm")',
        'button:has-text("Yes")',
        'button:has-text("Apply")',
        'button.n-button--primary'
      ];

      for (const btnSelector of pushBtns) {
        // Get the last matching button (usually the primary action)
        const btn = page.locator(btnSelector).last();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          const btnText = await btn.textContent().catch(() => btnSelector);
          console.log(`   Clicking: "${btnText.trim()}"`);
          await btn.click();
          await page.waitForTimeout(5000);
          await ss(page, 'push-confirmed');
          console.log('   ✅ Push initiated!');
          break;
        }
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final-state');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push4-*.png');
    console.log('  Check Mission Control to verify content');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 2 minutes for verification...');
    await page.waitForTimeout(120000);
    await browser.close();
  }
})();
