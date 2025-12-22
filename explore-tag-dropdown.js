/**
 * Explore the tag dropdown in Contact Tag trigger
 *
 * Flow:
 * 1. Open a workflow
 * 2. Add Contact Tag trigger
 * 3. Click "+ Add filters"
 * 4. Look for tag input and take screenshots of dropdown
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== EXPLORE TAG DROPDOWN ===\n');

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

  // Click first workflow (Application Process Updates)
  console.log('[STEP 1] Opening Application Process Updates...');
  await page.mouse.click(400, 371);
  await sleep(4000);

  // Take screenshot of current state
  await page.screenshot({ path: './screenshots/explore-1-workflow.png' });
  console.log('Screenshot: explore-1-workflow.png');

  // Click Add New Trigger area
  console.log('[STEP 2] Clicking Add New Trigger...');
  await page.mouse.click(700, 153);
  await sleep(2000);

  // Type 'tag' to search
  await page.keyboard.type('tag');
  await sleep(1500);

  // Click Contact Tag
  console.log('[STEP 3] Selecting Contact Tag...');
  await page.mouse.click(950, 405);
  await sleep(2000);

  // Screenshot of config panel
  await page.screenshot({ path: './screenshots/explore-2-config.png' });
  console.log('Screenshot: explore-2-config.png');

  // The "+ Add filters" link should be around y=427 based on earlier screenshot
  // Let me click it
  console.log('[STEP 4] Clicking + Add filters...');
  await page.mouse.click(560, 427);
  await sleep(2000);

  // Screenshot after clicking filters
  await page.screenshot({ path: './screenshots/explore-3-filters.png' });
  console.log('Screenshot: explore-3-filters.png');

  // Now look for tag input field - there should be a dropdown or input
  // Try clicking in the filter area
  await page.mouse.click(900, 480);
  await sleep(1000);
  await page.screenshot({ path: './screenshots/explore-4-click.png' });

  // Type a tag name to trigger dropdown
  console.log('[STEP 5] Typing tag name to trigger dropdown...');
  await page.keyboard.type('New');
  await sleep(2000);

  // Screenshot showing dropdown
  await page.screenshot({ path: './screenshots/explore-5-dropdown.png' });
  console.log('Screenshot: explore-5-dropdown.png');

  console.log('\n=== SCREENSHOTS CAPTURED ===');
  console.log('Check explore-1 through explore-5 in screenshots folder');
  console.log('Browser staying open for inspection. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
