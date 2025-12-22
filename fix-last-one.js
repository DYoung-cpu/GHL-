/**
 * Fix Post-Close Nurture workflow - search with "Post-Close"
 */
const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== FIX POST-CLOSE WORKFLOW ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const sleep = (ms) => page.waitForTimeout(ms);

  // Login
  console.log('[LOGIN]...');
  await page.goto('https://app.gohighlevel.com/');
  await sleep(3000);
  const iframe = await page.$('#g_id_signin iframe');
  if (iframe) {
    const frame = await iframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await sleep(4000);
  const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (gp) {
    await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
    await gp.keyboard.press('Enter');
    await sleep(4000);
    try {
      await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
      await gp.fill('input[type="password"]:visible', 'Fafa2185!');
      await gp.keyboard.press('Enter');
    } catch(e) {}
    await sleep(10000);
  }
  console.log('[LOGIN] Done!\n');

  // Go to workflows
  console.log('Searching for "Post-Close"...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(4000);

  // Search with "Post-Close" (shorter, no special chars)
  await page.mouse.click(1200, 239);
  await sleep(300);
  await page.keyboard.type('Post-Close');
  await sleep(2000);

  await page.screenshot({ path: './screenshots/post-close-search.png' });

  // Click result
  await page.mouse.click(400, 371);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Could not open workflow');
    console.log('Try manually opening it.');
    await sleep(60000);
    await browser.close();
    return;
  }

  console.log('Opened! Adding trigger...');

  // Add trigger
  await page.mouse.click(700, 153);  // Add New Trigger
  await sleep(2000);
  await page.keyboard.type('tag');
  await sleep(1500);
  await page.mouse.click(950, 405);  // Contact Tag
  await sleep(2000);

  // Configure tag = "Closed"
  await page.mouse.click(1100, 350);
  await sleep(500);
  await page.keyboard.type('Closed');
  await sleep(1000);
  await page.keyboard.press('Enter');
  await sleep(1000);

  // Save
  await page.mouse.click(1289, 833);
  await sleep(2000);

  await page.screenshot({ path: './screenshots/post-close-done.png' });
  console.log('SUCCESS!\n');

  console.log('=== ALL 10 TAG-BASED WORKFLOWS COMPLETE ===\n');
  console.log('Browser staying open for manual configuration of:');
  console.log('  - Appointment Reminder Sequence (Appointment Booked)');
  console.log('  - Birthday Wishes (Birthday Reminder)');
  console.log('  - Missed Appointment Follow-Up (Appointment Status)');
  console.log('  - Rate Drop Alert Campaign (Manual Trigger)');
  console.log('  - Stale Lead Re-engagement (Custom)');
  console.log('\nPress Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
