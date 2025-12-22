/**
 * Click on existing trigger block to open config panel
 *
 * The workflow already has a trigger - we need to click ON IT to edit
 * The trigger block is at approximately (705, 165) based on screenshots
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== CLICK TRIGGER BLOCK TO EDIT ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
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

  // Open first workflow
  console.log('[1] Opening workflow...');
  await page.mouse.dblclick(415, 371);
  await sleep(3000);
  await page.mouse.click(415, 371);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Not in workflow');
    await sleep(60000);
    return;
  }

  await page.screenshot({ path: './screenshots/block-01-workflow.png' });
  console.log('Screenshot: block-01-workflow.png');

  // Click directly on the trigger block (the dashed rectangle at top)
  // Based on screenshots, it's around (705, 165)
  console.log('[2] Clicking on trigger block to edit...');
  await page.mouse.click(705, 165);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/block-02-clicked.png' });

  // If that didn't work, try clicking a bit lower
  console.log('[3] Trying different position...');
  await page.mouse.click(705, 180);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/block-03-clicked2.png' });

  // Try clicking the text area of the trigger
  console.log('[4] Trying trigger text area...');
  await page.mouse.click(705, 200);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/block-04-clicked3.png' });

  console.log('\n=== DONE ===');
  console.log('Check block-01 through block-04 screenshots');
  console.log('Browser staying open. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
