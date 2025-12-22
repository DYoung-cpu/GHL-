/**
 * Pure coordinate-based clicking
 * Based on 1400x900 viewport screenshots:
 * - Continue button: approximately (788, 422)
 * - Create Workflow button: approximately (1235, 165)
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const WORKFLOWS = [
  'New Lead Nurture Sequence',
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification'
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/coord-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('Coordinate-Based Clicks\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let success = 0;

  try {
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
    console.log('Logged in!\n');

    // Switch account
    console.log('Switching account...');
    const sw = page.locator('text=Click here to switch');
    if (await sw.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sw.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(5000);
    }
    console.log('In account!\n');

    // Go to workflows
    console.log('Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(10000); // Long wait for full load
    await ss(page, 'page-loaded');

    // Create workflows using coordinates
    console.log('\nCreating workflows with coordinate clicks...\n');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      const name = WORKFLOWS[i];
      console.log(`[${i+1}] "${name}"`);

      try {
        // Make sure on workflows page
        if (!page.url().includes('/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(8000);
        }

        // Click Continue button at center (approx 788, 422)
        console.log('   Clicking Continue (788, 422)...');
        await page.mouse.click(788, 422);
        await page.waitForTimeout(3000);
        await ss(page, `${i+1}-after-continue`);

        // Check if we need to enter a name
        // Try clicking where a name input might be and typing
        // Or check URL to see if we're in workflow editor
        const url = page.url();
        console.log(`   URL: ${url}`);

        if (url.includes('/workflow/')) {
          console.log('   In workflow editor!');

          // Try using page.evaluate to find and interact with elements
          const hasNameInput = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
              if (input.placeholder && input.placeholder.toLowerCase().includes('name')) {
                return true;
              }
            }
            return false;
          });

          if (hasNameInput) {
            console.log('   Found name input via JS!');
            await page.evaluate((wfName) => {
              const inputs = document.querySelectorAll('input');
              for (const input of inputs) {
                if (input.placeholder && input.placeholder.toLowerCase().includes('name')) {
                  input.value = wfName;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  break;
                }
              }
            }, name);
            await page.waitForTimeout(1000);
          }

          // Try to click a save button using JS
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              const text = btn.textContent.toLowerCase();
              if (text.includes('save') || text.includes('publish')) {
                btn.click();
                return true;
              }
            }
            return false;
          });
          await page.waitForTimeout(2000);

          success++;
          console.log('   SUCCESS!\n');
        } else {
          console.log('   Not in workflow editor, trying again...\n');
        }

        // Go back
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(8000);

      } catch (err) {
        console.log(`   Error: ${err.message}\n`);
        await ss(page, `${i+1}-error`);
      }
    }

    await ss(page, 'final');
    console.log(`\nResult: ${success}/${WORKFLOWS.length}\n`);

  } catch (e) {
    console.error('Fatal:', e.message);
    await ss(page, 'fatal');
  }

  console.log('Browser open 120s...');
  await page.waitForTimeout(120000);
  await browser.close();
})();
