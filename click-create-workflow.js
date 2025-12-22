/**
 * Simple script - just click Create Workflow button using coordinates
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('Direct Click Test\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

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
    console.log('Logged in!');

    // Switch account
    const sw = page.locator('text=Click here to switch');
    if (await sw.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sw.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(5000);
    }
    console.log('In LENDWISE account!');

    // Go to workflows
    console.log('Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);

    // Wait for the page to FULLY load - look for the button
    console.log('Waiting for Create Workflow button...');
    await page.waitForSelector('button:has-text("Create Workflow")', { timeout: 60000, state: 'visible' });
    console.log('Button found!');

    await page.screenshot({ path: './screenshots/click-test-1-loaded.png' });

    // Get button position
    const btn = page.locator('button:has-text("Create Workflow")').first();
    const box = await btn.boundingBox();
    console.log(`Button position: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);

    // Try multiple click methods
    console.log('\n--- Attempting clicks ---\n');

    // Method 1: Standard click
    console.log('1. Standard click...');
    await btn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: './screenshots/click-test-2-standard.png' });

    // Check if anything opened
    let dropdownOpen = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
    console.log(`   Dropdown visible: ${dropdownOpen}`);

    if (!dropdownOpen) {
      // Method 2: Force click
      console.log('2. Force click...');
      await btn.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/click-test-3-force.png' });
      dropdownOpen = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
      console.log(`   Dropdown visible: ${dropdownOpen}`);
    }

    if (!dropdownOpen) {
      // Method 3: JavaScript click
      console.log('3. JavaScript click...');
      await btn.evaluate(el => el.click());
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/click-test-4-js.png' });
      dropdownOpen = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
      console.log(`   Dropdown visible: ${dropdownOpen}`);
    }

    if (!dropdownOpen) {
      // Method 4: Mouse click on coordinates
      console.log('4. Coordinate click...');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/click-test-5-coord.png' });
      dropdownOpen = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
      console.log(`   Dropdown visible: ${dropdownOpen}`);
    }

    if (!dropdownOpen) {
      // Method 5: Double click
      console.log('5. Double click...');
      await btn.dblclick();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/click-test-6-dblclick.png' });
      dropdownOpen = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
      console.log(`   Dropdown visible: ${dropdownOpen}`);
    }

    // Final state
    console.log('\n--- Result ---');
    console.log(`Dropdown opened: ${dropdownOpen}`);

    if (dropdownOpen) {
      console.log('Clicking Start from Scratch...');
      await page.locator('text=Start from Scratch').first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: './screenshots/click-test-7-scratch.png' });
    }

    console.log('\nBrowser open for 120 seconds...');
    await page.waitForTimeout(120000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/click-test-error.png' });
  } finally {
    await browser.close();
  }
})();
