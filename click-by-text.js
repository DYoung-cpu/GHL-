const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11, 8) + '] ' + msg);

async function main() {
  log('=== CLICK BY TEXT TEST ===');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  try {
    log('Navigate to workflows');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(8000);

    // Check if still logged in
    if ((await page.content()).includes('Sign into your account')) {
      log('Auth expired - need to login again');
      await browser.close();
      return;
    }

    await page.screenshot({ path: 'screenshots/text-01-workflows.png' });

    // Use Playwright's click by role/text - more reliable than coordinates
    log('Looking for Create Workflow button...');

    // Method 1: Try getByRole
    try {
      const btn = page.getByRole('button', { name: /Create Workflow/i });
      const box = await btn.boundingBox();
      if (box) {
        log('Found button at: x=' + Math.round(box.x) + ' y=' + Math.round(box.y) + ' w=' + Math.round(box.width) + ' h=' + Math.round(box.height));
        log('Center: (' + Math.round(box.x + box.width/2) + ', ' + Math.round(box.y + box.height/2) + ')');

        log('Clicking button...');
        await btn.click();
        await sleep(2000);
        await page.screenshot({ path: 'screenshots/text-02-dropdown.png' });
        log('Dropdown should be open');

        // Find Start from Scratch
        const scratch = page.getByText('Start from Scratch');
        const scratchBox = await scratch.boundingBox();
        if (scratchBox) {
          log('Start from Scratch at: (' + Math.round(scratchBox.x + scratchBox.width/2) + ', ' + Math.round(scratchBox.y + scratchBox.height/2) + ')');
          await scratch.click();
          await sleep(4000);
          await page.screenshot({ path: 'screenshots/text-03-editor.png' });
          log('=== EDITOR OPENED ===');

          // Get editor element positions
          const elements = ['Add Trigger', 'Save', 'Publish', 'Test', 'Settings'];
          for (const el of elements) {
            try {
              const elem = page.getByText(el, { exact: false }).first();
              const box = await elem.boundingBox();
              if (box) {
                log(el + ': (' + Math.round(box.x + box.width/2) + ', ' + Math.round(box.y + box.height/2) + ')');
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      log('getByRole failed: ' + e.message);

      // Method 2: Try locator with text
      log('Trying locator method...');
      const btn = page.locator('button:has-text("Create Workflow"), [class*="button"]:has-text("Create Workflow")').first();
      await btn.click();
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/text-02-dropdown.png' });
    }

    await context.storageState({ path: 'ghl-auth.json' });
    log('Browser open 60s...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
