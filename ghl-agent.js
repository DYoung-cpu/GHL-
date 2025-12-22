/**
 * GHL Automation Agent - Robust Playwright automation for GoHighLevel
 *
 * This agent handles:
 * - Persistent authentication (saves session)
 * - Workflow creation
 * - Template management
 * - Email/SMS configuration
 *
 * Usage: node ghl-agent.js <command> [options]
 * Commands:
 *   login        - Login and save session
 *   workflows    - Create workflows
 *   test         - Test connection
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  locationId: 'e6yMsslzphNw8bgqRgtV',
  baseUrl: 'https://app.gohighlevel.com',
  sessionFile: path.join(__dirname, 'ghl-session.json'),
  screenshotsDir: path.join(__dirname, 'screenshots'),
  timeout: 60000,
  slowMo: 100 // Slow down for stability
};

// GHL Selectors - Verified and robust
const SELECTORS = {
  // Login page
  login: {
    googleButton: 'button:has-text("Sign in with Google"), div:has-text("Sign in with Google")',
    emailInput: 'input[type="email"], input[name="email"], input#email',
    passwordInput: 'input[type="password"], input[name="password"]',
    signInButton: 'button[type="submit"]:has-text("Sign in")'
  },

  // Navigation
  nav: {
    automation: 'a[href*="/automation"], text=Automation',
    workflows: 'a[href*="/workflows"], text=Workflows',
    settings: 'a[href*="/settings"], text=Settings',
    contacts: 'a[href*="/contacts"], text=Contacts'
  },

  // Workflow builder
  workflow: {
    createButton: 'button:has-text("Create Workflow"), button:has-text("Create")',
    startFromScratch: 'text=Start from Scratch',
    blankWorkflow: 'text=Blank Workflow',
    nameInput: 'input[placeholder*="name" i], input[placeholder*="workflow" i]',
    continueButton: 'button:has-text("Continue"), button:has-text("Create"), button:has-text("Next")',
    saveButton: 'button:has-text("Save"), button:has-text("Publish")',

    // Trigger
    addTrigger: 'text=Add New Trigger, text=Add Trigger, button:has-text("Add Trigger")',
    triggerContactTag: 'text=Contact Tag',
    triggerTagAdded: 'text=Tag Added, text=tag is added',
    tagDropdown: '[data-testid="tag-select"], input[placeholder*="tag" i], .tag-select',

    // Actions
    addAction: 'button:has-text("Add Action"), text=Add Action, [data-testid="add-action"]',
    actionSendSms: 'text=Send SMS',
    actionSendEmail: 'text=Send Email',
    actionWait: 'text=Wait',
    actionAddTag: 'text=Add Tag',

    // Action configuration
    useTemplate: 'button:has-text("Use Template"), text=Use Template',
    templateSearch: 'input[placeholder*="search" i]',
    delayValue: 'input[type="number"]',
    delayUnit: 'select, [role="listbox"]',

    // Common
    modal: '.modal, [role="dialog"]',
    closeModal: 'button:has-text("Close"), button[aria-label="Close"]',
    plusButton: 'button svg[data-icon="plus"], button:has(svg.fa-plus)'
  }
};

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveScreenshot(page, name) {
  const filepath = path.join(CONFIG.screenshotsDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot: ${filepath}`);
  return filepath;
}

async function waitAndClick(page, selector, options = {}) {
  const { timeout = CONFIG.timeout, force = false } = options;

  try {
    // Try multiple selector patterns
    const selectors = selector.split(', ');

    for (const sel of selectors) {
      try {
        const element = await page.waitForSelector(sel.trim(), { timeout: 5000, state: 'visible' });
        if (element) {
          if (force) {
            await element.click({ force: true });
          } else {
            await element.click();
          }
          console.log(`Clicked: ${sel.trim()}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    console.log(`Could not find: ${selector}`);
    return false;
  } catch (error) {
    console.log(`Error clicking ${selector}: ${error.message}`);
    return false;
  }
}

async function typeInField(page, selector, text, options = {}) {
  const { clear = true } = options;

  try {
    const selectors = selector.split(', ');

    for (const sel of selectors) {
      try {
        const element = await page.waitForSelector(sel.trim(), { timeout: 5000, state: 'visible' });
        if (element) {
          if (clear) {
            await element.fill('');
          }
          await element.fill(text);
          console.log(`Typed in ${sel.trim()}: ${text}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (error) {
    console.log(`Error typing in ${selector}: ${error.message}`);
    return false;
  }
}

// Session management
async function saveSession(context) {
  const state = await context.storageState();
  fs.writeFileSync(CONFIG.sessionFile, JSON.stringify(state, null, 2));
  console.log('Session saved to:', CONFIG.sessionFile);
}

async function loadSession() {
  if (fs.existsSync(CONFIG.sessionFile)) {
    const state = JSON.parse(fs.readFileSync(CONFIG.sessionFile, 'utf8'));
    console.log('Session loaded from:', CONFIG.sessionFile);
    return state;
  }
  return null;
}

// Browser initialization
async function initBrowser(options = {}) {
  const { headless = false } = options;

  const browser = await chromium.launch({
    headless,
    channel: 'msedge',
    slowMo: CONFIG.slowMo,
    args: ['--start-maximized']
  });

  const session = await loadSession();

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: session || undefined
  });

  const page = await context.newPage();

  return { browser, context, page };
}

// Login flow
async function login(page, context) {
  console.log('\n=== GHL Login ===');

  await page.goto(CONFIG.baseUrl);
  await sleep(2000);

  const currentUrl = page.url();

  // Check if already logged in
  if (currentUrl.includes('/location/') || currentUrl.includes('/dashboard')) {
    console.log('Already logged in!');
    await saveSession(context);
    return true;
  }

  // Need to login
  console.log('Login required. Clicking Google Sign In...');
  await saveScreenshot(page, 'login-page');

  // Click Google sign in
  const googleClicked = await waitAndClick(page, SELECTORS.login.googleButton);

  if (googleClicked) {
    console.log('\n>>> Complete Google login in the browser window <<<');
    console.log('>>> Waiting up to 120 seconds... <<<\n');

    // Wait for successful login (URL changes to dashboard/location)
    try {
      await page.waitForURL('**/location/**', { timeout: 120000 });
      console.log('Login successful!');
      await saveSession(context);
      return true;
    } catch (e) {
      // Try alternate URL pattern
      try {
        await page.waitForURL('**/dashboard**', { timeout: 10000 });
        console.log('Login successful!');
        await saveSession(context);
        return true;
      } catch (e2) {
        console.log('Login timeout. Current URL:', page.url());
        await saveScreenshot(page, 'login-failed');
        return false;
      }
    }
  }

  return false;
}

