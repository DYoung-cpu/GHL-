/**
 * Quick check of page 2 workflows
 */
const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
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
  await page.waitForTimeout(5000);
  await page.screenshot({ path: './screenshots/page1-check.png', fullPage: true });

  // Go to page 2 (use coordinate click, text selectors don't work)
  console.log('Going to page 2...');
  await page.mouse.click(1157, 860);  // "Next" button
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/page2-check.png', fullPage: true });

  console.log('Screenshots saved. Check page1-check.png and page2-check.png');

  await page.waitForTimeout(5000);
  await browser.close();
})();
