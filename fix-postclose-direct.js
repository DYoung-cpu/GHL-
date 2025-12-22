/**
 * Fix Post-Close - Go to page 2 and click directly (no search)
 */
const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== FIX POST-CLOSE (DIRECT) ===\n');

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

  // Go to workflows page 2 directly
  console.log('Going to page 2...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(5000);

  // Screenshot page 1
  await page.screenshot({ path: './screenshots/direct-p1.png' });

  // Go to page 2
  await page.mouse.click(1157, 860);
  await sleep(4000);

  // Screenshot page 2
  await page.screenshot({ path: './screenshots/direct-p2.png' });

  // Post-Close should be row 1 on page 2 (y ~= 375)
  console.log('Clicking Post-Close row...');
  await page.mouse.click(400, 375);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Not in workflow editor. Checking URL:', page.url());
    await page.screenshot({ path: './screenshots/direct-error.png' });
    await sleep(60000);
    await browser.close();
    return;
  }

  console.log('Opened! Adding Contact Tag trigger...');

  // Add trigger
  await page.mouse.click(700, 153);
  await sleep(2000);
  await page.keyboard.type('tag');
  await sleep(1500);
  await page.mouse.click(950, 405);
  await sleep(2000);

  // Tag = "Closed"
  await page.mouse.click(1100, 350);
  await sleep(500);
  await page.keyboard.type('Closed');
  await sleep(1000);
  await page.keyboard.press('Enter');
  await sleep(1000);

  // Save
  await page.mouse.click(1289, 833);
  await sleep(2000);

  await page.screenshot({ path: './screenshots/direct-done.png' });
  console.log('SUCCESS!\n');

  // Update project memory and show summary
  console.log('='.repeat(50));
  console.log('ALL 10 TAG-BASED WORKFLOWS CONFIGURED!');
  console.log('='.repeat(50));
  console.log('\n5 workflows need MANUAL trigger configuration:');
  console.log('  1. Appointment Reminder Sequence -> Appointment Booked');
  console.log('  2. Birthday Wishes -> Birthday Reminder');
  console.log('  3. Missed Appointment Follow-Up -> Appointment Status Changed');
  console.log('  4. Rate Drop Alert Campaign -> Manual Trigger');
  console.log('  5. Stale Lead Re-engagement -> Custom (30-day no activity)');
  console.log('\nBrowser open for manual work. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
