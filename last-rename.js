/**
 * Rename the last "New Workflow" to "Stale Lead Re-engagement"
 * Row 0 on page 2
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== LAST RENAME ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('[1] Logging in...');
    await page.goto('https://app.gohighlevel.com/');
    await page.waitForTimeout(3000);
    const iframe = await page.$('#g_id_signin iframe');
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(4000);
    const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (gp) {
      await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
      await gp.keyboard.press('Enter');
      await page.waitForTimeout(4000);
      try {
        await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
        await gp.fill('input[type="password"]:visible', 'Fafa2185!');
        await gp.keyboard.press('Enter');
      } catch(e) {}
      await page.waitForTimeout(10000);
    }
    console.log('   Done!\n');

    // Go to page 2
    console.log('[2] Going to page 2...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(6000);
    await page.mouse.click(1157, 860);  // Next
    await page.waitForTimeout(3000);
    console.log('   Done!\n');

    // Rename first row (New Workflow : xxx)
    console.log('[3] Renaming "New Workflow" to "Stale Lead Re-engagement"...');
    await page.mouse.click(400, 371);  // Row 0
    await page.waitForTimeout(3000);

    if (page.url().includes('/workflow/')) {
      await page.mouse.click(686, 27);
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.type('Stale Lead Re-engagement');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await page.mouse.click(118, 27);
      await page.waitForTimeout(3000);
      console.log('   Done!\n');
    } else {
      console.log('   Failed!\n');
    }

    // Final screenshots of all pages
    console.log('[4] Final verification...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/done-p1.png', fullPage: true });

    await page.mouse.click(1157, 860);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/done-p2.png', fullPage: true });

    await page.mouse.click(1157, 860);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/done-p3.png', fullPage: true });

    console.log('\n=== ALL DONE ===');

  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\nBrowser closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
