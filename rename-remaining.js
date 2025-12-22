/**
 * Rename remaining 5 workflows that still have "New Workflow : [number]" names
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// The 5 names we still need to apply
const REMAINING_NAMES = [
  'Application Process Updates',
  'Underwriting Status Updates',
  'Conditional Approval Celebration',
  'Clear to Close Celebration',
  'Closing Countdown Sequence'
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/rem2-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('Rename Remaining 5 Workflows\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let renamed = 0;

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
    await ss(page, 'list-start');
    console.log('   Done!\n');

    // Rename remaining workflows
    console.log('[3] Renaming remaining workflows...\n');

    for (let i = 0; i < REMAINING_NAMES.length; i++) {
      const newName = REMAINING_NAMES[i];
      console.log(`[${i + 1}/5] Renaming to "${newName}"`);

      try {
        // Make sure on workflows list
        if (!page.url().includes('/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(8000);
        }

        // Find and click on a "New Workflow" row using page.evaluate
        // This avoids the coordinate/scrolling issues
        console.log('   Finding unrenamed workflow...');

        const clicked = await page.evaluate(() => {
          // Find all rows with "New Workflow :" in the name
          const rows = document.querySelectorAll('tr, [class*="workflow-row"], [class*="WorkflowRow"]');
          for (const row of rows) {
            const nameCell = row.querySelector('td, [class*="name"]');
            if (nameCell && nameCell.textContent.includes('New Workflow :')) {
              // Click on it
              row.click();
              return true;
            }
          }

          // Alternative: find any link/clickable containing "New Workflow"
          const links = document.querySelectorAll('a, [role="link"], [class*="clickable"]');
          for (const link of links) {
            if (link.textContent.includes('New Workflow :')) {
              link.click();
              return true;
            }
          }

          return false;
        });

        if (!clicked) {
          // Try coordinate approach with scrolling
          // Scroll down to see more workflows
          console.log('   JS click failed, trying scroll + coordinate...');
          await page.mouse.wheel(0, 300);  // Scroll down
          await page.waitForTimeout(1000);

          // Try clicking on visible "New Workflow" rows
          // Rows start at y~370, each 68px
          for (let row = 0; row < 7; row++) {
            const y = 370 + (row * 68);
            await page.mouse.click(430, y);
            await page.waitForTimeout(2000);

            if (page.url().includes('/workflow/')) {
              break;
            }
          }
        }

        await page.waitForTimeout(3000);

        // Check if in workflow editor
        const url = page.url();
        if (url.includes('/workflow/')) {
          console.log('   In workflow editor!');
          await ss(page, `${i + 1}-editor`);

          // Click on workflow name (top center, ~686, 27)
          console.log('   Clicking name field...');
          await page.mouse.click(686, 27);
          await page.waitForTimeout(1000);

          // Select all and type new name
          await page.keyboard.press('Control+a');
          await page.waitForTimeout(300);
          await page.keyboard.type(newName);
          await page.waitForTimeout(500);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);

          await ss(page, `${i + 1}-renamed`);
          renamed++;
          console.log('   SUCCESS!\n');

          // Go back to workflows list
          await page.mouse.click(118, 27);  // "< Back to Workflows"
          await page.waitForTimeout(4000);

        } else {
          console.log('   Could not open workflow editor');
          await ss(page, `${i + 1}-failed`);
        }

      } catch (err) {
        console.log(`   Error: ${err.message}\n`);
        await ss(page, `${i + 1}-error`);
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(5000);
      }
    }

    // Final
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'final');

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log(`\nResult: ${renamed}/5 renamed`);
  console.log('Browser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
