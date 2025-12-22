/**
 * LENDWISE - Build Workflow Actions v2
 * Adds action steps to workflows by clicking the "+" button in the canvas
 *
 * Run with: node build-workflow-actions-v2.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Workflow specifications from templates
const workflowSpecs = require('./templates/workflows-templates.json');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/v2-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
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

  // Switch to Lendwise account
  console.log('📍 Switching to Lendwise account...');
  const switcher = page.locator('text=Click here to switch');
  if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
    await switcher.click();
    await page.waitForTimeout(2000);
    await page.locator('text=LENDWISE MORTGA').click();
    await page.waitForTimeout(3000);
  }
  console.log('✅ In Lendwise account\n');
}

async function getWorkflowFrame(page) {
  // Wait for iframe to load
  await page.waitForTimeout(3000);

  // Get the workflow iframe
  const frames = page.frames();
  for (const f of frames) {
    if (f.url().includes('automation-workflows')) {
      return f;
    }
  }
  return null;
}

async function addAction(frame, page, actionType, config = {}) {
  console.log(`   Adding action: ${actionType}`);

  // Find and click the first "+" button (use SVG or button with plus)
  // The "+" buttons are typically SVG elements or buttons in the canvas

  // Try multiple selectors for the + button
  const plusSelectors = [
    'button:has(svg[data-icon="plus"])',
    '[class*="add-action"]',
    '[class*="plus"]',
    'svg[data-icon="plus"]',
    'button:has-text("+")',
  ];

  let plusClicked = false;
  for (const selector of plusSelectors) {
    const plusBtn = frame.locator(selector).first();
    if (await plusBtn.count() > 0) {
      try {
        await plusBtn.click({ timeout: 3000 });
        plusClicked = true;
        console.log(`      Clicked + using selector: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
  }

  if (!plusClicked) {
    console.log('      ⚠️ Could not find + button with selectors, trying coordinate click...');
    // The + button is typically at the center of the canvas
    // Based on screenshot, it's around x=705, y=285 relative to viewport
    // But we need to account for iframe offset

    const iframe = await page.$('iframe[src*="automation-workflows"]');
    if (iframe) {
      const box = await iframe.boundingBox();
      if (box) {
        // Click at the approximate position of the first + button
        // The + is roughly at 50% horizontal and about 200px from top of iframe
        const clickX = box.x + (box.width * 0.5);
        const clickY = box.y + 200;
        console.log(`      Clicking at (${clickX}, ${clickY})`);
        await page.mouse.click(clickX, clickY);
      }
    }
  }

  await page.waitForTimeout(1500);

  // Now look for the action panel that should have appeared
  // Search for action types like "Send SMS", "Send Email", "Wait", etc.
  const actionTypeMap = {
    'send_sms': 'Send SMS',
    'send_email': 'Send Email',
    'wait': 'Wait',
    'add_tag': 'Add Tag',
    'remove_tag': 'Remove Tag',
    'if_else': 'If/Else',
    'webhook': 'Webhook',
    'update_contact': 'Update Contact',
  };

  const actionLabel = actionTypeMap[actionType] || actionType;

  // Try to click the action type
  const actionOption = frame.locator(`text=${actionLabel}`).first();
  if (await actionOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`      Found action option: ${actionLabel}`);
    await actionOption.click();
    await page.waitForTimeout(1000);
    return true;
  } else {
    console.log(`      ⚠️ Action option not visible: ${actionLabel}`);
    return false;
  }
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions v2');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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
    await ss(page, 'workflows-list');

    // Get workflow frame
    let wfFrame = await getWorkflowFrame(page);
    if (!wfFrame) {
      console.log('❌ Workflow iframe not found');
      throw new Error('No workflow iframe');
    }
    console.log('✅ Found workflow iframe!\n');

    // Open the first workflow to test
    const testWorkflow = 'New Lead Nurture Sequence';
    console.log(`📍 Opening workflow: ${testWorkflow}`);

    const wfLink = wfFrame.locator(`text=${testWorkflow}`).first();
    await wfLink.click();
    await page.waitForTimeout(5000);
    await ss(page, 'workflow-opened');

    // Refresh frame reference after navigation
    wfFrame = await getWorkflowFrame(page);
    if (!wfFrame) {
      // Try main frame if iframe changed
      wfFrame = page.mainFrame();
    }

    // Check if in Builder tab
    console.log('\n📍 Ensuring we are in Builder mode...');
    const builderTab = page.locator('text=Builder').first();
    if (await builderTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await builderTab.click();
      await page.waitForTimeout(1000);
    }
    await ss(page, 'in-builder');

    // Now let's explore what's in the frame
    console.log('\n📍 Exploring frame content...');

    // Log frame URL
    console.log(`   Frame URL: ${wfFrame.url()}`);

    // Look for key elements
    const elements = {
      'Plus buttons': await wfFrame.locator('button:has(svg), [class*="plus"], svg[data-icon]').count(),
      'Email action': await wfFrame.locator('text=Email').count(),
      'END block': await wfFrame.locator('text=END').count(),
      'Any buttons': await wfFrame.locator('button').count(),
    };

    console.log('   Elements found:');
    for (const [name, count] of Object.entries(elements)) {
      console.log(`      ${name}: ${count}`);
    }

    // Take a detailed screenshot of the canvas area
    await ss(page, 'canvas-detail');

    // Try clicking directly on the + button using different approaches
    console.log('\n📍 Attempting to click + button...');

    // Approach 1: Look for the + icon path
    const plusPaths = await page.locator('path[d*="M12"]').count();
    console.log(`   SVG paths with M12: ${plusPaths}`);

    // Approach 2: Look for add buttons by class
    const addBtns = await page.locator('[class*="add"], [class*="plus"], [class*="insert"]').count();
    console.log(`   Add/plus/insert elements: ${addBtns}`);

    // Let's try clicking where the + should be based on the screenshot
    // The + is between the trigger block and the Email block
    // In the screenshot, it appears to be at roughly the center horizontally
    // and about 1/3 down from the top

    const iframe = await page.$('iframe[src*="automation-workflows"]');
    if (iframe) {
      const box = await iframe.boundingBox();
      console.log(`   Iframe bounds: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);

      // The + button appears to be at roughly:
      // - Horizontally centered in the canvas
      // - About 280-290px from top of viewport (based on screenshot)
      // - The iframe starts at y ~ 110 (after headers)
      // So within iframe: y ~ 170-180

      // Try clicking at the + position
      const clickX = box.x + (box.width * 0.5);
      const clickY = box.y + 180; // Approximate position of first +

      console.log(`\n   Clicking at position (${Math.round(clickX)}, ${Math.round(clickY)})...`);
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(2000);
      await ss(page, 'after-plus-click');

      // Check if action panel appeared
      const actionPanelVisible = await page.locator('text=Send SMS, text=Send Email, text=Wait').first().isVisible({ timeout: 2000 }).catch(() => false);

      if (actionPanelVisible) {
        console.log('   ✅ Action panel appeared!');
      } else {
        console.log('   Action panel did not appear, trying alternative positions...');

        // Try clicking at different Y positions
        const yPositions = [150, 200, 250, 300];
        for (const y of yPositions) {
          const tryY = box.y + y;
          console.log(`   Trying y=${y}...`);
          await page.mouse.click(clickX, tryY);
          await page.waitForTimeout(1500);

          // Check for action panel
          if (await page.locator('text=Send SMS').isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`   ✅ Found action panel at y=${y}!`);
            await ss(page, `found-actions-y${y}`);
            break;
          }
        }
      }
    }

    // Final screenshot
    await ss(page, 'exploration-complete');

    console.log('\n========================================');
    console.log('  Exploration Complete!');
    console.log('  Check screenshots/v2-*.png');
    console.log('========================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser staying open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
