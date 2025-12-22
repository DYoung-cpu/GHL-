/**
 * Direct workflow navigation using known workflow ID
 *
 * From v2-explore run: workflow ID = bda4857d-a537-4286-a7ca-2cce4ae97f6b
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOW_ID = 'bda4857d-a537-4286-a7ca-2cce4ae97f6b';  // Application Process Updates

(async () => {
  console.log('=== DIRECT WORKFLOW NAVIGATION ===\n');

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

  // Go directly to the workflow by ID
  const workflowUrl = `https://app.gohighlevel.com/location/${LOCATION_ID}/workflow/${WORKFLOW_ID}`;
  console.log('[1] Navigating directly to workflow:', workflowUrl);
  await page.goto(workflowUrl);
  await sleep(5000);

  console.log('Current URL:', page.url());
  await page.screenshot({ path: './screenshots/direct-01-loaded.png' });

  // Now try clicking on the trigger block at various positions
  // The trigger block in workflow-builder.png shows "+ Add New Trigger" at around (700, 153)
  console.log('[2] Clicking trigger block...');
  await page.mouse.click(700, 153);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/direct-02-clicked.png' });

  // Check if panel opened by looking at screenshot
  // If not, try clicking at the text "Add New Trigger" area more precisely
  console.log('[3] Clicking at slightly different position...');
  await page.mouse.click(680, 155);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/direct-03-clicked2.png' });

  // Try one more position - maybe slightly lower
  console.log('[4] Clicking lower in trigger area...');
  await page.mouse.click(700, 170);
  await sleep(3000);
  await page.screenshot({ path: './screenshots/direct-04-clicked3.png' });

  console.log('\n=== DONE ===');
  console.log('Check direct-01 through direct-04 screenshots');
  console.log('Browser open. Manually explore to find correct click position.\n');

  await sleep(600000);
  await browser.close();
})();
