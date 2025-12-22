/**
 * Cleanup Workflows - Rename 6 existing + Create 3 new
 *
 * Current state (from audit):
 * - 6 properly named workflows exist
 * - 5 "New Workflow : [number]" entries to rename
 * - 1 duplicate "Underwriting Status Updates" to rename
 * - Need 3 more workflows to reach 15
 *
 * Missing names (9 total):
 * 1. Appointment Reminder Sequence
 * 2. Missed Appointment Follow-Up
 * 3. Pre-Qualification Process Workflow
 * 4. Pre-Qualification Complete Notification
 * 5. Application Process Updates
 * 6. Clear to Close Celebration
 * 7. Closing Countdown Sequence
 * 8. Post-Close Nurture & Referral Sequence
 * 9. Birthday Wishes
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Names to assign (first 6 for renaming, last 3 for new workflows)
const NAMES_TO_ASSIGN = [
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Application Process Updates',
  'Clear to Close Celebration',
  'Closing Countdown Sequence',
  'Post-Close Nurture & Referral Sequence',
  'Birthday Wishes'
];

(async () => {
  console.log('Workflow Cleanup Script\n');
  console.log('Plan: Rename 6 existing + Create 3 new\n');

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

    // Go to workflows
    console.log('[2] Going to workflows page...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    console.log('   Done!\n');

    // Screenshot current state
    await page.screenshot({ path: './screenshots/cleanup-before.png', fullPage: true });

    // PHASE 1: Rename existing "New Workflow" entries
    console.log('[3] PHASE 1: Renaming existing workflows...\n');

    let renamed = 0;
    const namesToRename = NAMES_TO_ASSIGN.slice(0, 6);  // First 6 names

    // We need to find and rename workflows that have "New Workflow" in their name
    // Based on audit, rows 3-7 on page 1 are "New Workflow" entries
    // Row positions: y = 371 + (row * 68) for rows starting at 0
    // But row 0 is the header, so actual data rows start lower

    // From screenshot analysis:
    // Row 0 (y~371): Conditional Approval Celebration
    // Row 1 (y~439): New Lead Nurture Sequence
    // Row 2 (y~507): New Workflow : 1765430200003
    // Row 3 (y~575): New Workflow : 1765430054046
    // Row 4 (y~643): New Workflow : 1765430768600
    // Row 5 (y~711): New Workflow : 1765430012111
    // Row 6 (y~779): New Workflow : 1765430277888

    // Click rows 2-6 (5 "New Workflow" entries on page 1)
    const rowYPositions = [507, 575, 643, 711, 779];  // y coords for rows 2-6

    for (let i = 0; i < Math.min(rowYPositions.length, namesToRename.length); i++) {
      const yPos = rowYPositions[i];
      const newName = namesToRename[i];

      console.log(`   Renaming row at y=${yPos} to "${newName}"...`);

      // Click on the row to open workflow
      await page.mouse.click(400, yPos);  // Click middle of row
      await page.waitForTimeout(3000);

      // Check if we're in the workflow editor (URL should contain /workflow/)
      const currentUrl = page.url();
      if (!currentUrl.includes('/workflow/')) {
        console.log(`   Warning: Not in workflow editor. URL: ${currentUrl}`);
        await page.screenshot({ path: `./screenshots/cleanup-error-${i}.png` });
        continue;
      }

      // Click on name field at top center
      await page.mouse.click(686, 27);
      await page.waitForTimeout(500);

      // Select all and type new name
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.type(newName);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Go back to workflow list
      await page.mouse.click(118, 27);  // "< Back" link
      await page.waitForTimeout(3000);

      renamed++;
      console.log(`   Done! (${renamed}/6)\n`);
    }

    // Check if we need to go to page 2 for the 6th rename (the duplicate)
    if (renamed < 6) {
      console.log('   Going to page 2 for remaining renames...');
      // Click Next button (approximately at x=1157, y=860 based on audit script)
      await page.mouse.click(1157, 860);
      await page.waitForTimeout(3000);

      // Find and rename the duplicate "Underwriting Status Updates"
      // It should be one of the last items on page 2
      // From page 2 screenshot, we need to find the duplicate

      // Let's rename the first workflow on page 2 that needs renaming
      const newName = namesToRename[renamed];
      console.log(`   Renaming duplicate to "${newName}"...`);

      // Click first row on page 2
      await page.mouse.click(400, 371);
      await page.waitForTimeout(3000);

      if (page.url().includes('/workflow/')) {
        await page.mouse.click(686, 27);
        await page.waitForTimeout(500);
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);
        await page.keyboard.type(newName);
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        await page.mouse.click(118, 27);
        await page.waitForTimeout(3000);
        renamed++;
        console.log(`   Done! (${renamed}/6)\n`);
      }
    }

    console.log(`   Phase 1 complete: ${renamed} workflows renamed\n`);
    await page.screenshot({ path: './screenshots/cleanup-after-rename.png', fullPage: true });

    // PHASE 2: Create 3 new workflows
    console.log('[4] PHASE 2: Creating 3 new workflows...\n');

    const namesToCreate = NAMES_TO_ASSIGN.slice(6);  // Last 3 names

    for (let i = 0; i < namesToCreate.length; i++) {
      const name = namesToCreate[i];
      console.log(`   Creating "${name}"...`);

      // Make sure we're on the workflows list page
      if (!page.url().includes('/automation/workflows')) {
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(5000);
      }

      // Click "+ Create Workflow" button
      await page.mouse.click(1257, 138);
      await page.waitForTimeout(2000);

      // Click "Start from Scratch"
      await page.mouse.click(1200, 190);
      await page.waitForTimeout(3000);

      // Now in workflow editor - rename it
      await page.mouse.click(686, 27);  // Name field
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.type(name);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Go back to list
      await page.mouse.click(118, 27);
      await page.waitForTimeout(3000);

      console.log(`   Done! (${i + 1}/3)\n`);
    }

    console.log('   Phase 2 complete: 3 workflows created\n');

    // Final screenshot
    console.log('[5] Taking final screenshot...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/cleanup-final.png', fullPage: true });

    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`Renamed: ${renamed} workflows`);
    console.log('Created: 3 workflows');
    console.log('Check screenshots/cleanup-final.png for results');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/cleanup-error.png', fullPage: true });
  }

  console.log('\nBrowser closing in 15s...');
  await page.waitForTimeout(15000);
  await browser.close();
})();
