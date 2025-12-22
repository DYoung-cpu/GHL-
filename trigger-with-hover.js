const { chromium } = require('playwright');

/**
 * Try hover + click and other methods to activate trigger block
 */

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOW_ID = 'bda4857d-a537-4286-a7ca-2cce4ae97f6b'; // Application Process Updates

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   Screenshot: ${name}.png`);
}

(async () => {
  console.log('=== TRIGGER WITH HOVER/KEYBOARD ===\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const sleep = (ms) => page.waitForTimeout(ms);

  try {
    // ===== LOGIN =====
    console.log('[LOGIN] Starting...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await sleep(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await sleep(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch (e) {}
      await sleep(8000);
    }
    console.log('[LOGIN] Done!\n');

    // ===== GO DIRECTLY TO WORKFLOW =====
    const workflowUrl = `https://app.gohighlevel.com/location/${LOCATION_ID}/workflow/${WORKFLOW_ID}`;
    console.log('[1] Going directly to workflow:', workflowUrl);
    await page.goto(workflowUrl);
    await sleep(6000); // Wait longer for canvas to fully render
    await screenshot(page, 'hover-01-loaded');

    // Trigger block coordinates based on screenshots
    const triggerX = 700;
    const triggerY = 150;

    console.log('\n[2] Trying multiple click methods...\n');

    // Method 1: Hover first, then click
    console.log('Method 1: Hover + Click');
    await page.mouse.move(triggerX, triggerY);
    await sleep(1000);
    await screenshot(page, 'hover-02-hovering');
    await page.mouse.click(triggerX, triggerY);
    await sleep(2000);
    await screenshot(page, 'hover-03-after-click');

    // Check if panel opened
    let panelOpen = await page.locator('text=Add Trigger').isVisible({ timeout: 2000 }).catch(() => false);
    if (panelOpen) {
      console.log('   SUCCESS! Panel opened with hover+click');
    } else {
      console.log('   No panel opened');
    }

    // Method 2: Double-click (but careful - might zoom)
    console.log('\nMethod 2: Single click on border');
    // Try clicking on the left edge of the trigger box
    await page.mouse.click(580, 150);
    await sleep(2000);
    await screenshot(page, 'hover-04-border-click');
    panelOpen = await page.locator('text=Add Trigger').isVisible({ timeout: 2000 }).catch(() => false);
    if (panelOpen) console.log('   SUCCESS!');
    else console.log('   No panel');

    // Method 3: Click inside the dashed area at different points
    console.log('\nMethod 3: Click at multiple points inside trigger box');
    const points = [
      { x: 650, y: 130 },  // Upper left
      { x: 750, y: 130 },  // Upper right
      { x: 700, y: 170 },  // Bottom center
      { x: 620, y: 150 },  // Left edge
      { x: 780, y: 150 },  // Right edge
    ];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      console.log(`   Clicking at (${p.x}, ${p.y})...`);
      await page.mouse.click(p.x, p.y);
      await sleep(1500);
      panelOpen = await page.locator('text=Add Trigger').isVisible({ timeout: 1000 }).catch(() => false);
      if (panelOpen) {
        console.log(`   SUCCESS at point ${i+1}!`);
        await screenshot(page, `hover-05-success-point${i+1}`);
        break;
      }
    }

    // Method 4: Tab navigation
    console.log('\nMethod 4: Keyboard Tab navigation');
    await page.keyboard.press('Tab');
    await sleep(500);
    await page.keyboard.press('Tab');
    await sleep(500);
    await page.keyboard.press('Tab');
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(2000);
    await screenshot(page, 'hover-06-after-tab-enter');
    panelOpen = await page.locator('text=Add Trigger').isVisible({ timeout: 2000 }).catch(() => false);
    if (panelOpen) console.log('   SUCCESS!');
    else console.log('   No panel');

    // Method 5: Right-click context menu
    console.log('\nMethod 5: Right-click context menu');
    await page.mouse.click(700, 150, { button: 'right' });
    await sleep(2000);
    await screenshot(page, 'hover-07-right-click');

    // Method 6: Look for any clickable element via JS
    console.log('\nMethod 6: Find element at coordinates via JS');
    const elementInfo = await page.evaluate(() => {
      const el = document.elementFromPoint(700, 150);
      if (el) {
        return {
          tag: el.tagName,
          className: el.className,
          id: el.id,
          onclick: el.onclick ? 'has onclick' : 'no onclick',
          children: el.children.length,
          innerHTML: el.innerHTML.substring(0, 200)
        };
      }
      return null;
    });
    console.log('   Element at (700, 150):', JSON.stringify(elementInfo, null, 2));

    // Method 7: Dispatch custom events
    console.log('\nMethod 7: Dispatch custom events');
    await page.evaluate(() => {
      const el = document.elementFromPoint(700, 150);
      if (el) {
        // Try mousedown/mouseup
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 700, clientY: 150 }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 700, clientY: 150 }));
        // Try pointerdown/pointerup (for react-flow)
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 700, clientY: 150 }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 700, clientY: 150 }));
      }
    });
    await sleep(2000);
    await screenshot(page, 'hover-08-custom-events');
    panelOpen = await page.locator('text=Add Trigger').isVisible({ timeout: 2000 }).catch(() => false);
    if (panelOpen) console.log('   SUCCESS!');
    else console.log('   No panel');

    // Method 8: Look for the trigger node in react-flow
    console.log('\nMethod 8: Search for react-flow node elements');
    const nodeInfo = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="react-flow"], [class*="node"], [data-id]');
      return Array.from(nodes).slice(0, 10).map(n => ({
        tag: n.tagName,
        className: n.className.substring(0, 100),
        dataId: n.getAttribute('data-id'),
        rect: n.getBoundingClientRect()
      }));
    });
    console.log('   Found nodes:', JSON.stringify(nodeInfo, null, 2));

    console.log('\n=== METHODS COMPLETE ===');
    console.log('Keeping browser open for 3 minutes...');
    console.log('Try manually clicking the trigger block to see if it works.\n');

    await sleep(180000);

  } catch (error) {
    console.error('Error:', error.message);
    await screenshot(page, 'hover-error');
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
