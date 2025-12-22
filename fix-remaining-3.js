/**
 * Fix the 3 workflows that failed - they're on page 2
 * Browser should already be open from previous script
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const REMAINING = [
  { name: 'New Lead Nurture Sequence', tag: 'New Lead' },
  { name: 'Post-Close Nurture & Referral Sequence', tag: 'Closed' },
  { name: 'Pre-Qualification Complete Notification', tag: 'Pre-Qual Complete' }
];

(async () => {
  console.log('=== FIX REMAINING 3 WORKFLOWS ===\n');

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

  for (let i = 0; i < REMAINING.length; i++) {
    const wf = REMAINING[i];
    console.log(`[${i+1}/3] ${wf.name} -> "${wf.tag}"`);

    // Go to workflows
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await sleep(4000);

    // These are on page 2, so search with shorter name
    await page.mouse.click(1200, 239);  // Search
    await sleep(300);
    await page.keyboard.type(wf.name.substring(0, 15));  // Shorter search
    await sleep(2000);

    // Click result
    await page.mouse.click(400, 371);
    await sleep(4000);

    if (!page.url().includes('/workflow/')) {
      console.log('   ERROR: Could not open');
      continue;
    }

    // Add trigger
    await page.mouse.click(700, 153);  // Add New Trigger
    await sleep(2000);
    await page.keyboard.type('tag');
    await sleep(1500);
    await page.mouse.click(950, 405);  // Contact Tag
    await sleep(2000);

    // Configure tag
    await page.mouse.click(1100, 350);
    await sleep(500);
    await page.keyboard.type(wf.tag);
    await sleep(1000);
    await page.keyboard.press('Enter');
    await sleep(1000);

    // Save
    await page.mouse.click(1289, 833);  // Save Trigger
    await sleep(2000);

    console.log('   SUCCESS!');

    // Back
    await page.mouse.click(118, 27);
    await sleep(2000);
  }

  console.log('\n=== DONE ===');
  console.log('Browser staying open for review...\n');

  await sleep(300000);
  await browser.close();
})();
