/**
 * LENDWISE - Build Workflow Actions v3
 * Precisely clicks the "+" button to add actions
 *
 * Run with: node build-workflow-actions-v3.js
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
  await page.screenshot({ path: `${dir}/v3-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
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
    await googlePage.fill('input[type=\"email\"]', 'david@lendwisemtg.com');
    await googlePage.keyboard.press('Enter');
    await googlePage.waitForTimeout(3000);

    await googlePage.waitForSelector('input[type=\"password\"]:visible', { timeout: 10000 });
    await googlePage.fill('input[type=\"password\"]:visible', 'Fafa2185!');
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

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions v3');
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

    // Get workflow frame
    const wfFrame = page.frame({ url: /automation-workflows/ });
    if (!wfFrame) {
      console.log('❌ Workflow iframe not found');
      throw new Error('No workflow iframe');
    }
    console.log('✅ Found workflow iframe!\n');

    // Open the first workflow
    const testWorkflow = 'New Lead Nurture Sequence';
    console.log(`📍 Opening workflow: ${testWorkflow}`);

    const wfLink = wfFrame.locator(`text=${testWorkflow}`).first();
    await wfLink.click();
    await page.waitForTimeout(5000);
    await ss(page, 'workflow-opened');

    // Make sure we're in Builder tab
    const builderTab = page.locator('text=Builder').first();
    if (await builderTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await builderTab.click();
      await page.waitForTimeout(1000);
    }

    // The "+" button is at approximately (705, 285) based on screenshot analysis
    // Let's click precisely there
    console.log('\n📍 Clicking the + button at (705, 285)...');
    await page.mouse.click(705, 285);
    await page.waitForTimeout(2000);
    await ss(page, 'after-plus-click');

    // Check what appeared - look for action types
    console.log('\n📍 Checking for action panel...');

    // Get page content to search for action types
    const pageText = await page.innerText('body').catch(() => '');

    const actionTypes = ['Send SMS', 'Send Email', 'Wait', 'Add Tag', 'If/Else', 'Webhook', 'Update Contact', 'Remove Tag'];
    const foundActions = actionTypes.filter(a => pageText.includes(a));

    if (foundActions.length > 0) {
      console.log('   ✅ Action panel found! Available actions:');
      foundActions.forEach(a => console.log(`      - ${a}`));

      // Try clicking "Wait" action
      console.log('\n📍 Clicking "Wait" action...');
      await page.locator('text=Wait').first().click();
      await page.waitForTimeout(2000);
      await ss(page, 'after-wait-click');

    } else {
      console.log('   Action panel not visible, trying to find + in different ways...');

      // The + might be smaller or need hover. Let's try to find it by looking at the SVG
      // Or the element might need to be hovered first

      // Try hovering first, then clicking
      console.log('   Trying hover then click...');
      await page.mouse.move(705, 285);
      await page.waitForTimeout(500);
      await page.mouse.click(705, 285);
      await page.waitForTimeout(2000);
      await ss(page, 'after-hover-click');

      // Check again
      const pageText2 = await page.innerText('body').catch(() => '');
      if (pageText2.includes('Send SMS') || pageText2.includes('Wait')) {
        console.log('   ✅ Action panel appeared after hover!');
      } else {
        // Try double-click
        console.log('   Trying double-click...');
        await page.mouse.dblclick(705, 285);
        await page.waitForTimeout(2000);
        await ss(page, 'after-dblclick');
      }
    }

    // Final state
    await ss(page, 'final-state');

    console.log('\n========================================');
    console.log('  Test Complete!');
    console.log('  Check screenshots/v3-*.png');
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
