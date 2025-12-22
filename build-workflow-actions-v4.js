/**
 * LENDWISE - Build Workflow Actions v4
 * Uses frame locators and explores the canvas elements
 *
 * Run with: node build-workflow-actions-v4.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/v4-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
  console.log(`   📸 ${name}`);
}

async function login(page, context) {
  console.log('📍 Logging into GHL...');
  await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const googleIframe = await page.$('#g_id_signin iframe');
  if (googleIframe) {
    console.log('   Found Google One-Tap iframe...');
    const frame = await googleIframe.contentFrame();
    if (frame) {
      await frame.click('div[role="button"]');
      console.log('   Clicked Google One-Tap button');
    }
  }
  await page.waitForTimeout(3000);

  const allPages = context.pages();
  const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

  if (googlePage) {
    console.log('   Entering Google credentials...');
    await googlePage.waitForLoadState('domcontentloaded');
    await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
    await googlePage.keyboard.press('Enter');
    await googlePage.waitForTimeout(3000);

    await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
    await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
    await googlePage.keyboard.press('Enter');
    await page.waitForTimeout(8000);
  }

  await page.waitForTimeout(5000);
  console.log('✅ Logged in!\n');

  const switcher = page.locator('text=Click here to switch');
  if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
    await switcher.click();
    await page.waitForTimeout(2000);
    await page.locator('text=LENDWISE MORTGA').click();
    await page.waitForTimeout(3000);
  }
  console.log('✅ In Lendwise account\n');
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions v4');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    await login(page, context);

    // Navigate to workflows
    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);

    // Use frameLocator for the workflow iframe
    const wfFrameLocator = page.frameLocator('iframe[src*="automation-workflows"]');

    // Open the workflow
    const testWorkflow = 'New Lead Nurture Sequence';
    console.log(`📍 Opening workflow: ${testWorkflow}`);

    await wfFrameLocator.locator(`text=${testWorkflow}`).first().click();
    await page.waitForTimeout(5000);
    await ss(page, 'workflow-opened');

    // Make sure we're in Builder tab
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    console.log('\n📍 Exploring canvas elements...');

    // Get the frame for direct interaction
    const wfFrame = page.frame({ url: /automation-workflows/ });
    if (!wfFrame) throw new Error('Frame not found');

    // Look for all clickable elements in the canvas area
    console.log('   Looking for SVG and interactive elements...');

    // The "+" is likely an SVG or a button. Let's find all SVGs
    const svgCount = await wfFrame.locator('svg').count();
    console.log(`   Found ${svgCount} SVG elements`);

    // Look for elements that might be the + button
    const plusElements = await wfFrame.locator('[class*="plus"], [class*="add"], [data-testid*="add"]').count();
    console.log(`   Found ${plusElements} plus/add elements`);

    // Look for buttons
    const buttons = await wfFrame.locator('button, [role="button"]').count();
    console.log(`   Found ${buttons} buttons`);

    // Try to find the connector line elements
    const paths = await wfFrame.locator('path').count();
    console.log(`   Found ${paths} SVG paths`);

    // Let's try to find clickable areas near the connector
    // First, let's click on the Email block to select it
    console.log('\n📍 Clicking on Email block to select it...');
    await wfFrame.locator('text=Email').first().click();
    await page.waitForTimeout(1500);
    await ss(page, 'email-selected');

    // Now check if a panel appeared on the right
    const rightPanel = await page.locator('[class*="panel"], [class*="sidebar"], [class*="drawer"]').count();
    console.log(`   Right panel elements: ${rightPanel}`);

    // Try pressing Tab to navigate to + button
    console.log('\n📍 Trying keyboard navigation...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await ss(page, 'after-tab');

    // Let's try to find the exact + button by looking at the HTML structure
    console.log('\n📍 Dumping canvas structure...');

    // Get the inner HTML of the canvas area to understand its structure
    const canvasHtml = await wfFrame.locator('body').innerHTML();

    // Look for specific patterns
    if (canvasHtml.includes('add-action') || canvasHtml.includes('addAction')) {
      console.log('   Found add-action class!');
    }
    if (canvasHtml.includes('insert-node') || canvasHtml.includes('insertNode')) {
      console.log('   Found insert-node class!');
    }

    // Try right-click context menu
    console.log('\n📍 Trying right-click on connector area...');
    await page.mouse.click(705, 285, { button: 'right' });
    await page.waitForTimeout(1500);
    await ss(page, 'after-right-click');

    // Check for context menu
    const contextMenu = await page.locator('[role="menu"], [class*="context"], [class*="dropdown"]').isVisible().catch(() => false);
    if (contextMenu) {
      console.log('   Context menu appeared!');
    }

    // Try clicking precisely on the "+" character position
    // The + appears to be at the intersection point on the vertical line
    console.log('\n📍 Attempting precise clicks around + area...');

    // Click in a small grid around the expected position
    const baseX = 705;
    const baseY = 285;
    const offsets = [
      [0, 0], [-5, 0], [5, 0], [0, -5], [0, 5],
      [-10, 0], [10, 0], [0, -10], [0, 10]
    ];

    for (const [dx, dy] of offsets) {
      const x = baseX + dx;
      const y = baseY + dy;
      console.log(`   Clicking at (${x}, ${y})...`);
      await page.mouse.click(x, y);
      await page.waitForTimeout(800);

      // Quick check if action panel appeared
      const hasActions = await page.locator('text=Send SMS').isVisible({ timeout: 500 }).catch(() => false);
      if (hasActions) {
        console.log(`   ✅ Found action panel at (${x}, ${y})!`);
        await ss(page, `found-at-${x}-${y}`);
        break;
      }
    }

    await ss(page, 'final-state');

    console.log('\n========================================');
    console.log('  Exploration Complete!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
