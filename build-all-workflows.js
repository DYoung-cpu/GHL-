/**
 * LENDWISE - Build All Workflow Actions
 * Adds actions to all 15 existing workflows based on template specifications
 *
 * Run with: node build-all-workflows.js
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const workflowSpecs = require('./templates/workflows-templates.json');

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/build-${String(ssNum).padStart(3,'0')}-${name}.png`, fullPage: false });
  console.log(`      📸 ${name}`);
}

async function login(page, context) {
  console.log('📍 Logging into GHL...');
  await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const googleIframe = await page.$('#g_id_signin iframe');
  if (googleIframe) {
    const frame = await googleIframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await page.waitForTimeout(3000);

  const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (googlePage) {
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
}

function getWfFrame(page) {
  const frames = page.frames();
  for (const f of frames) {
    if (f.url().includes('automation-workflows')) {
      return f;
    }
  }
  return null;
}

// Parse delay string like "5 minutes", "1 day", "30 days" into {value, unit}
function parseDelay(delayStr) {
  if (!delayStr || delayStr === '0 minutes') return null;

  const match = delayStr.match(/(-?\d+)\s*(minute|hour|day|week|month)s?/i);
  if (match) {
    return {
      value: parseInt(match[1]),
      unit: match[2].toLowerCase()
    };
  }
  return null;
}

// Map action types to GHL action names
const ACTION_MAP = {
  'send_sms': 'Send SMS',
  'send_email': 'Send Email',
  'add_tag': 'Add Contact Tag',
  'remove_tag': 'Remove Contact Tag',
  'update_pipeline_stage': 'Update Opportunity',
  'internal_notification': 'Internal Notification',
  'conditional': 'If/Else',
  'send_sms_to_referrer': 'Send SMS',
  'send_email_to_referrer': 'Send Email',
};

async function clickAddAction(page, wfFrame) {
  // Find and click the last add-action button (adds at end of workflow)
  const addButtons = await wfFrame.locator('[class*="add-action"]').all();

  if (addButtons.length === 0) {
    console.log('      ⚠️ No add-action buttons found');
    return false;
  }

  // Click the last add-action button (before END)
  const lastBtn = addButtons[addButtons.length - 1];
  await lastBtn.click();
  await page.waitForTimeout(1500);

  // Check if action panel appeared
  const panelVisible = await page.locator('text=Pick an action').isVisible({ timeout: 3000 }).catch(() => false);
  return panelVisible;
}

async function selectAction(page, actionType) {
  const ghlAction = ACTION_MAP[actionType] || actionType;

  // Search for the action in the panel
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await searchInput.fill(ghlAction);
    await page.waitForTimeout(800);
  }

  // Click on the action option
  const actionOption = page.locator(`text="${ghlAction}"`).first();
  if (await actionOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await actionOption.click();
    await page.waitForTimeout(1500);
    return true;
  }

  // Try without exact match
  const actionOption2 = page.locator(`text=${ghlAction}`).first();
  if (await actionOption2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await actionOption2.click();
    await page.waitForTimeout(1500);
    return true;
  }

  console.log(`      ⚠️ Action not found: ${ghlAction}`);
  return false;
}

async function saveAction(page) {
  const saveBtn = page.locator('button:has-text("Save Action")').first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(2000);
    return true;
  }
  // Try alternative save button
  const saveBtn2 = page.locator('button:has-text("Save")').last();
  if (await saveBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
    await saveBtn2.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

async function addWaitAction(page, wfFrame, delay) {
  console.log(`         Adding Wait: ${delay.value} ${delay.unit}(s)`);

  // Click add-action
  const panelOpened = await clickAddAction(page, wfFrame);
  if (!panelOpened) {
    console.log('         ⚠️ Could not open action panel for Wait');
    return false;
  }

  // Search and select Wait
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await searchInput.fill('Wait');
    await page.waitForTimeout(800);
  }

  const waitOption = page.locator('text=Wait').first();
  if (await waitOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await waitOption.click();
    await page.waitForTimeout(1500);

    // Configure wait time - look for time input
    const timeInput = page.locator('input[type="number"]').first();
    if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timeInput.clear();
      await timeInput.fill(String(Math.abs(delay.value)));
      await page.waitForTimeout(300);
    }

    // Select unit from dropdown
    // GHL uses a custom dropdown, need to click and select
    const unitDropdown = page.locator('[class*="select"], select').first();
    if (await unitDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      await unitDropdown.click();
      await page.waitForTimeout(500);

      // Map unit to GHL format
      const unitMap = {
        'minute': 'Minutes',
        'hour': 'Hours',
        'day': 'Days',
        'week': 'Weeks',
        'month': 'Months'
      };
      const ghlUnit = unitMap[delay.unit] || 'Days';
      const unitOption = page.locator(`text=${ghlUnit}`).first();
      if (await unitOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await unitOption.click();
        await page.waitForTimeout(300);
      }
    }

    // Save
    await saveAction(page);
    return true;
  }

  return false;
}

async function addSMSAction(page, wfFrame, step) {
  console.log(`         Adding Send SMS`);

  const panelOpened = await clickAddAction(page, wfFrame);
  if (!panelOpened) return false;

  const selected = await selectAction(page, 'send_sms');
  if (!selected) return false;

  // For now, just save with defaults - template can be configured manually
  await saveAction(page);
  return true;
}

async function addEmailAction(page, wfFrame, step) {
  console.log(`         Adding Send Email`);

  const panelOpened = await clickAddAction(page, wfFrame);
  if (!panelOpened) return false;

  const selected = await selectAction(page, 'send_email');
  if (!selected) return false;

  // Save with defaults
  await saveAction(page);
  return true;
}

async function addTagAction(page, wfFrame, step) {
  console.log(`         Adding Add Tag: ${step.tag || 'TBD'}`);

  const panelOpened = await clickAddAction(page, wfFrame);
  if (!panelOpened) return false;

  const selected = await selectAction(page, 'add_tag');
  if (!selected) return false;

  // Save with defaults - tag can be configured manually
  await saveAction(page);
  return true;
}

async function buildWorkflow(page, workflow, wfFrame) {
  console.log(`\n   📋 Building: ${workflow.name}`);
  console.log(`      Steps to add: ${workflow.steps.length}`);

  let addedCount = 0;

  for (const step of workflow.steps) {
    console.log(`\n      Step ${step.order}: ${step.action}`);
    console.log(`         Description: ${step.description}`);

    // Get fresh frame reference
    wfFrame = getWfFrame(page);
    if (!wfFrame) {
      console.log('         ⚠️ Lost frame reference');
      continue;
    }

    // First add Wait if there's a delay > 0
    const delay = parseDelay(step.delay);
    if (delay && delay.value > 0) {
      const waitAdded = await addWaitAction(page, wfFrame, delay);
      if (waitAdded) addedCount++;

      // Refresh frame
      wfFrame = getWfFrame(page);
    }

    // Add the actual action
    let actionAdded = false;

    switch (step.action) {
      case 'send_sms':
      case 'send_sms_to_referrer':
        actionAdded = await addSMSAction(page, wfFrame, step);
        break;

      case 'send_email':
      case 'send_email_to_referrer':
        actionAdded = await addEmailAction(page, wfFrame, step);
        break;

      case 'add_tag':
        actionAdded = await addTagAction(page, wfFrame, step);
        break;

      case 'update_pipeline_stage':
      case 'internal_notification':
      case 'conditional':
        console.log(`         ⚠️ Skipping ${step.action} (requires manual config)`);
        break;

      default:
        console.log(`         ⚠️ Unknown action: ${step.action}`);
    }

    if (actionAdded) {
      addedCount++;
      console.log(`         ✅ Added`);
    }

    await page.waitForTimeout(500);
  }

  console.log(`\n      ✅ Added ${addedCount} actions`);
  return addedCount;
}

(async () => {
  console.log('================================================');
  console.log('  LENDWISE - Build All Workflow Actions');
  console.log('================================================\n');
  console.log(`Total workflows: ${workflowSpecs.workflows.length}\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const results = { success: [], failed: [], skipped: [] };

  try {
    await login(page, context);

    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);
    await ss(page, 'workflows-list');

    // Process first workflow as test
    const testWorkflow = workflowSpecs.workflows[0];

    console.log(`\n📍 Opening: ${testWorkflow.name}`);

    let wfFrame = getWfFrame(page);
    if (!wfFrame) throw new Error('Workflow frame not found');

    // Click workflow to open
    await wfFrame.locator(`text=${testWorkflow.name}`).first().click();
    await page.waitForTimeout(5000);

    wfFrame = getWfFrame(page);

    // Ensure Builder tab
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    // Close any panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await ss(page, 'workflow-opened');

    // Build workflow actions
    const actionsAdded = await buildWorkflow(page, testWorkflow, wfFrame);

    if (actionsAdded > 0) {
      results.success.push(testWorkflow.name);
      await ss(page, 'workflow-built');
    } else {
      results.failed.push(testWorkflow.name);
    }

    console.log('\n================================================');
    console.log('  Build Complete (Test Run - 1 Workflow)');
    console.log('================================================');
    console.log(`✅ Success: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('================================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser open 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
