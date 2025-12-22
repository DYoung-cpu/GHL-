/**
 * Explore tag dropdown - V2
 * Double-click to open workflow and explore the tag selection UI
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== EXPLORE TAG DROPDOWN V2 ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
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
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(5000);

  // Double-click to open the first workflow
  console.log('[STEP 1] Double-clicking Application Process Updates...');
  await page.mouse.dblclick(415, 371);
  await sleep(5000);

  // Check if we entered the workflow
  const url = page.url();
  console.log('Current URL:', url);

  if (!url.includes('/workflow/')) {
    console.log('ERROR: Did not enter workflow. Trying click on name text...');
    // Try clicking more to the left where the name link is
    await page.mouse.click(415, 371);
    await sleep(3000);
    console.log('New URL:', page.url());
  }

  await page.screenshot({ path: './screenshots/v2-1-opened.png' });
  console.log('Screenshot: v2-1-opened.png');

  if (!page.url().includes('/workflow/')) {
    console.log('\nStill on list page. Manual intervention needed.');
    console.log('Browser staying open. Try opening a workflow manually.\n');
    await sleep(600000);
    await browser.close();
    return;
  }

  // Now we're in the workflow editor
  console.log('\n[STEP 2] In workflow editor! Clicking Add New Trigger...');
  await page.mouse.click(700, 153);
  await sleep(2000);

  // Search for tag
  await page.keyboard.type('tag');
  await sleep(1500);
  await page.screenshot({ path: './screenshots/v2-2-search.png' });

  // Click Contact Tag
  console.log('[STEP 3] Selecting Contact Tag...');
  await page.mouse.click(950, 405);
  await sleep(2000);
  await page.screenshot({ path: './screenshots/v2-3-config.png' });

  // Now click + Add filters (should be around y=427)
  console.log('[STEP 4] Clicking + Add filters...');
  await page.mouse.click(560, 427);
  await sleep(2000);
  await page.screenshot({ path: './screenshots/v2-4-filters.png' });

  // Look for a filter selector/dropdown
  // There should be a field to select which filter to add
  console.log('[STEP 5] Looking for tag filter input...');
  await page.screenshot({ path: './screenshots/v2-5-state.png' });

  // Type in any active input
  await page.keyboard.type('New Lead');
  await sleep(2000);
  await page.screenshot({ path: './screenshots/v2-6-typed.png' });

  console.log('\n=== SCREENSHOTS CAPTURED ===');
  console.log('Check v2-1 through v2-6 in screenshots folder');
  console.log('Browser staying open for inspection. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
