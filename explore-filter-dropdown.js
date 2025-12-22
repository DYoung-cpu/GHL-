/**
 * Explore the filter dropdown to find tag selection
 *
 * From v2-4-filters.png, we see:
 * - "FILTERS" section with "Select" dropdown at ~(710, 446)
 * - Need to click Select dropdown, choose "Tag", then select specific tag
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== EXPLORE FILTER DROPDOWN ===\n');

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

  // Double-click to open first workflow
  console.log('[STEP 1] Opening workflow...');
  await page.mouse.dblclick(415, 371);
  await sleep(3000);
  await page.mouse.click(415, 371);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Not in workflow editor');
    await sleep(60000);
    return;
  }

  // Add Contact Tag trigger
  console.log('[STEP 2] Adding Contact Tag trigger...');
  await page.mouse.click(700, 153);  // Add New Trigger
  await sleep(2000);
  await page.keyboard.type('tag');
  await sleep(1500);
  await page.mouse.click(950, 405);  // Contact Tag
  await sleep(2000);

  // Click + Add filters
  console.log('[STEP 3] Clicking + Add filters...');
  await page.mouse.click(560, 422);  // + Add filters link
  await sleep(2000);
  await page.screenshot({ path: './screenshots/filter-1-added.png' });

  // Click on the "Select" dropdown
  console.log('[STEP 4] Clicking Select dropdown...');
  await page.mouse.click(710, 446);  // Select dropdown
  await sleep(2000);
  await page.screenshot({ path: './screenshots/filter-2-dropdown.png' });

  // Look for "Tag" option in the dropdown
  // Try scrolling/typing to find it
  console.log('[STEP 5] Searching for Tag option...');
  await page.keyboard.type('tag');
  await sleep(1500);
  await page.screenshot({ path: './screenshots/filter-3-search.png' });

  // Try clicking on tag option (should appear in dropdown)
  await page.keyboard.press('Enter');
  await sleep(2000);
  await page.screenshot({ path: './screenshots/filter-4-selected.png' });

  // Now there should be a second field to select the specific tag
  console.log('[STEP 6] Looking for tag value selector...');
  // After selecting "Tag" as filter, there should be another dropdown
  // Click on the new Select/input that appears
  await page.mouse.click(1100, 446);  // Where tag value selector might be
  await sleep(1500);
  await page.screenshot({ path: './screenshots/filter-5-value.png' });

  // Type tag name
  await page.keyboard.type('Application');
  await sleep(2000);
  await page.screenshot({ path: './screenshots/filter-6-typed.png' });

  console.log('\n=== SCREENSHOTS CAPTURED ===');
  console.log('Check filter-1 through filter-6 in screenshots folder');
  console.log('Browser staying open for inspection. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
