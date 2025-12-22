/**
 * Create 4 more workflows to reach 15 total
 * Try multiple click positions for "Start from Scratch"
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/more-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('Create 4 More Workflows\n');

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

    // Switch account
    console.log('[2] Switching account...');
    const sw = page.locator('text=Click here to switch');
    if (await sw.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sw.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(5000);
    }
    console.log('   Done!\n');

    // Create 4 workflows
    console.log('[3] Creating 4 workflows...\n');

    for (let i = 1; i <= 4; i++) {
      console.log(`[${i}/4] Creating workflow...`);

      try {
        // Go to workflows page
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(8000);

        // Click "+ Create Workflow" button
        console.log('   Clicking + Create Workflow...');
        await page.mouse.click(1257, 138);
        await page.waitForTimeout(2500);
        await ss(page, `${i}-after-btn`);

        // Try multiple positions for "Start from Scratch"
        // The dropdown can appear in slightly different positions
        const scratchPositions = [
          { x: 1200, y: 195 },  // Higher
          { x: 1200, y: 210 },  // Middle
          { x: 1200, y: 225 },  // Lower
          { x: 1180, y: 200 },  // Left
        ];

        let created = false;
        for (const pos of scratchPositions) {
          if (created) break;

          console.log(`   Trying click at (${pos.x}, ${pos.y})...`);
          await page.mouse.click(pos.x, pos.y);
          await page.waitForTimeout(2000);

          // Check if we're in workflow editor
          const url = page.url();
          if (url.includes('/workflow/')) {
            console.log('   SUCCESS - In workflow editor!');
            created = true;
            success++;
            await ss(page, `${i}-success`);
            break;
          }
        }

        if (!created) {
          console.log('   Failed to create workflow');
          await ss(page, `${i}-failed`);
        }

      } catch (err) {
        console.log(`   Error: ${err.message}`);
        await ss(page, `${i}-error`);
      }

      console.log('');
    }

    // Final screenshot
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'final');

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log(`Result: ${success}/4 new workflows created`);
  console.log('Total should now be: ' + (11 + success) + '/15');
  console.log('\nBrowser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
