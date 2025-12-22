/**
 * Configure All Workflow Triggers via Playwright
 * Uses direct workflow URLs and API-fetched IDs
 */

require('dotenv').config();
const { chromium } = require('playwright');
const GHLClient = require('./ghl-api');

const LOCATION_ID = process.env.GHL_LOCATION_ID;

// Workflow to Tag Mapping (based on workflows-templates.json)
const WORKFLOW_TRIGGER_MAP = {
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

async function configureWorkflowTrigger(page, workflowId, workflowName, triggerTag) {
  console.log(`\n=== Configuring: ${workflowName} ===`);
  console.log(`   Workflow ID: ${workflowId}`);
  console.log(`   Trigger Tag: ${triggerTag}`);

  try {
    // Navigate directly to workflow
    const workflowUrl = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflow/${workflowId}`;
    console.log(`   Loading: ${workflowUrl}`);
    await page.goto(workflowUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Look for the trigger block - it usually has "Add Trigger" or similar text
    // In GHL workflow builder, the trigger is the first block at the top
    const triggerSelectors = [
      'text=Add Trigger',
      'text=New Trigger',
      '[data-testid="workflow-trigger"]',
      '.workflow-trigger',
      '.trigger-block',
      'text=When this happens'
    ];

    let triggerFound = false;
    for (const selector of triggerSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`   Found trigger via: ${selector}`);
        await element.click();
        triggerFound = true;
        break;
      }
    }

    if (!triggerFound) {
      // Try clicking the first node in the workflow canvas
      const firstNode = await page.$('.react-flow__node:first-child');
      if (firstNode) {
        console.log('   Clicking first workflow node...');
        await firstNode.click();
        triggerFound = true;
      }
    }

    if (!triggerFound) {
      console.log('   WARNING: Could not find trigger block');
      await page.screenshot({ path: `screenshots/trigger-not-found-${workflowId}.png` });
      return false;
    }

    await page.waitForTimeout(2000);

    // Look for trigger type dropdown or selection
    // GHL typically shows a panel on the right side with trigger options
    const triggerTypeSelectors = [
      'text=Customer Tag',
      'text=Tag Added',
      'text=Contact Tag Added',
      '[data-testid="trigger-type-tag"]'
    ];

    let typeSelected = false;
    for (const selector of triggerTypeSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`   Selecting trigger type: ${selector}`);
        await element.click();
        typeSelected = true;
        break;
      }
    }

    if (!typeSelected) {
      // Try looking for a dropdown to select trigger type
      const dropdown = await page.$('select, [role="listbox"], .dropdown-toggle');
      if (dropdown) {
        await dropdown.click();
        await page.waitForTimeout(1000);
        const tagOption = await page.$('text=Customer Tag');
        if (tagOption) {
          await tagOption.click();
          typeSelected = true;
        }
      }
    }

    await page.waitForTimeout(2000);

    // Now select the specific tag
    // Look for tag input/dropdown
    const tagInputSelectors = [
      'input[placeholder*="tag"]',
      'input[placeholder*="Tag"]',
      '.tag-selector input',
      '[data-testid="tag-input"]',
      'input[type="text"]'
    ];

    let tagInput = null;
    for (const selector of tagInputSelectors) {
      tagInput = await page.$(selector);
      if (tagInput) {
        console.log(`   Found tag input: ${selector}`);
        break;
      }
    }

    if (tagInput) {
      await tagInput.fill(triggerTag);
      await page.waitForTimeout(1500);

      // Look for dropdown option matching the tag
      const tagOption = await page.$(`text=${triggerTag}`);
      if (tagOption) {
        await tagOption.click();
        console.log(`   Selected tag: ${triggerTag}`);
      }
    }

    await page.waitForTimeout(2000);

    // Save the workflow
    const saveSelectors = [
      'text=Save',
      'button:has-text("Save")',
      '[data-testid="save-button"]',
      '.save-button'
    ];

    for (const selector of saveSelectors) {
      const saveBtn = await page.$(selector);
      if (saveBtn) {
        console.log(`   Saving workflow...`);
        await saveBtn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    await page.screenshot({ path: `screenshots/configured-${workflowName.replace(/\s+/g, '-').toLowerCase()}.png` });
    console.log(`   ✓ Configuration complete`);
    return true;

  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    await page.screenshot({ path: `screenshots/error-${workflowId}.png` });
    return false;
  }
}

async function main() {
  console.log('=== GHL Workflow Trigger Configuration ===\n');

  // Fetch workflows from API
  const client = new GHLClient();
  const { workflows } = await client.getWorkflows();

  console.log(`Found ${workflows.length} workflows in GHL\n`);

  // Match workflows to our trigger map
  const workflowsToConfig = [];
  for (const wf of workflows) {
    const triggerTag = WORKFLOW_TRIGGER_MAP[wf.name];
    if (triggerTag) {
      workflowsToConfig.push({
        id: wf.id,
        name: wf.name,
        triggerTag: triggerTag
      });
    }
  }

  console.log(`Workflows to configure: ${workflowsToConfig.length}`);
  workflowsToConfig.forEach(w => console.log(`  - ${w.name} → "${w.triggerTag}"`));

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'auth.json'  // Use saved authentication
  });

  const page = await context.newPage();

  // Configure each workflow
  let successCount = 0;
  let failCount = 0;

  for (const workflow of workflowsToConfig) {
    const success = await configureWorkflowTrigger(page, workflow.id, workflow.name, workflow.triggerTag);
    if (success) successCount++;
    else failCount++;
  }

  console.log('\n=== Summary ===');
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  // Keep browser open for inspection
  console.log('\nBrowser will remain open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
}

main().catch(console.error);
