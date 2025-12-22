/**
 * Push "Mortgage Playbook" snapshot to Mission Control - David Young
 */

const { chromium } = require('playwright');

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Mortgage Playbook to Mission Control');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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
    await page.waitForTimeout(3000);

    // === SWITCH TO AGENCY VIEW ===
    console.log('📍 Switching to Agency View...');
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

    // === NAVIGATE TO ACCOUNT SNAPSHOTS ===
    console.log('📍 Navigating to Account Snapshots...');
    const snapshotsLink = page.locator('text=Account Snapshots');
    await snapshotsLink.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: './screenshots/push-01-snapshots-list.png' });

    // === CLICK ON MORTGAGE PLAYBOOK ROW ===
    console.log('📍 Finding Mortgage Playbook snapshot...');

    // Find the row with "Mortgage Playbook"
    const playbookRow = page.locator('tr:has-text("Mortgage Playbook")').first();
    if (await playbookRow.isVisible({ timeout: 5000 })) {
      console.log('   Found Mortgage Playbook row');

      // Look for action menu (3 dots or dropdown) in this row
      const actionBtn = playbookRow.locator('button, [class*="action"], [class*="menu"], svg').last();
      await actionBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: './screenshots/push-02-menu-open.png' });

      // Look for Push/Deploy option
      const pushOption = page.locator('text=Push to Sub-Account, text=Push, text=Deploy').first();
      if (await pushOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pushOption.click();
        await page.waitForTimeout(2000);
        console.log('   ✅ Clicked Push to Sub-Account');
      } else {
        console.log('   Looking for alternative push option...');
        // Try clicking directly on the row to open settings
        await playbookRow.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: './screenshots/push-03-after-click.png' });

    // === LOOK FOR PUSH CONFIRMATION ===
    console.log('📍 Looking for push dialog...');

    // Check if we're in snapshot settings now
    const snapshotDetails = page.locator('text=Snapshot Details');
    if (await snapshotDetails.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   In Snapshot Details view');

      // Look for a Push button
      const pushBtn = page.locator('button:has-text("Push"), button:has-text("Deploy"), button:has-text("Update")');
      if (await pushBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await pushBtn.first().click();
        await page.waitForTimeout(2000);
        console.log('   ✅ Clicked Push button');
      }
    }

    await page.screenshot({ path: './screenshots/push-04-push-dialog.png' });

    // === SELECT MISSION CONTROL IF NEEDED ===
    const mcOption = page.locator('text=Mission Control - David Young');
    if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mcOption.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Selected Mission Control');
    }

    // === CONFIRM PUSH ===
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Push"), button:has-text("Yes")');
    if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.first().click();
      await page.waitForTimeout(5000);
      console.log('   ✅ Confirmed push');
    }

    await page.screenshot({ path: './screenshots/push-05-complete.png' });

    console.log('\n' + '='.repeat(50));
    console.log('  Push attempt complete');
    console.log('  Check screenshots in ./screenshots/push-*.png');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: './screenshots/push-error.png' });
  } finally {
    console.log('\nBrowser open for 90 seconds to review/complete...');
    await page.waitForTimeout(90000);
    await browser.close();
  }
})();
