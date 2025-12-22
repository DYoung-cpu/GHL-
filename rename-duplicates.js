/**
 * Rename 4 duplicate workflows to missing names
 *
 * Page 2 has duplicates:
 * - Row 1: Post-Close Nurture & Referral Sequence (keep)
 * - Row 2: Post-Close Nurture & Referral Sequence (rename to New Lead Nurture Sequence)
 * - Row 3: Pre-Qualification Complete Notification (keep)
 * - Row 4: Pre-Qualification Process Workflow (keep)
 * - Row 5: Pre-Qualification Process Workflow (rename to Realtor Partner Updates)
 * - Row 6: Pre-Qualification Process Workflow (rename to Rate Drop Alert Campaign)
 * - Row 7: Pre-Qualification Process Workflow (rename to Stale Lead Re-engagement)
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Rows to rename on page 2 (0-indexed from top of list)
// Row positions: y = 371 + (row * 68)
const RENAMES = [
  { row: 1, y: 439, newName: 'New Lead Nurture Sequence' },
  { row: 4, y: 643, newName: 'Realtor Partner Updates' },
  { row: 5, y: 711, newName: 'Rate Drop Alert Campaign' },
  { row: 6, y: 779, newName: 'Stale Lead Re-engagement' }
];

(async () => {
  console.log('=== RENAME DUPLICATES ===\n');

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

    // Go to page 2
    await page.mouse.click(1157, 860);  // Next button
    await page.waitForTimeout(3000);
    console.log('   Done!\n');

    // Rename each duplicate
    console.log('[3] Renaming duplicates...\n');

    for (let i = 0; i < RENAMES.length; i++) {
      const { row, y, newName } = RENAMES[i];
      console.log(`   [${i+1}/4] Renaming row ${row} to "${newName}"...`);

      // Click on the row
      await page.mouse.click(400, y);
      await page.waitForTimeout(3000);

      // Check if in workflow editor
      if (!page.url().includes('/workflow/')) {
        console.log(`      Warning: Not in editor. Trying alternate click...`);
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(4000);
        await page.mouse.click(1157, 860);  // Go to page 2
        await page.waitForTimeout(3000);
        await page.mouse.click(400, y);
        await page.waitForTimeout(3000);
      }

      if (page.url().includes('/workflow/')) {
        // Click name field
        await page.mouse.click(686, 27);
        await page.waitForTimeout(500);

        // Select all and type new name
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);
        await page.keyboard.type(newName);
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Go back
        await page.mouse.click(118, 27);
        await page.waitForTimeout(3000);

        // If we're not on page 2, navigate back
        if (!page.url().includes('/automation/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(4000);
        }

        // Make sure we're on page 2
        await page.mouse.click(1157, 860);
        await page.waitForTimeout(2000);

        console.log(`      Done!\n`);
      } else {
        console.log(`      FAILED - could not open workflow\n`);
      }
    }

    // Final verification
    console.log('[4] Taking final screenshots...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/renamed-p1.png', fullPage: true });

    await page.mouse.click(1157, 860);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/renamed-p2.png', fullPage: true });

    await page.mouse.click(1157, 860);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/renamed-p3.png', fullPage: true });

    console.log('\n=== COMPLETE ===');
    console.log('Check renamed-p1.png, renamed-p2.png, renamed-p3.png');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/rename-error.png', fullPage: true });
  }

  console.log('\nBrowser closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
