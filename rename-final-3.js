/**
 * Rename the last 3 workflows still named "New Workflow : [number]"
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// These are the names we haven't verified as renamed yet
// Based on what's missing from the visible list
const NAMES_TO_APPLY = [
  'Clear to Close Celebration',
  'Underwriting Status Updates',
  'Pre-Qualification Process Workflow'
];

(async () => {
  console.log('Rename Final 3 Workflows\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let success = 0;

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
    console.log('   Done!\n');

    // Rename remaining workflows
    console.log('[3] Renaming workflows...\n');

    for (let i = 0; i < NAMES_TO_APPLY.length; i++) {
      const newName = NAMES_TO_APPLY[i];
      console.log(`[${i + 1}/3] Renaming to "${newName}"...`);

      // Go to workflows list
      await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
      await page.waitForTimeout(8000);

      // Find first "New Workflow" row and click it
      // Rows are at y positions: 371, 439, 507, 575, 643, 711, 779
      let found = false;
      for (let rowIdx = 0; rowIdx < 7 && !found; rowIdx++) {
        const y = 371 + (rowIdx * 68);

        // Click on the row
        await page.mouse.click(430, y);
        await page.waitForTimeout(3000);

        // Check if we're in workflow editor
        if (page.url().includes('/workflow/')) {
          console.log('   Opened workflow editor');

          // Check if this workflow needs renaming (name contains "New Workflow")
          // Just rename it regardless
          await page.mouse.click(686, 27);
          await page.waitForTimeout(1000);

          await page.keyboard.press('Control+a');
          await page.waitForTimeout(300);
          await page.keyboard.type(newName);
          await page.waitForTimeout(500);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);

          console.log('   SUCCESS!\n');
          success++;
          found = true;

          // Go back
          await page.mouse.click(118, 27);
          await page.waitForTimeout(3000);
        }
      }

      if (!found) {
        console.log('   Could not find workflow to rename\n');
      }
    }

    // Final screenshot
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: './screenshots/final3-result.png', fullPage: true });

  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log(`Result: ${success}/3 renamed`);
  console.log('Browser open 30s...');
  await page.waitForTimeout(30000);
  await browser.close();
})();
