/**
 * LENDWISE - Build Workflow Actions
 * Adds all action steps to each workflow
 *
 * Run with: node build-workflow-actions.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Simplified workflow configs - start with just a few to test
const WORKFLOWS = [
  {
    name: 'New Lead Nurture Sequence',
    actions: [
      { type: 'Wait', config: { time: 5, unit: 'minutes' } },
      { type: 'Send SMS' },
      { type: 'Wait', config: { time: 1, unit: 'days' } },
      { type: 'Send Email' },
    ]
  }
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/build-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions');
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
    // ===== LOGIN =====
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

    // ===== SWITCH TO LENDWISE =====
    console.log('📍 Switching to Lendwise account...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ In Lendwise account\n');

    // ===== GO TO WORKFLOWS =====
    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);

    // Get workflow iframe
    const wfFrame = page.frame({ url: /automation-workflows/ });
    if (!wfFrame) {
      console.log('❌ Workflow iframe not found');
      await ss(page, 'no-iframe');
      throw new Error('No workflow iframe');
    }
    console.log('✅ Found workflow iframe!\n');
    await ss(page, 'workflows-list');

    // ===== OPEN FIRST WORKFLOW =====
    const workflow = WORKFLOWS[0];
    console.log(`📍 Opening: ${workflow.name}`);

    const wfLink = wfFrame.locator(`text=${workflow.name}`).first();
    await wfLink.click();
    await page.waitForTimeout(5000);
    await ss(page, 'workflow-editor');

    // Get editor frame
    const editorFrame = page.frame({ url: /automation-workflows/ }) || page.mainFrame();

    // ===== CHECK IF IN STATS VIEW =====
    console.log('\n📍 Checking for Stats View...');
    const statsWarning = await editorFrame.locator('text=not editable in Stats View').count();
    if (statsWarning > 0) {
      console.log('   ⚠️ In Stats View - need to exit to edit mode');
      // Click on empty canvas area to deselect
      await page.mouse.click(400, 500);
      await page.waitForTimeout(1000);
      // Or try clicking the Builder tab
      await page.click('text=Builder');
      await page.waitForTimeout(2000);
      await ss(page, 'after-builder-click');
    }

    // ===== CLICK THE FIRST + BUTTON =====
    console.log('\n📍 Clicking the first + button (between trigger and Email)...');

    // From screenshot, the + is at approximately (705, 285)
    await page.mouse.click(705, 285);
    await page.waitForTimeout(2000);
    await ss(page, 'after-plus-click');

    // ===== CHECK WHAT APPEARED =====
    console.log('\n📍 Checking what appeared after clicking +...');

    // Take screenshot and look for action types
    const pageContent = await page.content();

    // Check for common action type text
    const actionTypes = ['Send SMS', 'Send Email', 'Wait', 'Add Tag', 'If/Else', 'Webhook'];
    for (const actionType of actionTypes) {
      if (pageContent.includes(actionType)) {
        console.log(`   ✓ Found: ${actionType}`);
      }
    }

    // Try clicking on "Send SMS" if it appeared
    const sendSmsOption = page.locator('text=Send SMS').first();
    if (await sendSmsOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('\n📍 Found "Send SMS" option, clicking...');
      await sendSmsOption.click();
      await page.waitForTimeout(2000);
      await ss(page, 'after-send-sms-click');
    } else {
      console.log('   Send SMS not visible, checking page structure...');

      // Maybe actions are in the left sidebar - try clicking there
      console.log('   Trying left sidebar icons...');

      // The sidebar has icons at x ~= 28
      // Try each icon position
      const iconPositions = [
        { x: 28, y: 128 },  // First icon
        { x: 28, y: 175 },  // Second icon
        { x: 28, y: 222 },  // Third icon (orange clock - might be wait)
        { x: 28, y: 270 },  // Fourth icon
        { x: 28, y: 317 },  // Fifth icon
      ];

      for (let i = 0; i < iconPositions.length; i++) {
        const pos = iconPositions[i];
        console.log(`   Clicking sidebar icon ${i + 1} at (${pos.x}, ${pos.y})...`);
        await page.mouse.click(pos.x, pos.y);
        await page.waitForTimeout(1500);
        await ss(page, `sidebar-icon-${i + 1}`);

        // Check if Send SMS appeared
        if (await page.locator('text=Send SMS').isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`   ✓ Found Send SMS after clicking icon ${i + 1}!`);
          break;
        }
      }
    }

    await ss(page, 'exploration-complete');

    console.log('\n========================================');
    console.log('  Exploration Complete!');
    console.log('  Check screenshots/build-*.png');
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
