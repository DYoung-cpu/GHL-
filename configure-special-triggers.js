/**
 * Configure 5 special triggers (non-tag based)
 *
 * From trigger panel:
 * - Birthday Reminder is in Contact category
 * - Appointment triggers should be in Appointment category
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const SPECIAL_WORKFLOWS = [
  { name: 'Birthday Wishes', search: 'birthday', triggerName: 'Birthday Reminder' },
  { name: 'Appointment Reminder Sequence', search: 'appointment', triggerName: 'Appointment Booked' },
  { name: 'Missed Appointment Follow-Up', search: 'missed', triggerName: 'Appointment Status' }
];

(async () => {
  console.log('=== CONFIGURE SPECIAL TRIGGERS ===\n');

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

  for (let i = 0; i < SPECIAL_WORKFLOWS.length; i++) {
    const wf = SPECIAL_WORKFLOWS[i];
    console.log(`\n[${i+1}/3] ${wf.name}`);
    console.log(`         Trigger: ${wf.triggerName}`);

    // Go to workflows
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await sleep(5000);

    // Search
    await page.mouse.click(1200, 239);
    await sleep(300);
    await page.keyboard.type(wf.search);
    await sleep(2000);

    // Click result
    await page.mouse.click(400, 371);
    await sleep(4000);

    if (!page.url().includes('/workflow/')) {
      console.log('         ERROR: Could not open');
      continue;
    }

    // Click Add New Trigger
    await page.mouse.click(700, 153);
    await sleep(2000);

    // Search for the trigger type
    await page.keyboard.type(wf.triggerName.toLowerCase().split(' ')[0]);  // First word
    await sleep(1500);

    // Screenshot to see results
    await page.screenshot({ path: `./screenshots/special-${i+1}-trigger.png` });

    // Click first matching result (should be around y=400)
    await page.mouse.click(950, 405);
    await sleep(2000);

    // Screenshot config panel
    await page.screenshot({ path: `./screenshots/special-${i+1}-config.png` });

    // Try to save (some triggers don't need extra config)
    await page.mouse.click(1289, 833);  // Save button
    await sleep(2000);

    console.log('         Attempted configuration');

    // Go back
    await page.mouse.click(118, 27);
    await sleep(2000);
  }

  console.log('\n' + '='.repeat(50));
  console.log('SPECIAL TRIGGERS ATTEMPTED');
  console.log('='.repeat(50));
  console.log('\nRemaining manual work:');
  console.log('  - Rate Drop Alert Campaign (Manual Trigger)');
  console.log('  - Stale Lead Re-engagement (Custom 30-day rule)');
  console.log('\nBrowser staying open. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
