/**
 * LENDWISE - Add Actions to Workflows
 * Opens each workflow and adds the required SMS/Email actions
 *
 * Run with: node add-workflow-actions.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Load workflow specs
const workflowSpecs = require('./templates/workflows-templates.json');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/wf-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Add Workflow Actions');
  console.log('========================================\n');

  // Use exact same browser setup as working import-via-browser.js
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
    // ===== LOGIN (exact copy from working import-via-browser.js) =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Google One-Tap login
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

    // Handle Google popup
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

    // Wait for dashboard
    await page.waitForTimeout(5000);
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO LENDWISE ACCOUNT =====
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
    await ss(page, 'workflows-list');

    // Get the workflow iframe
    const wfFrame = page.frame({ url: /automation-workflows/ });
    if (!wfFrame) {
      console.log('⚠️ Workflow iframe not found, checking page content...');
      await ss(page, 'no-iframe');

      // List available frames
      const frames = page.frames();
      console.log(`   Found ${frames.length} frames:`);
      for (const f of frames) {
        const url = f.url();
        if (url && url !== 'about:blank') {
          console.log(`      - ${url.substring(0, 100)}`);
        }
      }
    } else {
      console.log('✅ Found workflow iframe!\n');
    }

    // ===== OPEN FIRST WORKFLOW =====
    console.log('📍 Opening first workflow to explore editor...');

    const workflowName = 'New Lead Nurture Sequence';

    if (wfFrame) {
      // Try to find workflow in the list
      const wfLink = wfFrame.locator(`text=${workflowName}`).first();
      if (await wfLink.count() > 0) {
        console.log(`   Found: ${workflowName}`);
        await wfLink.click();
        await page.waitForTimeout(5000);
        await ss(page, 'workflow-editor');
      } else {
        console.log('   Workflow not found, listing visible elements...');

        // Try to find any clickable workflow
        const rows = await wfFrame.locator('tr, [class*="workflow"], [class*="row"]').all();
        console.log(`   Found ${rows.length} potential workflow rows`);

        if (rows.length > 1) {
          await rows[1].click(); // Skip header, click first data row
          await page.waitForTimeout(5000);
          await ss(page, 'workflow-editor');
        }
      }
    } else {
      // No iframe, try on main page
      console.log('   Trying main page selectors...');

      const wfLink = page.locator(`text=${workflowName}`).first();
      if (await wfLink.count() > 0) {
        await wfLink.click();
        await page.waitForTimeout(5000);
        await ss(page, 'workflow-editor-main');
      }
    }

    // ===== EXPLORE EDITOR UI =====
    console.log('\n📍 Exploring workflow editor...');

    // Check current URL
    console.log(`   Current URL: ${page.url()}`);

    // Get updated frame reference (may have changed after navigation)
    const editorFrame = page.frame({ url: /automation-workflows/ }) || page.mainFrame();

    // Look for common editor elements
    const elements = {
      'Add New Action': await editorFrame.locator('text=Add New Action').count(),
      'Add Action': await editorFrame.locator('text=Add Action').count(),
      'Add Trigger': await editorFrame.locator('text=Add Trigger').count(),
      'Save': await editorFrame.locator('button:has-text("Save")').count(),
      'Publish': await editorFrame.locator('button:has-text("Publish")').count(),
      'Plus icons': await editorFrame.locator('svg[data-icon="plus"], [class*="plus"]').count(),
    };

    console.log('   UI Elements found:');
    for (const [name, count] of Object.entries(elements)) {
      if (count > 0) console.log(`      ✓ ${name}: ${count}`);
    }

    // Try to click "Add New Action" or "+"
    const addActionBtn = editorFrame.locator('text=Add New Action, button:has-text("+")').first();
    if (await addActionBtn.count() > 0) {
      console.log('\n📍 Clicking Add Action button...');
      await addActionBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'action-panel');

      // See what action types are available
      const actionTypes = ['Send SMS', 'Send Email', 'Wait', 'Add Tag', 'If/Else'];
      console.log('   Checking for action types:');
      for (const actionType of actionTypes) {
        const count = await editorFrame.locator(`text=${actionType}`).count();
        if (count > 0) console.log(`      ✓ ${actionType}`);
      }
    }

    await ss(page, 'exploration-complete');

    console.log('\n========================================');
    console.log('  Exploration Complete!');
    console.log('  Check screenshots/wf-*.png');
    console.log('========================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser staying open for 30 seconds...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();
