/**
 * Click test v2 - try multiple selectors and coordinate clicks
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('Click Test v2\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Quick login
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

    // Wait for page content
    console.log('Waiting for page...');
    await page.waitForSelector('text=Workflows', { timeout: 30000 });
    await page.waitForTimeout(5000); // Extra wait for full load

    await page.screenshot({ path: './screenshots/v2-1-loaded.png' });
    console.log('Page loaded!');

    // Try to find Create Workflow with various selectors
    console.log('\n--- Finding Create Workflow button ---\n');

    const selectors = [
      'text=Create Workflow',
      'text="Create Workflow"',
      ':text("Create Workflow")',
      '[class*="create"] >> text=Workflow',
      'div:has-text("Create Workflow")',
      'span:has-text("Create Workflow")',
      'a:has-text("Create Workflow")',
      'role=button[name="Create Workflow"]',
      '[data-testid*="create"]'
    ];

    let foundElement = null;
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
        const count = await page.locator(sel).count();
        console.log(`${sel}: visible=${visible}, count=${count}`);
        if (visible && !foundElement) {
          foundElement = el;
        }
      } catch (e) {
        console.log(`${sel}: error`);
      }
    }

    // Also check what's at the expected coordinates
    console.log('\n--- Checking by coordinates ---\n');

    // The button appears to be around x=1235, y=165 in a 1400x900 viewport
    // Let's look for elements in that area
    const elements = await page.$$('*');
    console.log(`Total elements on page: ${elements.length}`);

    // Find elements containing "Create Workflow" text
    const createWorkflowElements = await page.$$('text=Create Workflow');
    console.log(`Elements with "Create Workflow" text: ${createWorkflowElements.length}`);

    for (let i = 0; i < createWorkflowElements.length; i++) {
      const el = createWorkflowElements[i];
      const box = await el.boundingBox();
      const tag = await el.evaluate(e => e.tagName);
      const classes = await el.evaluate(e => e.className);
      console.log(`  [${i}] <${tag}> class="${classes}" box=${box ? `x:${box.x} y:${box.y} w:${box.width} h:${box.height}` : 'null'}`);
    }

    console.log('\n--- Attempting clicks ---\n');

    // Method 1: Click first visible "Create Workflow" text
    if (createWorkflowElements.length > 0) {
      console.log('1. Clicking first "Create Workflow" element...');
      await createWorkflowElements[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/v2-2-click1.png' });

      // Check result
      const scratch = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
      const modal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`   Dropdown/Start from Scratch: ${scratch}`);
      console.log(`   Modal: ${modal}`);
    }

    // Method 2: Coordinate click at expected location
    console.log('2. Coordinate click at (1235, 165)...');
    await page.mouse.click(1235, 165);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: './screenshots/v2-3-coord.png' });

    const scratch2 = await page.locator('text=Start from Scratch').isVisible().catch(() => false);
    console.log(`   Start from Scratch visible: ${scratch2}`);

    // If dropdown appeared, click Start from Scratch
    if (scratch2) {
      console.log('\n--- Dropdown opened! ---\n');
      await page.locator('text=Start from Scratch').first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: './screenshots/v2-4-scratch.png' });

      // Check for name input
      const nameInput = await page.locator('input').first().isVisible().catch(() => false);
      console.log(`Name input visible: ${nameInput}`);
    }

    console.log('\nBrowser open 120s...');
    await page.waitForTimeout(120000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/v2-error.png' });
  } finally {
    await browser.close();
  }
})();
