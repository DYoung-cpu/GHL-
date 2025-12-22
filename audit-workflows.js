/**
 * Audit workflows - screenshot both pages to see current state
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('Audit Workflows\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('[1] Logging in...');
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
    console.log('   Done!\n');

    // Go to workflows
    console.log('[2] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000);

    // Screenshot page 1
    await page.screenshot({ path: './screenshots/audit-page1.png', fullPage: true });
    console.log('   Page 1 captured\n');

    // Click Next to go to page 2
    console.log('[3] Going to page 2...');
    await page.mouse.click(1157, 860);  // "Next" button
    await page.waitForTimeout(5000);

    // Screenshot page 2
    await page.screenshot({ path: './screenshots/audit-page2.png', fullPage: true });
    console.log('   Page 2 captured\n');

    console.log('Done! Check screenshots/audit-page1.png and audit-page2.png');

  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\nBrowser closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
