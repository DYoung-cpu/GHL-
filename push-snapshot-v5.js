/**
 * Push Mortgage Playbook to Mission Control - v5
 * Use precise pixel coordinates for the ⋮ kebab menu
 */

const { chromium } = require('playwright');
const fs = require('fs');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/push5-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook → Mission Control v5');
  console.log('  Using precise pixel coordinates');
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

    // === LOCATE THE THREE DOTS ICON DIRECTLY ===
    console.log('📍 Step 4: Finding the ⋮ menu icon...');

    // Try to find the three dots icon in the Mortgage Playbook row using various selectors
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();

    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      console.log('   Found Mortgage Playbook row');

      // Look for the kebab/more icon within this row
      // GHL typically uses class names like "hl-" prefix
      const kebabSelectors = [
        'svg[class*="dots"]',
        'svg[class*="more"]',
        'svg[class*="ellipsis"]',
        'button[class*="more"]',
        '[data-testid*="menu"]',
        '[aria-label*="more"]',
        '[aria-label*="actions"]',
        'button:last-child',
        'td:last-child button',
        'td:last-child svg'
      ];

      let kebabFound = false;
      for (const selector of kebabSelectors) {
        const kebab = mortgageRow.locator(selector).first();
        if (await kebab.isVisible({ timeout: 500 }).catch(() => false)) {
          console.log(`   Found kebab with: ${selector}`);
          await kebab.click();
          await page.waitForTimeout(1500);
          kebabFound = true;
          break;
        }
      }

      if (!kebabFound) {
        // Get the row's exact position and look for the rightmost clickable element
        const rowBox = await mortgageRow.boundingBox();
        console.log(`   Row at y=${rowBox.y}, height=${rowBox.height}`);

        // Based on screenshot analysis:
        // - The ⋮ icon is at approximately x=1378 in a 1600px viewport
        // - The Mortgage Playbook row center is at y=390 (header ~317, row1 ~354, row2 ~390)

        // Let's click at fixed coordinates
        const kebabX = 1378;
        const kebabY = rowBox.y + rowBox.height / 2;

        console.log(`   Clicking at fixed coordinate (${kebabX}, ${kebabY})`);
        await page.mouse.click(kebabX, kebabY);
        await page.waitForTimeout(1500);
      }

      await ss(page, 'after-kebab-click');
    }

    // === CHECK FOR DROPDOWN AND CLICK PUSH ===
    console.log('📍 Step 5: Looking for dropdown menu...');
    await ss(page, 'dropdown-check');

    // Look for common dropdown/menu items
    const allText = await page.locator('body').textContent();

    // Check for Push option
    const pushTexts = [
      'Push to Sub-Account',
      'Push to Sub Account',
      'Push Snapshot',
      'Update Sub-Account',
      'Push',
      'Deploy',
      'Sync to Sub-Account'
    ];

    let pushClicked = false;
    for (const text of pushTexts) {
      if (allText.includes(text)) {
        console.log(`   Found text: "${text}"`);
        const option = page.locator(`text="${text}"`).first();
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click();
          await page.waitForTimeout(2000);
          pushClicked = true;
          console.log(`   ✅ Clicked: "${text}"`);
          break;
        }
      }
    }

    if (!pushClicked) {
      // Maybe the dropdown menu uses divs, not text
      console.log('   Checking for menu items...');

      // Capture any dropdown that appeared
      await ss(page, 'dropdown-contents');

      // Try clicking based on dropdown position (usually appears below the clicked element)
      // The dropdown menu items are typically at y=420-500 range
      const dropdownItems = await page.locator('[role="menu"] > *, [class*="dropdown"] > *, [class*="menu-item"]').all();
      console.log(`   Found ${dropdownItems.length} potential menu items`);

      for (const item of dropdownItems) {
        const text = await item.textContent().catch(() => '');
        const isVisible = await item.isVisible().catch(() => false);
        if (isVisible && text.trim()) {
          console.log(`   - "${text.trim()}"`);
        }
      }
    }

    await ss(page, 'after-push-attempt');

    // === IF PUSH WAS CLICKED, HANDLE DIALOG ===
    if (pushClicked) {
      console.log('📍 Step 6: Handling push confirmation...');
      await page.waitForTimeout(2000);
      await ss(page, 'push-dialog');

      // Look for confirmation dialog
      // Mission Control should be pre-selected

      // Click confirm/push button
      const confirmBtns = [
        'button:has-text("Push")',
        'button:has-text("Confirm")',
        'button:has-text("Update")',
        'button:has-text("Yes")'
      ];

      for (const btn of confirmBtns) {
        const button = page.locator(btn).last();
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`   Clicking confirmation: ${btn}`);
          await button.click();
          await page.waitForTimeout(5000);
          await ss(page, 'confirmed');
          console.log('   ✅ Push confirmed!');
          break;
        }
      }
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/push5-*.png');
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
