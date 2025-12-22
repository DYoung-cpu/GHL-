/**
 * Final Fix - Complete workflow cleanup
 *
 * Current state:
 * - Have duplicate "Application Process Updates" to rename
 * - Missing: Pre-Qualification Process Workflow, Pre-Qualification Complete Notification,
 *   Clear to Close Celebration, Post-Close Nurture & Referral Sequence
 *
 * Plan:
 * 1. Screenshot both pages to count total
 * 2. Rename first "Application Process Updates" to missing name
 * 3. Create remaining missing workflows
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const MISSING_NAMES = [
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Clear to Close Celebration',
  'Post-Close Nurture & Referral Sequence'
];

(async () => {
  console.log('=== FINAL WORKFLOW FIX ===\n');

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
    console.log('[2] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: './screenshots/fix-page1.png', fullPage: true });
    console.log('   Page 1 screenshot saved\n');

    // Go to page 2
    console.log('[3] Getting page 2...');
    await page.mouse.click(1157, 860);  // Next button
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/fix-page2.png', fullPage: true });
    console.log('   Page 2 screenshot saved\n');

    // Go back to page 1
    await page.mouse.click(1000, 860);  // Previous button
    await page.waitForTimeout(3000);

    // STEP 1: Rename first duplicate "Application Process Updates"
    console.log('[4] Renaming duplicate to "' + MISSING_NAMES[0] + '"...');

    // First row (Application Process Updates) is at y ~371
    await page.mouse.click(400, 371);
    await page.waitForTimeout(3000);

    if (page.url().includes('/workflow/')) {
      await page.mouse.click(686, 27);  // Name field
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.type(MISSING_NAMES[0]);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Go back
      await page.mouse.click(118, 27);
      await page.waitForTimeout(3000);
      console.log('   Done!\n');
    } else {
      console.log('   Failed to open workflow editor\n');
    }

    // STEP 2: Create remaining 3 workflows
    console.log('[5] Creating remaining workflows...\n');

    for (let i = 1; i < MISSING_NAMES.length; i++) {
      const name = MISSING_NAMES[i];
      console.log(`   Creating "${name}"...`);

      // Make sure on workflows list
      if (!page.url().includes('/automation/workflows')) {
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(5000);
      }

      // Click "+ Create Workflow"
      await page.mouse.click(1257, 138);
      await page.waitForTimeout(2000);

      // Click "Start from Scratch"
      await page.mouse.click(1200, 190);
      await page.waitForTimeout(3000);

      // Rename
      await page.mouse.click(686, 27);
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.type(name);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Go back
      await page.mouse.click(118, 27);
      await page.waitForTimeout(3000);
      console.log(`   Done! (${i}/3)\n`);
    }

    // Final verification screenshots
    console.log('[6] Taking final screenshots...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/final-page1.png', fullPage: true });

    await page.mouse.click(1157, 860);  // Next
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/final-page2.png', fullPage: true });

    console.log('\n=== COMPLETE ===');
    console.log('Check final-page1.png and final-page2.png for results');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/fix-error.png', fullPage: true });
  }

  console.log('\nBrowser closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
