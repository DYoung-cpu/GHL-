/**
 * Complete Workflow Trigger Setup Script
 * Handles login + trigger configuration for all tag-based workflows
 */

require('dotenv').config();
const { chromium } = require('playwright');
const GHLClient = require('./ghl-api');

const LOCATION_ID = process.env.GHL_LOCATION_ID;

// GHL Credentials
const GHL_EMAIL = 'david@lendwisemtg.com';
const GHL_PASSWORD = 'Fafa2185!';

// Workflow to Tag Mapping
const WORKFLOW_TRIGGERS = {
  'New Lead Nurture Sequence': 'new lead',
  'Pre-Qualification Process Workflow': 'pre-qual started',
  'Pre-Qualification Complete Notification': 'pre-qual complete',
  'Application Process Updates': 'application started',
  'Underwriting Status Updates': 'in underwriting',
  'Conditional Approval Celebration': 'conditionally approved',
  'Clear to Close Celebration': 'clear to close',
  'Closing Countdown Sequence': 'closing scheduled',
  'Post-Close Nurture & Referral Sequence': 'closed',
  'Realtor Partner Updates': 'realtor referral'
};

async function login(page, context) {
  console.log('\n=== Logging into GHL ===');

  await page.goto('https://app.gohighlevel.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'screenshots/login-01-initial.png' });

  // GHL login page structure
  // Try to find email input with various selectors
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email"]',
    'input[placeholder*="Email"]',
    '#email',
    'input.email-input'
  ];

  let emailInput = null;
  for (const sel of emailSelectors) {
    emailInput = await page.$(sel);
    if (emailInput) {
      console.log(`Found email input: ${sel}`);
      break;
    }
  }

  // If no email input found, try Google OAuth
  if (!emailInput) {
    console.log('No email input found, trying Google OAuth...');

    // Look for Google sign-in button
    const googleSelectors = [
      '#g_id_signin iframe',
      'div[data-context="signin"]',
      'button:has-text("Sign in with Google")',
      'text=Sign in with Google',
      '.google-signin-button'
    ];

    for (const sel of googleSelectors) {
      const googleBtn = await page.$(sel);
      if (googleBtn) {
        console.log(`Found Google button: ${sel}`);

        if (sel.includes('iframe')) {
          const frame = await googleBtn.contentFrame();
          if (frame) {
            await frame.click('div[role="button"]');
          }
        } else {
          await googleBtn.click();
        }

        await page.waitForTimeout(5000);

        // Handle Google popup
        const pages = context.pages();
        console.log(`Open pages: ${pages.length}`);

        for (const p of pages) {
          if (p.url().includes('accounts.google.com')) {
            console.log('Found Google OAuth page');
            await p.waitForLoadState('domcontentloaded');

            // Enter email
            const gEmailInput = await p.$('input[type="email"]');
            if (gEmailInput) {
              await gEmailInput.fill(GHL_EMAIL);
              await p.keyboard.press('Enter');
              await p.waitForTimeout(4000);
            }

            // Enter password
            const gPassInput = await p.$('input[type="password"]:visible');
            if (gPassInput) {
              await gPassInput.fill(GHL_PASSWORD);
              await p.keyboard.press('Enter');
              await page.waitForTimeout(10000);
            }
            break;
          }
        }
        break;
      }
    }
  } else {
    // Direct email/password login
    console.log('Using direct email/password login');
    await emailInput.fill(GHL_EMAIL);

    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.fill(GHL_PASSWORD);
    }

    // Click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")'
    ];

    for (const sel of submitSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(8000);
  }

  await page.screenshot({ path: 'screenshots/login-02-after-login.png' });

  // Wait for page to settle
  await page.waitForTimeout(5000);

  // Switch to Lendwise sub-account if needed
  const switcher = await page.$('text=Click here to switch');
  if (switcher) {
    console.log('Switching to LENDWISE sub-account...');
    await switcher.click();
    await page.waitForTimeout(2000);

    const lendwise = await page.$('text=LENDWISE MORTGA');
    if (lendwise) {
      await lendwise.click();
      await page.waitForTimeout(5000);
    }
  }

  await page.screenshot({ path: 'screenshots/login-03-final.png' });

  // Save auth state for future use
  await context.storageState({ path: 'auth.json' });
  console.log('Auth state saved to auth.json');

  return true;
}

