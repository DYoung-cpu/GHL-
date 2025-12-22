/**
 * Final cleanup - rename last 2 duplicates
 *
 * Page 2 still has:
 * - Row 1: Post-Close Nurture... → rename to "Appointment Reminder Sequence"
 * - Row 4: Pre-Qualification Process... → rename to "Stale Lead Re-engagement"
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const RENAMES = [
  { row: 0, y: 371, newName: 'Appointment Reminder Sequence' },
  { row: 3, y: 575, newName: 'Stale Lead Re-engagement' }
];

(async () => {
  console.log('=== FINAL CLEANUP ===\n');

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

    // Go to workflows page 2
    console.log('[2] Going to workflows page 2...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(6000);
    await page.mouse.click(1157, 860);  // Next to page 2
    await page.waitForTimeout(3000);
    console.log('   Done!\n');

    // Rename duplicates
    console.log('[3] Renaming last 2 duplicates...\n');

    for (let i = 0; i < RENAMES.length; i++) {
      const { row, y, newName } = RENAMES[i];
      console.log(`   [${i+1}/2] Row ${row} → "${newName}"...`);

      // Click on row
      await page.mouse.click(400, y);
      await page.waitForTimeout(3000);

      if (page.url().includes('/workflow/')) {
        await page.mouse.click(686, 27);  // Name field
        await page.waitForTimeout(500);
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);
        await page.keyboard.type(newName);
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Go back
        await page.mouse.click(118, 27);
        await page.waitForTimeout(3000);

        // Navigate back to page 2
        if (!page.url().includes('/automation/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(4000);
        }
        await page.mouse.click(1157, 860);
        await page.waitForTimeout(2000);

        console.log(`      Done!\n`);
      } else {
        console.log(`      FAILED\n`);
      }
    }

    // Final screenshots
    console.log('[4] Final verification screenshots...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/complete-p1.png', fullPage: true });

    await page.mouse.click(1157, 860);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/complete-p2.png', fullPage: true });

    console.log('\n=== CLEANUP COMPLETE ===');

  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\nBrowser closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
