/**
 * Rename all 15 workflows to proper names
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const WORKFLOW_NAMES = [
  'New Lead Nurture Sequence',
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Application Process Updates',
  'Underwriting Status Updates',
  'Conditional Approval Celebration',
  'Clear to Close Celebration',
  'Closing Countdown Sequence',
  'Post-Close Nurture & Referral Sequence',
  'Realtor Partner Updates',
  'Rate Drop Alert Campaign',
  'Birthday Wishes',
  'Stale Lead Re-engagement'
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/rename-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  RENAME WORKFLOWS');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let renamed = 0;

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

    // Go directly to workflows
    console.log('[2] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000);
    await ss(page, 'list-page1');
    console.log('   Done!\n');

    // Rename workflows
    console.log('[3] Renaming workflows...\n');

    // We have 15 workflows across 2 pages (10 per page)
    // Page 1: workflows 1-10, Page 2: workflows 11-15

    let workflowIndex = 0;

    for (let pageNum = 1; pageNum <= 2; pageNum++) {
      console.log(`--- Page ${pageNum} ---\n`);

      if (pageNum === 2) {
        // Click Next to go to page 2
        console.log('   Clicking Next page...');
        // Next button is around (1171, 860) based on typical pagination position
        await page.mouse.click(1171, 860);
        await page.waitForTimeout(5000);
        await ss(page, 'list-page2');
      }

      // On page 1: rows start around y=371, each row ~68px
      // On page 2: same layout
      // First row at ~371, second at ~439, etc.
      const rowsOnPage = pageNum === 1 ? 10 : 5;  // 10 on page 1, 5 on page 2

      for (let row = 0; row < rowsOnPage && workflowIndex < WORKFLOW_NAMES.length; row++) {
        const newName = WORKFLOW_NAMES[workflowIndex];
        console.log(`[${workflowIndex + 1}/15] Renaming to "${newName}"`);

        try {
          // Calculate row Y position (first row at ~371, each row 68px apart)
          const rowY = 371 + (row * 68);

          // Click on the workflow name (left side of the row, around x=430)
          console.log(`   Clicking row at (430, ${rowY})...`);
          await page.mouse.click(430, rowY);
          await page.waitForTimeout(4000);

          // Check if we're in the workflow editor (URL should contain /workflow/)
          const url = page.url();
          if (url.includes('/workflow/')) {
            console.log('   In workflow editor!');
            await ss(page, `${workflowIndex + 1}-editor`);

            // Click on the workflow name at top center (around 686, 27)
            console.log('   Clicking name field...');
            await page.mouse.click(686, 27);
            await page.waitForTimeout(1000);

            // Select all and type new name
            await page.keyboard.press('Control+a');
            await page.waitForTimeout(300);
            await page.keyboard.type(newName);
            await page.waitForTimeout(500);

            // Press Enter or click elsewhere to confirm
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            // Wait for auto-save
            await page.waitForTimeout(2000);
            await ss(page, `${workflowIndex + 1}-renamed`);

            renamed++;
            console.log('   SUCCESS!\n');

            // Go back to workflows list
            // Click "< Back to Workflows" at top left (around 118, 27)
            await page.mouse.click(118, 27);
            await page.waitForTimeout(4000);

          } else {
            console.log('   Failed to open workflow editor');
            await ss(page, `${workflowIndex + 1}-failed`);
          }

          workflowIndex++;

        } catch (err) {
          console.log(`   Error: ${err.message}\n`);
          await ss(page, `${workflowIndex + 1}-error`);
          workflowIndex++;

          // Try to recover - go back to workflows
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(5000);
        }
      }

      // After processing page, go back to workflows list if not already there
      if (!page.url().includes('/workflows')) {
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(5000);
      }
    }

    // Final screenshot
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'final');

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log('='.repeat(50));
  console.log(`  Result: ${renamed}/15 workflows renamed`);
  console.log('='.repeat(50));

  console.log('\nBrowser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
