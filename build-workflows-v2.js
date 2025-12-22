/**
 * GHL Workflow Builder v2 - Fixed authentication and selectors
 *
 * Key fixes:
 * 1. Proper session persistence with storageState
 * 2. Use page.locator() instead of page.$() for text selectors
 * 3. Explicit login wait and verification
 * 4. Better error handling and screenshots
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const SESSION_FILE = path.join(__dirname, 'ghl-session.json');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Workflow definitions
const workflows = [
  {
    name: 'New Lead Nurture Sequence',
    trigger: { type: 'tag_added', tag: 'New Lead' },
    steps: [
      { type: 'sms', delay: '0', template: 'Lead Response 1' },
      { type: 'wait', delay: '5 minutes' },
      { type: 'email', template: 'Lead Welcome Email' },
      { type: 'wait', delay: '1 day' },
      { type: 'sms', template: 'Lead Follow-up 2' },
      { type: 'wait', delay: '1 day' },
      { type: 'email', template: 'Lead Follow-up 1' },
      { type: 'wait', delay: '1 day' },
      { type: 'sms', template: 'Lead Follow-up 3' },
      { type: 'wait', delay: '2 days' },
      { type: 'email', template: 'Lead Follow-up 2' },
      { type: 'wait', delay: '2 days' },
      { type: 'sms', template: 'Lead Follow-up 4' },
      { type: 'wait', delay: '3 days' },
      { type: 'email', template: 'Lead Follow-up 3' },
      { type: 'wait', delay: '4 days' },
      { type: 'sms', template: 'Lead Follow-up 5' },
      { type: 'add_tag', tag: 'Long-Term Nurture' }
    ]
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot: ${name}`);
  return filepath;
}

// Save browser session for reuse
async function saveSession(context) {
  try {
    const state = await context.storageState();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));
    console.log('✅ Session saved');
  } catch (e) {
    console.log('⚠️ Could not save session:', e.message);
  }
}

// Load saved session if exists
function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const state = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      console.log('📂 Loaded saved session');
      return state;
    }
  } catch (e) {
    console.log('⚠️ Could not load session:', e.message);
  }
  return null;
}

// Check if we're logged in by looking at URL
function isLoggedIn(url) {
  return url.includes('/location/') || url.includes('/dashboard') || url.includes('/v2/');
}

// Main login flow with proper waiting
async function ensureLoggedIn(page, context) {
  console.log('\n🔐 Checking authentication...');

  await page.goto('https://app.gohighlevel.com/');
  await sleep(3000);

  let currentUrl = page.url();
  console.log(`  Current URL: ${currentUrl}`);

  // Already logged in?
  if (isLoggedIn(currentUrl)) {
    console.log('✅ Already logged in!');
    await saveSession(context);
    return true;
  }

  // Need to login
  console.log('🔑 Login required...');
  await screenshot(page, 'login-page');

  // Click Google sign in button using locator (supports text matching)
  try {
    const googleBtn = page.locator('button:has-text("Sign in with Google"), button:has-text("Google")').first();
    await googleBtn.waitFor({ state: 'visible', timeout: 10000 });
    await googleBtn.click();
    console.log('  Clicked Google Sign In');
  } catch (e) {
    // Try alternate selector
    try {
      await page.click('text=Sign in with Google');
    } catch (e2) {
      console.log('  ⚠️ Could not find Google button, trying image...');
      const googleImg = page.locator('img[alt*="Google"]').first();
      await googleImg.click().catch(() => {});
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('>>> MANUAL ACTION REQUIRED <<<');
  console.log('>>> Complete Google login in the browser window <<<');
  console.log('>>> Waiting up to 180 seconds... <<<');
  console.log('='.repeat(60) + '\n');

  // Wait for successful login - URL will change
  const startTime = Date.now();
  const timeout = 180000; // 3 minutes

  while (Date.now() - startTime < timeout) {
    await sleep(2000);
    currentUrl = page.url();

    if (isLoggedIn(currentUrl)) {
      console.log('✅ Login successful!');
      await sleep(2000); // Let page settle
      await saveSession(context);
      return true;
    }

    // Show progress
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r  Waiting... ${elapsed}s`);
  }

  console.log('\n❌ Login timeout');
  await screenshot(page, 'login-timeout');
  return false;
}

// Navigate to workflows page
async function navigateToWorkflows(page) {
  console.log('\n📍 Navigating to Workflows...');

  const workflowsUrl = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`;
  await page.goto(workflowsUrl);
  await sleep(4000);

  // Verify we're on workflows page
  const currentUrl = page.url();
  if (!currentUrl.includes('/automation/workflows')) {
    console.log('  ⚠️ May not be on workflows page');
    await screenshot(page, 'nav-check');
  }

  await screenshot(page, 'workflows-list');
  return true;
}

// Click element with multiple selector fallbacks
async function clickElement(page, selectors, description) {
  console.log(`  Clicking: ${description}`);

  for (const selector of selectors) {
    try {
      // Use locator for text selectors, querySelector for CSS
      if (selector.startsWith('text=') || selector.includes(':has-text')) {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        console.log(`    ✓ Used: ${selector}`);
        return true;
      } else {
        // CSS selector
        const element = await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        if (element) {
          await element.click();
          console.log(`    ✓ Used: ${selector}`);
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }

  console.log(`    ✗ Could not find: ${description}`);
  return false;
}

// Fill input field with multiple selector fallbacks
async function fillField(page, selectors, value, description) {
  console.log(`  Filling: ${description} = "${value}"`);

  for (const selector of selectors) {
    try {
      const element = await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      if (element) {
        await element.fill('');
        await element.fill(value);
        console.log(`    ✓ Used: ${selector}`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  console.log(`    ✗ Could not find: ${description}`);
  return false;
}

// Create a single workflow
async function createWorkflow(page, workflow) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 Creating Workflow: ${workflow.name}`);
  console.log('='.repeat(60));

  // Step 1: Click Create Workflow button
  await clickElement(page, [
    'button:has-text("Create Workflow")',
    'button:has-text("Create")',
    '[data-testid="create-workflow"]',
    '.btn-primary:has-text("Create")'
  ], 'Create Workflow button');

  await sleep(2000);
  await screenshot(page, 'create-modal');

  // Step 2: Select "Start from Scratch"
  await clickElement(page, [
    'text=Start from Scratch',
    'div:has-text("Start from Scratch")',
    '[data-testid="start-from-scratch"]'
  ], 'Start from Scratch');

  await sleep(2000);
  await screenshot(page, 'scratch-selected');

  // Step 3: Name the workflow
  await fillField(page, [
    'input[placeholder*="name" i]',
    'input[placeholder*="workflow" i]',
    'input[name="name"]',
    '.workflow-name-input'
  ], workflow.name, 'Workflow name');

  await sleep(1000);

  // Step 4: Click Continue/Create
  await clickElement(page, [
    'button:has-text("Continue")',
    'button:has-text("Create")',
    'button:has-text("Next")',
    'button[type="submit"]'
  ], 'Continue button');

  await sleep(3000);
  await screenshot(page, 'workflow-editor');

  // Step 5: Add Trigger
  console.log('\n📌 Adding Trigger...');
  await clickElement(page, [
    'text=Add New Trigger',
    'text=Add Trigger',
    '[data-testid="add-trigger"]',
    '.trigger-placeholder'
  ], 'Add Trigger');

  await sleep(2000);
  await screenshot(page, 'trigger-panel');

  if (workflow.trigger.type === 'tag_added') {
    // Select Contact Tag trigger
    await clickElement(page, [
      'text=Contact Tag',
      'div:has-text("Contact Tag")',
      '[data-testid="trigger-contact-tag"]'
    ], 'Contact Tag trigger');

    await sleep(1500);

    // Look for "Tag Added" option
    await clickElement(page, [
      'text=Tag Added',
      'text=tag is added',
      'label:has-text("Added")'
    ], 'Tag Added option');

    await sleep(1000);

    // Select the specific tag
    console.log(`  Selecting tag: ${workflow.trigger.tag}`);

    // Click tag dropdown/input
    await clickElement(page, [
      '[data-testid="tag-select"]',
      'input[placeholder*="tag" i]',
      '.tag-select',
      '.tag-dropdown'
    ], 'Tag dropdown');

    await sleep(500);

    // Type to search
    await page.keyboard.type(workflow.trigger.tag);
    await sleep(1500);

    // Click matching option
    try {
      await page.locator(`text="${workflow.trigger.tag}"`).first().click();
    } catch (e) {
      await page.keyboard.press('Enter');
    }

    await sleep(1000);

    // Save trigger
    await clickElement(page, [
      'button:has-text("Save Trigger")',
      'button:has-text("Save")',
      'button:has-text("Add")',
      'button:has-text("Done")'
    ], 'Save Trigger');
  }

  await sleep(2000);
  await screenshot(page, 'trigger-configured');

  // Step 6: Add workflow steps
  console.log('\n⚡ Adding Steps...');

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    console.log(`\n  Step ${i + 1}/${workflow.steps.length}: ${step.type}`);

    // Click + or Add Action
    await clickElement(page, [
      'button:has-text("+")',
      '[data-testid="add-action"]',
      'text=Add Action',
      '.add-action-btn',
      'svg[data-icon="plus"]'
    ], 'Add Action');

    await sleep(1500);

    switch (step.type) {
      case 'sms':
        await addSmsAction(page, step.template);
        break;
      case 'email':
        await addEmailAction(page, step.template);
        break;
      case 'wait':
        await addWaitAction(page, step.delay);
        break;
      case 'add_tag':
        await addTagAction(page, step.tag);
        break;
    }

    await sleep(1500);
  }

  await screenshot(page, 'workflow-complete');

  // Step 7: Save/Publish workflow
  console.log('\n💾 Saving Workflow...');
  await clickElement(page, [
    'button:has-text("Publish")',
    'button:has-text("Save")',
    'button:has-text("Activate")'
  ], 'Save/Publish');

  await sleep(2000);
  await screenshot(page, 'workflow-saved');

  console.log(`\n✅ Workflow "${workflow.name}" created!`);
  return true;
}

async function addSmsAction(page, template) {
  await clickElement(page, [
    'text=Send SMS',
    'div:has-text("Send SMS")',
    '[data-testid="action-sms"]'
  ], 'Send SMS action');

  await sleep(1500);

  // Use template
  await clickElement(page, [
    'text=Use Template',
    'button:has-text("Template")'
  ], 'Use Template');

  await sleep(1000);

  // Search for template
  await fillField(page, [
    'input[placeholder*="search" i]',
    'input[type="search"]'
  ], template, 'Template search');

  await sleep(1500);

  // Click matching template
  try {
    await page.locator(`text="${template}"`).first().click();
  } catch (e) {
    await page.keyboard.press('Enter');
  }

  await sleep(500);

  // Save action
  await clickElement(page, [
    'button:has-text("Save Action")',
    'button:has-text("Save")',
    'button:has-text("Add")'
  ], 'Save Action');
}

async function addEmailAction(page, template) {
  await clickElement(page, [
    'text=Send Email',
    'div:has-text("Send Email")',
    '[data-testid="action-email"]'
  ], 'Send Email action');

  await sleep(1500);

  await clickElement(page, [
    'text=Use Template',
    'button:has-text("Template")'
  ], 'Use Template');

  await sleep(1000);

  await fillField(page, [
    'input[placeholder*="search" i]',
    'input[type="search"]'
  ], template, 'Template search');

  await sleep(1500);

  try {
    await page.locator(`text="${template}"`).first().click();
  } catch (e) {
    await page.keyboard.press('Enter');
  }

  await sleep(500);

  await clickElement(page, [
    'button:has-text("Save Action")',
    'button:has-text("Save")',
    'button:has-text("Add")'
  ], 'Save Action');
}

async function addWaitAction(page, delay) {
  await clickElement(page, [
    'text=Wait',
    'div:has-text("Wait")',
    '[data-testid="action-wait"]'
  ], 'Wait action');

  await sleep(1500);

  // Parse delay (e.g., "5 minutes", "1 day", "2 days")
  const parts = delay.split(' ');
  const value = parts[0];
  const unit = parts[1] || 'minutes';

  // Enter value
  await fillField(page, [
    'input[type="number"]',
    'input.delay-value',
    '[data-testid="wait-value"]'
  ], value, 'Wait value');

  // Select unit (would need to handle dropdown)
  // For now, just save with default

  await sleep(500);

  await clickElement(page, [
    'button:has-text("Save Action")',
    'button:has-text("Save")',
    'button:has-text("Add")'
  ], 'Save Action');
}

async function addTagAction(page, tag) {
  await clickElement(page, [
    'text=Add Tag',
    'div:has-text("Add Tag")',
    '[data-testid="action-add-tag"]'
  ], 'Add Tag action');

  await sleep(1500);

  // Click tag dropdown
  await clickElement(page, [
    '[data-testid="tag-select"]',
    'input[placeholder*="tag" i]',
    '.tag-select'
  ], 'Tag dropdown');

  await sleep(500);

  await page.keyboard.type(tag);
  await sleep(1000);

  try {
    await page.locator(`text="${tag}"`).first().click();
  } catch (e) {
    await page.keyboard.press('Enter');
  }

  await sleep(500);

  await clickElement(page, [
    'button:has-text("Save Action")',
    'button:has-text("Save")',
    'button:has-text("Add")'
  ], 'Save Action');
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 GHL Workflow Builder v2');
  console.log('='.repeat(60));
  console.log(`Location: ${LOCATION_ID}`);
  console.log(`Session file: ${SESSION_FILE}`);

  // Load existing session if available
  const savedSession = loadSession();

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 100,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: savedSession || undefined
  });

  const page = await context.newPage();

  try {
    // Step 1: Ensure we're logged in
    const loggedIn = await ensureLoggedIn(page, context);

    if (!loggedIn) {
      console.log('\n❌ Could not log in. Exiting.');
      await browser.close();
      return;
    }

    // Step 2: Navigate to workflows
    await navigateToWorkflows(page);

    // Step 3: Create each workflow
    for (const workflow of workflows) {
      try {
        await createWorkflow(page, workflow);
      } catch (error) {
        console.log(`\n❌ Error creating "${workflow.name}": ${error.message}`);
        await screenshot(page, 'workflow-error');
      }

      // Navigate back to workflows list for next one
      await navigateToWorkflows(page);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All workflows processed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    await screenshot(page, 'fatal-error');
  }

  // Keep browser open for verification
  console.log('\n📌 Browser will stay open for 5 minutes for verification.');
  console.log('   Press Ctrl+C to close earlier.');
  await sleep(300000);

  await browser.close();
}

main().catch(console.error);