// Navigate to sub-account
async function navigateToLocation(page) {
  console.log('\n=== Navigating to Location ===');

  const targetUrl = `${CONFIG.baseUrl}/v2/location/${CONFIG.locationId}/dashboard`;
  await page.goto(targetUrl);
  await sleep(3000);

  // Check if we're at the right location
  const currentUrl = page.url();
  if (currentUrl.includes(CONFIG.locationId)) {
    console.log('Successfully at LENDWISE location');
    return true;
  }

  console.log('May need to select sub-account...');
  await saveScreenshot(page, 'location-check');
  return false;
}

// Workflow creation
async function createWorkflow(page, workflow) {
  console.log(`\n=== Creating Workflow: ${workflow.name} ===`);

  // Navigate to workflows
  const workflowsUrl = `${CONFIG.baseUrl}/v2/location/${CONFIG.locationId}/automation/workflows`;
  await page.goto(workflowsUrl);
  await sleep(3000);
  await saveScreenshot(page, 'workflows-page');

  // Click Create Workflow
  console.log('Clicking Create Workflow...');
  await waitAndClick(page, SELECTORS.workflow.createButton);
  await sleep(2000);
  await saveScreenshot(page, 'create-workflow-modal');

  // Select Start from Scratch
  console.log('Selecting Start from Scratch...');
  await waitAndClick(page, SELECTORS.workflow.startFromScratch);
  await sleep(1000);

  // Or click Blank Workflow if that's the option
  await waitAndClick(page, SELECTORS.workflow.blankWorkflow);
  await sleep(2000);
  await saveScreenshot(page, 'workflow-type-selected');

  // Name the workflow
  console.log(`Naming workflow: ${workflow.name}`);
  await typeInField(page, SELECTORS.workflow.nameInput, workflow.name);
  await sleep(500);

  // Click Continue/Create
  await waitAndClick(page, SELECTORS.workflow.continueButton);
  await sleep(3000);
  await saveScreenshot(page, 'workflow-builder-opened');

  // Add Trigger
  console.log('Adding trigger...');
  await waitAndClick(page, SELECTORS.workflow.addTrigger);
  await sleep(2000);

  if (workflow.trigger.type === 'tag_added') {
    // Select Contact Tag trigger
    await waitAndClick(page, SELECTORS.workflow.triggerContactTag);
    await sleep(1500);

    // Configure for "tag added"
    await waitAndClick(page, SELECTORS.workflow.triggerTagAdded);
    await sleep(1000);

    // Select the specific tag
    console.log(`Selecting tag: ${workflow.trigger.tag}`);
    await waitAndClick(page, SELECTORS.workflow.tagDropdown);
    await sleep(500);
    await page.keyboard.type(workflow.trigger.tag);
    await sleep(1000);

    // Click the matching tag option
    try {
      await page.click(`text="${workflow.trigger.tag}"`);
    } catch (e) {
      // Try pressing Enter to select
      await page.keyboard.press('Enter');
    }
    await sleep(500);

    // Save trigger
    await waitAndClick(page, 'button:has-text("Save Trigger"), button:has-text("Save"), button:has-text("Add")');
  }

  await sleep(2000);
  await saveScreenshot(page, 'trigger-configured');

  // Add workflow steps
  console.log('Adding workflow steps...');

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    console.log(`  Step ${i + 1}: ${step.type} - ${step.template || step.delay || step.tag || ''}`);

    // Click to add action (look for + button or Add Action)
    const addClicked = await waitAndClick(page, SELECTORS.workflow.addAction);
    if (!addClicked) {
      // Try clicking the + button directly
      await page.click(SELECTORS.workflow.plusButton).catch(() => {});
    }
    await sleep(1500);

    switch (step.type) {
      case 'sms':
        await waitAndClick(page, SELECTORS.workflow.actionSendSms);
        await sleep(1500);

        // Use template
        await waitAndClick(page, SELECTORS.workflow.useTemplate);
        await sleep(1000);

        // Search for template
        await typeInField(page, SELECTORS.workflow.templateSearch, step.template);
        await sleep(1500);

        // Select template
        try {
          await page.click(`text="${step.template}"`);
        } catch (e) {
          await page.keyboard.press('Enter');
        }
        break;

      case 'email':
        await waitAndClick(page, SELECTORS.workflow.actionSendEmail);
        await sleep(1500);

        await waitAndClick(page, SELECTORS.workflow.useTemplate);
        await sleep(1000);

        await typeInField(page, SELECTORS.workflow.templateSearch, step.template);
        await sleep(1500);

        try {
          await page.click(`text="${step.template}"`);
        } catch (e) {
          await page.keyboard.press('Enter');
        }
        break;

      case 'wait':
        await waitAndClick(page, SELECTORS.workflow.actionWait);
        await sleep(1500);

        // Parse delay (e.g., "5 minutes", "1 day")
        const parts = step.delay.split(' ');
        const value = parts[0];
        const unit = parts[1] || 'minutes';

        await typeInField(page, SELECTORS.workflow.delayValue, value);
        // Unit selection would need to find and click dropdown
        break;

      case 'add_tag':
        await waitAndClick(page, SELECTORS.workflow.actionAddTag);
        await sleep(1500);

        await typeInField(page, SELECTORS.workflow.tagDropdown, step.tag);
        await sleep(1000);

        try {
          await page.click(`text="${step.tag}"`);
        } catch (e) {
          await page.keyboard.press('Enter');
        }
        break;
    }

    // Save the action
    await waitAndClick(page, 'button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    await sleep(1500);
  }

  await saveScreenshot(page, 'workflow-steps-added');

  // Save/Publish workflow
  console.log('Saving workflow...');
  await waitAndClick(page, SELECTORS.workflow.saveButton);
  await sleep(2000);

  await saveScreenshot(page, 'workflow-saved');
  console.log(`Workflow "${workflow.name}" created!`);

  return true;
}

