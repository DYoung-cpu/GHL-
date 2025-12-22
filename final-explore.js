/**
 * Final exploration - properly open and configure existing trigger
 *
 * The workflows ALREADY have Contact Tag triggers.
 * We need to click on the trigger block to edit it and add the tag filter.
 *
 * From workflow-builder.png: The trigger block when empty shows "+ Add New Trigger"
 * When configured, it shows the trigger icon and type.
 *
 * In v2-3-config.png: Shows a trigger with diamond icon, clicking it opens config panel.
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== FINAL TAG DROPDOWN EXPLORATION ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
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

  // Go to workflows - go to page 2 to find a workflow that might be in different state
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(5000);

  // Open "New Lead Nurture" workflow (should be on page 1 or 2)
  console.log('[1] Searching for New Lead Nurture...');
  await page.mouse.click(1200, 239);  // Click search
  await sleep(500);
  await page.keyboard.type('new lead');
  await sleep(2000);

  // Click the result
  await page.mouse.click(400, 371);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Not in workflow editor. URL:', page.url());
    await page.screenshot({ path: './screenshots/final-error.png' });
    await sleep(60000);
    return;
  }

  await page.screenshot({ path: './screenshots/final-01-workflow.png' });
  console.log('Screenshot: final-01-workflow.png');

  // The trigger block should be at the top. Let's try clicking directly in the
  // center of where the trigger block appears (based on workflow-builder.png)
  console.log('[2] Clicking on trigger block at canvas center-top...');
  await page.mouse.click(700, 155);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/final-02-after-click.png' });

  // If panel didn't open, try double-clicking
  console.log('[3] Trying double-click...');
  await page.mouse.dblclick(700, 155);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/final-03-dblclick.png' });

  // If still no panel, let's see what's on the canvas and try clicking elsewhere
  // Maybe the zoom is different. Let's click on the left sidebar trigger icon
  console.log('[4] Trying sidebar trigger icon (left panel)...');
  await page.mouse.click(29, 129);  // Trigger icon in left sidebar
  await sleep(2000);
  await page.screenshot({ path: './screenshots/final-04-sidebar.png' });

  // Or try the top-left where "Add New Trigger" text might be
  console.log('[5] Trying where Add New Trigger text appears...');
  await page.mouse.click(620, 153);
  await sleep(2000);
  await page.screenshot({ path: './screenshots/final-05-text-area.png' });

  // Try clicking on "+" button which shows after trigger
  console.log('[6] Clicking on + button...');
  await page.mouse.click(700, 250);
  await sleep(2000);
  await page.screenshot({ path: './screenshots/final-06-plus.png' });

  console.log('\n=== SCREENSHOTS CAPTURED ===');
  console.log('Check final-01 through final-06 in screenshots folder');
  console.log('Browser staying open. Manually click on trigger to see panel.\n');

  await sleep(600000);
  await browser.close();
})();