async function configureWorkflowTrigger(page, workflowId, workflowName, tagName) {
  console.log(`\n--- ${workflowName} ---`);
  console.log(`    Tag: "${tagName}"`);

  try {
    // Navigate to workflow editor
    const url = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflow/${workflowId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-01-loaded.png` });

    // Click on the trigger block (first node in canvas)
    // GHL workflow builder has the trigger at the top

    // Try clicking "Add Trigger" or the trigger node
    const triggerSelectors = [
      '.react-flow__node >> text=Add Trigger',
      'text=Add Trigger',
      '[data-id="trigger"]',
      '.trigger-node',
      '.react-flow__node:first-child'
    ];

    let clicked = false;
    for (const sel of triggerSelectors) {
      const el = await page.$(sel);
      if (el) {
        console.log(`    Clicking: ${sel}`);
        await el.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Use coordinate click in the trigger area (top-center of canvas)
      console.log('    Using coordinate click for trigger block');
      await page.mouse.click(686, 350);  // Approximate trigger position
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-02-clicked.png` });

    // Look for trigger type selection panel (usually appears on right side)
    // Select "Contact Tag" trigger type
    const tagTriggerSelectors = [
      'text=Contact Tag',
      'text=Customer Tag',
      'text=Tag Added',
      '[data-testid="trigger-contact-tag"]'
    ];

    for (const sel of tagTriggerSelectors) {
      const el = await page.$(sel);
      if (el) {
        console.log(`    Selecting trigger type: ${sel}`);
        await el.click();
        await page.waitForTimeout(1500);
        break;
      }
    }

    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-03-type-selected.png` });

    // Now select the specific tag
    // Look for tag dropdown/input
    const tagInputSelectors = [
      'input[placeholder*="Select tag"]',
      'input[placeholder*="tag"]',
      '[data-testid="tag-select"]',
      '.tag-dropdown input',
      'select[name*="tag"]'
    ];

    for (const sel of tagInputSelectors) {
      const el = await page.$(sel);
      if (el) {
        console.log(`    Found tag input: ${sel}`);
        await el.click();
        await page.waitForTimeout(1000);

        // Type the tag name to filter
        await el.fill(tagName);
        await page.waitForTimeout(1500);

        // Click the dropdown option
        const option = await page.$(`text="${tagName}"`);
        if (option) {
          await option.click();
          console.log(`    Selected tag: ${tagName}`);
        } else {
          // Try clicking first dropdown option
          const firstOption = await page.$('.dropdown-item, [role="option"], .select-option');
          if (firstOption) {
            await firstOption.click();
          }
        }
        break;
      }
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-04-tag-selected.png` });

    // Save the trigger configuration
    const saveBtn = await page.$('button:has-text("Save"), text=Save Trigger, [data-testid="save-trigger"]');
    if (saveBtn) {
      await saveBtn.click();
      console.log('    Saved trigger');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-05-saved.png` });

    return true;
  } catch (error) {
    console.log(`    ERROR: ${error.message}`);
    await page.screenshot({ path: `screenshots/trigger-${workflowName.replace(/\s+/g, '-').toLowerCase()}-error.png` });
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  GHL Workflow Trigger Configuration Script   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Get workflows from API
  console.log('Fetching workflows from API...');
  const client = new GHLClient();
  const { workflows } = await client.getWorkflows();
  console.log(`Found ${workflows.length} workflows\n`);

  // Match workflows to configure
  const toConfig = [];
  for (const wf of workflows) {
    if (WORKFLOW_TRIGGERS[wf.name]) {
      toConfig.push({
        id: wf.id,
        name: wf.name,
        tag: WORKFLOW_TRIGGERS[wf.name]
      });
    }
  }

  console.log(`Workflows to configure: ${toConfig.length}`);
  toConfig.forEach(w => console.log(`  • ${w.name} → "${w.tag}"`));

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Login
  await login(page, context);

  // Wait for dashboard to load
  await page.waitForTimeout(5000);
  console.log('\nLogged in successfully');

  // Configure each workflow
  let success = 0;
  let failed = 0;

  for (const wf of toConfig) {
    const result = await configureWorkflowTrigger(page, wf.id, wf.name, wf.tag);
    if (result) success++;
    else failed++;

    // Short pause between workflows
    await page.waitForTimeout(2000);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  Results: ${success} success, ${failed} failed              ║`);
  console.log('╚══════════════════════════════════════════════╝');

  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 60 seconds for inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
}

main().catch(console.error);
