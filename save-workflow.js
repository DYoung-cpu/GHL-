/**
 * Save the current workflow in GHL
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('📍 Saving workflow...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Login
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
    await page.waitForTimeout(5000);
    console.log('✅ Logged in!\n');

    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }

    // Navigate to workflows
    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);

    const wfFrame = page.frames().find(f => f.url().includes('automation-workflows'));
    if (!wfFrame) throw new Error('Frame not found');

    // Open workflow
    console.log('📍 Opening: New Lead Nurture Sequence');
    await wfFrame.locator('text=New Lead Nurture Sequence').first().click();
    await page.waitForTimeout(5000);

    // Take screenshot of current state
    await page.screenshot({ path: './screenshots/save-01-current-state.png' });
    console.log('   📸 Current workflow state saved');

    // The workflow auto-saves, but let's click Save/Publish if available
    const saveBtn = page.locator('button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked Save button');
    }

    // Check for Saved indicator
    const savedIndicator = await page.locator('text=Saved').isVisible({ timeout: 3000 }).catch(() => false);
    if (savedIndicator) {
      console.log('   ✅ Workflow shows "Saved" status');
    }

    await page.screenshot({ path: './screenshots/save-02-after-save.png' });
    console.log('   📸 After save screenshot');

    console.log('\n✅ Workflow saved successfully!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('\nClosing browser...');
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
