/**
 * Rename the last remaining workflow - "Application Process Updates"
 * Click directly on row 4 (first "New Workflow" in the list)
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('Rename Last Workflow: Application Process Updates\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
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

    // Go to workflows
    console.log('[2] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000);
    await page.screenshot({ path: './screenshots/last-01-list.png' });
    console.log('   Done!\n');

    // Click on the 4th row (first "New Workflow" - at y=575 based on row positions)
    // Rows: 371, 439, 507, 575, 643, 711, 779
    console.log('[3] Clicking on "New Workflow" row (y=575)...');
    await page.mouse.click(430, 575);
    await page.waitForTimeout(4000);

    if (page.url().includes('/workflow/')) {
      console.log('   In workflow editor!\n');
      await page.screenshot({ path: './screenshots/last-02-editor.png' });

      // Click on name field
      console.log('[4] Renaming to "Application Process Updates"...');
      await page.mouse.click(686, 27);
      await page.waitForTimeout(1000);

      await page.keyboard.press('Control+a');
      await page.waitForTimeout(300);
      await page.keyboard.type('Application Process Updates');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: './screenshots/last-03-renamed.png' });
      console.log('   SUCCESS!\n');

      // Go back
      await page.mouse.click(118, 27);
      await page.waitForTimeout(5000);
    } else {
      console.log('   Failed to open editor');
    }

    // Final screenshot
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: './screenshots/last-04-final.png' });

  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('Browser open 30s...');
  await page.waitForTimeout(30000);
  await browser.close();
})();