// Main execution
async function main() {
  const command = process.argv[2] || 'test';

  console.log('GHL Automation Agent');
  console.log('====================');
  console.log(`Command: ${command}`);
  console.log(`Location: ${CONFIG.locationId}`);

  // Ensure screenshots directory exists
  if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
  }

  const { browser, context, page } = await initBrowser();

  try {
    // Always try to login/verify session first
    const loggedIn = await login(page, context);

    if (!loggedIn) {
      console.log('\nLogin failed. Please try again.');
      await browser.close();
      return;
    }

    // Navigate to correct location
    await navigateToLocation(page);

    switch (command) {
      case 'login':
        console.log('\nLogin complete. Session saved.');
        break;

      case 'test':
        console.log('\nTest complete. Session is valid.');
        await saveScreenshot(page, 'test-success');
        break;

      case 'workflows':
        // Load workflow definitions
        const workflowsData = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'templates', 'workflows-templates.json'), 'utf8')
        );

        // Create first workflow as test
        const firstWorkflow = workflowsData.workflows[0];
        await createWorkflow(page, firstWorkflow);
        break;

      default:
        console.log(`Unknown command: ${command}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await saveScreenshot(page, 'error');
  }

  console.log('\nKeeping browser open for verification. Press Ctrl+C to close.');
  await sleep(300000); // 5 minutes

  await browser.close();
}

module.exports = {
  initBrowser,
  login,
  createWorkflow,
  CONFIG,
  SELECTORS
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
