/**
 * Debug script - just try to click Create Workflow and see what happens
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOWS_URL = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`;

async function ss(page, name) {
  await page.screenshot({ path: `./screenshots/debug-${name}.png`, fullPage: true });
  console.log(`[screenshot: ${name}]`);
}

(async () => {
  console.log('DEBUG: Create Workflow Button\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Quick login
    console.log('1. Logging in...');
    await page.goto('https://app.gohighlevel.com/');
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(4000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(4000);
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch(e) {}
      await page.waitForTimeout(8000);
    }
    console.log('   Logged in!\n');

    // Switch account
    console.log('2. Switching account...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(5000);
    }
    console.log('   In LENDWISE account!\n');

    // Go to workflows
    console.log('3. Going to workflows page...');
    await page.goto(WORKFLOWS_URL);
    await page.waitForTimeout(5000);
    await ss(page, '01-workflows-page');
    console.log('   On workflows page!\n');

    // Find and analyze the Create Workflow button
    console.log('4. Analyzing Create Workflow button...');

    // Get all buttons on page
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons on page`);

    // Find the Create Workflow button
    for (const btn of buttons) {
      const text = await btn.textContent().catch(() => '');
      if (text.includes('Create Workflow')) {
        console.log(`   Found button: "${text.trim()}"`);
        const box = await btn.boundingBox();
        if (box) {
          console.log(`   Position: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
        }

        // Get the button's HTML
        const html = await btn.evaluate(el => el.outerHTML);
        console.log(`   HTML: ${html.substring(0, 200)}...`);
      }
    }

    // Try clicking the button
    console.log('\n5. Clicking Create Workflow button...');
    const createBtn = page.locator('button:has-text("Create Workflow")').first();

    if (await createBtn.isVisible()) {
      console.log('   Button is visible, clicking...');
      await createBtn.click();
      await page.waitForTimeout(3000);
      await ss(page, '02-after-click');

      // Check what appeared
      console.log('\n6. Checking what appeared...');

      // Check for dropdown menu
      const dropdownItems = await page.$$('[role="menuitem"], [role="option"], .dropdown-item, [class*="dropdown"] li, [class*="menu"] li');
      console.log(`   Found ${dropdownItems.length} dropdown/menu items`);

      for (const item of dropdownItems.slice(0, 5)) {
        const text = await item.textContent().catch(() => '');
        console.log(`   - "${text.trim()}"`);
      }

      // Check for modal
      const modals = await page.$$('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
      console.log(`   Found ${modals.length} modal elements`);

      // Check for any new inputs
      const inputs = await page.$$('input[type="text"]:visible');
      console.log(`   Found ${inputs.length} visible text inputs`);

      // Check for "Start from Scratch" text anywhere
      const scratch = await page.locator('text=Start from Scratch').count();
      console.log(`   "Start from Scratch" found ${scratch} times`);

      // Take another screenshot after analysis
      await ss(page, '03-analysis');

    } else {
      console.log('   Button NOT visible!');
    }

    // Try clicking with coordinates
    console.log('\n7. Trying coordinate click at (1235, 165)...');
    await page.mouse.click(1235, 165);
    await page.waitForTimeout(2000);
    await ss(page, '04-coord-click');

    console.log('\n8. Checking page state after coordinate click...');
    const dropdownAfter = await page.$$('[role="menuitem"], [role="option"]');
    console.log(`   Menu items: ${dropdownAfter.length}`);

    await ss(page, '05-final');

    console.log('\nDone! Check screenshots.\n');
    console.log('Keeping browser open for 120 seconds for manual inspection...');
    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('Error:', error.message);
    await ss(page, 'error');
  } finally {
    await browser.close();
  }
})();
