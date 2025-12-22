/**
 * Careful exploration of tag filter UI
 *
 * Take more screenshots at each step to understand the UI better
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== CAREFUL TAG FILTER EXPLORATION ===\n');

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
    await page.screenshot({ path: './screenshots/careful-error.png' });
    await sleep(60000);
    return;
  }

  await page.screenshot({ path: './screenshots/careful-01-in-workflow.png' });
  console.log('Screenshot: careful-01-in-workflow.png');

  // Click Add New Trigger
  console.log('[2] Clicking Add New Trigger button...');
  await page.mouse.click(700, 153);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/careful-02-trigger-panel.png' });

  // Search for tag
  console.log('[3] Typing "tag"...');
  await page.keyboard.type('tag');
  await sleep(2000);
  await page.screenshot({ path: './screenshots/careful-03-searched.png' });

  // Click Contact Tag option
  console.log('[4] Clicking Contact Tag...');
  await page.mouse.click(950, 405);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/careful-04-contact-tag-selected.png' });

  // Now we should see the config panel with + Add filters
  // The panel should be visible. Click + Add filters (look at careful-04 for position)
  console.log('[5] Looking for + Add filters link...');
  // Based on v2-3-config.png, + Add filters is around (553, 422)
  await page.mouse.click(553, 422);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/careful-05-filters-added.png' });

  // Now there should be a FILTERS section with Select dropdown
  // Click the Select dropdown - should be around (712, 446)
  console.log('[6] Clicking Select dropdown...');
  await page.mouse.click(712, 446);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/careful-06-select-opened.png' });

  // Look for Tag option and click it
  console.log('[7] Looking for Tag option in dropdown...');
  // If dropdown is open, Tag should be visible. Try clicking around where Tag might be
  // Dropdown items usually appear below the dropdown
  await page.mouse.click(712, 500);  // Try clicking first option area
  await sleep(2000);
  await page.screenshot({ path: './screenshots/careful-07-option-clicked.png' });

  // After selecting Tag, there should be another field for tag value
  // Take another screenshot to see current state
  await sleep(2000);
  await page.screenshot({ path: './screenshots/careful-08-after-select.png' });

  console.log('\n=== EXPLORATION COMPLETE ===');
  console.log('Check careful-01 through careful-08 in screenshots folder');
  console.log('Browser staying open. Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
