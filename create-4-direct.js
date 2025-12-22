/**
 * Create 4 more workflows - direct URL navigation (skip account switch)
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/dir-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('Create 4 More Workflows (Direct URL)\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let success = 0;

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

    // Skip account switch - go directly to workflows URL
    console.log('[2] Going directly to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000);
    await ss(page, 'workflows-page');
    console.log('   Done!\n');

    // Create 4 workflows
    console.log('[3] Creating 4 workflows...\n');

    for (let i = 1; i <= 4; i++) {
      console.log(`[${i}/4] Creating workflow...`);

      try {
        // Make sure on workflows page
        if (!page.url().includes('/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(8000);
        }

        // Click "+ Create Workflow" button at (1257, 138)
        console.log('   Clicking + Create Workflow...');
        await page.mouse.click(1257, 138);
        await page.waitForTimeout(2500);
        await ss(page, `${i}-dropdown`);

        // Try to click "Start from Scratch" - multiple positions
        const positions = [
          { x: 1200, y: 190 },
          { x: 1200, y: 200 },
          { x: 1200, y: 215 },
          { x: 1180, y: 205 },
          { x: 1220, y: 205 },
        ];

        let created = false;
        for (const pos of positions) {
          console.log(`   Trying (${pos.x}, ${pos.y})...`);
          await page.mouse.click(pos.x, pos.y);
          await page.waitForTimeout(2000);

          const url = page.url();
          if (url.includes('/workflow/')) {
            console.log('   SUCCESS!');
            created = true;
            success++;
            await ss(page, `${i}-created`);
            break;
          }
        }

        if (!created) {
          console.log('   Failed this attempt');
          await ss(page, `${i}-failed`);
        }

        // Go back for next iteration
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(6000);

      } catch (err) {
        console.log(`   Error: ${err.message}`);
        await ss(page, `${i}-error`);
      }

      console.log('');
    }

    // Final
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'final');

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log(`\nResult: ${success}/4 new workflows`);
  console.log(`Total: ${11 + success}/15`);
  console.log('\nBrowser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
