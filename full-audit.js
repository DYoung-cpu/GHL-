/**
 * Full audit - screenshot all 3 pages
 */
const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('Full Workflow Audit\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto('https://app.gohighlevel.com/');
  await page.waitForTimeout(3000);
  const iframe = await page.$('#g_id_signin iframe');
  if (iframe) {
    const frame = await iframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await page.waitForTimeout(4000);
  const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (gp) {
    await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
    await gp.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    try {
      await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
      await gp.fill('input[type="password"]:visible', 'Fafa2185!');
      await gp.keyboard.press('Enter');
    } catch(e) {}
    await page.waitForTimeout(10000);
  }

  // Go to workflows
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await page.waitForTimeout(6000);

  // Page 1
  console.log('Screenshot page 1...');
  await page.screenshot({ path: './screenshots/audit-p1.png', fullPage: true });

  // Page 2
  console.log('Screenshot page 2...');
  await page.mouse.click(1157, 860);  // Next
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/audit-p2.png', fullPage: true });

  // Page 3
  console.log('Screenshot page 3...');
  await page.mouse.click(1157, 860);  // Next
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/audit-p3.png', fullPage: true });

  console.log('\nDone! Check audit-p1.png, audit-p2.png, audit-p3.png');

  await page.waitForTimeout(5000);
  await browser.close();
})();
