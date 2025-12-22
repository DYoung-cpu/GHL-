/**
 * Build remaining workflows - assumes list view with existing workflows
 * Click "+ Create Workflow" at (1257, 138), then "Start from Scratch"
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// We have 1 workflow already, need 14 more
const WORKFLOWS = [
  'New Lead Nurture Sequence',  // Will rename the existing one
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Application Process Updates',
  'Underwriting Status Updates',
  'Conditional Approval Celebration',
  'Clear to Close Celebration',
  'Closing Countdown Sequence',
  'Post-Close Nurture & Referral Sequence',
  'Realtor Partner Updates',
  'Rate Drop Alert Campaign',
  'Birthday Wishes',
  'Stale Lead Re-engagement'
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/rem-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('Build Remaining Workflows (List View)\n');

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

    // Go to workflows
    console.log('[3] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000); // Long wait
    await ss(page, 'start');
    console.log('   Done!\n');

    // Skip first one since we already have 1 workflow
    console.log('[4] Creating workflows (starting from #2)...\n');

    for (let i = 1; i < WORKFLOWS.length; i++) {  // Start from index 1
      const name = WORKFLOWS[i];
      console.log(`[${i}/${WORKFLOWS.length-1}] "${name}"`);

      try {
        // Make sure on workflows page
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(8000);

        // Click "+ Create Workflow" button (top right)
        console.log('   Clicking + Create Workflow at (1257, 138)...');
        await page.mouse.click(1257, 138);
        await page.waitForTimeout(3000);
        await ss(page, `${i}-after-btn`);

        // Click "Start from Scratch" if dropdown appeared
        // It usually appears below the button, around (1200, 200)
        console.log('   Looking for Start from Scratch...');
        await page.mouse.click(1200, 200);
        await page.waitForTimeout(2000);
        await ss(page, `${i}-after-scratch`);

        // Check URL
        const url = page.url();
        console.log(`   URL: ${url}`);

        if (url.includes('/workflow/')) {
          console.log('   In workflow editor! SUCCESS!\n');
          success++;
        } else {
          console.log('   Not in editor, trying direct navigation...\n');
        }

      } catch (err) {
        console.log(`   Error: ${err.message}\n`);
        await ss(page, `${i}-error`);
      }
    }

    // Final check - go to workflows and take screenshot
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'final');

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log(`\nResult: ${success} new workflows created`);
  console.log('Browser open 120s...');
  await page.waitForTimeout(120000);
  await browser.close();
})();
