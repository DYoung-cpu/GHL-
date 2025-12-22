/**
 * Use JavaScript to find and click the trigger element
 *
 * The coordinate-based approach isn't working reliably.
 * Let's try using page.evaluate() to find elements.
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== JS-BASED TRIGGER CLICK ===\n');

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

  // Click on first workflow to open it
  console.log('[1] Opening first workflow...');
  await page.mouse.click(415, 371);
  await sleep(4000);

  if (!page.url().includes('/workflow/')) {
    console.log('ERROR: Not in workflow editor');
    await sleep(60000);
    return;
  }

  console.log('In workflow editor: ' + page.url());
  await page.screenshot({ path: './screenshots/js-01-editor.png' });

  // Try to find any clickable element that looks like trigger
  console.log('[2] Searching for trigger element...');

  const elements = await page.evaluate(() => {
    // Find all elements and log their details
    const allElements = document.querySelectorAll('*');
    const results = [];
    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = el.textContent || '';
      const tagName = el.tagName;
      // Look for trigger-related elements
      if (text.includes('Trigger') || text.includes('trigger') ||
          el.className.includes('trigger') || el.id.includes('trigger')) {
        results.push({
          tag: tagName,
          id: el.id,
          className: el.className,
          text: text.substring(0, 100),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
      }
    });
    return results;
  });

  console.log('Found elements:', elements.length);
  elements.forEach(el => {
    console.log(`  - ${el.tag} #${el.id} .${el.className.substring(0,50)} @ (${Math.round(el.x)}, ${Math.round(el.y)})`);
  });

  // Try clicking on text containing "Add New Trigger" using locator
  console.log('[3] Trying to click Add New Trigger...');
  try {
    await page.locator('text=Add New Trigger').click({ timeout: 5000 });
    console.log('   Clicked using text locator!');
    await sleep(3000);
  } catch (e) {
    console.log('   Text locator failed, trying other methods...');
  }
  await page.screenshot({ path: './screenshots/js-02-after-text-click.png' });

  // Try clicking on any element with trigger-related class
  console.log('[4] Trying SVG/canvas element click...');
  try {
    // GHL uses react-flow for the canvas. Try clicking the node
    await page.locator('.react-flow__node').first().click({ timeout: 5000 });
    console.log('   Clicked react-flow node!');
    await sleep(3000);
  } catch (e) {
    console.log('   react-flow node click failed');
  }
  await page.screenshot({ path: './screenshots/js-03-after-flow-click.png' });

  // Try force clicking at coordinates
  console.log('[5] Trying force click at trigger location...');
  await page.mouse.click(700, 155, { force: true });
  await sleep(3000);
  await page.screenshot({ path: './screenshots/js-04-force-click.png' });

  // Try clicking using document.elementFromPoint
  console.log('[6] Using elementFromPoint...');
  await page.evaluate(() => {
    const el = document.elementFromPoint(700, 155);
    if (el) {
      console.log('Element at (700, 155):', el.tagName, el.className);
      el.click();
    }
  });
  await sleep(3000);
  await page.screenshot({ path: './screenshots/js-05-element-click.png' });

  console.log('\n=== DONE ===');
  console.log('Check js-01 through js-05 screenshots');
  console.log('Browser staying open.\n');

  await sleep(600000);
  await browser.close();
})();
