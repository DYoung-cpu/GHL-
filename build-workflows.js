/**
 * GHL Workflow Builder Automation
 *
 * Opens each workflow and adds actions based on templates
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA_DIR = path.join(__dirname, 'browser-data');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Load workflow templates
const templates = JSON.parse(fs.readFileSync('templates/workflows-templates.json', 'utf8'));

// Load existing snippets for mapping
let smsTemplates = {};
let emailTemplates = {};
try {
  const smsData = JSON.parse(fs.readFileSync('templates/sms-templates.json', 'utf8'));
  smsTemplates = smsData.templates || {};
  const emailData = JSON.parse(fs.readFileSync('templates/email-templates.json', 'utf8'));
  emailTemplates = emailData.templates || {};
} catch (e) {
  console.log('Note: Could not load all template files');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildWorkflows() {
  console.log('='.repeat(60));
  console.log('GHL WORKFLOW BUILDER AUTOMATION');
  console.log('='.repeat(60));
  console.log('');

  // Launch with persistent context
  console.log('Launching browser...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    slowMo: 100
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Navigate to workflows list
    console.log('\nNavigating to workflows...');
    await page.goto(`https://app.gohighlevel.com/location/${LOCATION_ID}/workflow/folder`);

    // Wait for page to fully load (wait for loading spinner to disappear)
    console.log('Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    await delay(5000);

    // Wait for workflow content to appear
    try {
      await page.waitForSelector('table, [class*="workflow"], [class*="card"]', { timeout: 30000 });
      console.log('Page loaded!');
    } catch (e) {
      console.log('Timeout waiting for workflow elements, continuing anyway...');
    }
    await delay(2000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/workflow-list.png' });
    console.log('Screenshot: workflow-list.png');

    // Find all workflow cards/links
    console.log('\nLooking for workflows...');

    // Wait for workflow list to load
    await page.waitForSelector('[class*="workflow"], a[href*="workflow"], table tbody tr', { timeout: 10000 }).catch(() => {});

    // Get workflow list from the page
    const workflowsFromPage = await page.evaluate(() => {
      const workflows = [];

      // Try multiple strategies to find workflows

      // Strategy 1: Table rows
      const tableRows = document.querySelectorAll('table tbody tr');
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          const nameCell = cells[0];
          const link = row.querySelector('a[href*="workflow"]') || nameCell.querySelector('a');
          const name = nameCell.textContent?.trim();
          if (name && link?.href) {
            workflows.push({ name, href: link.href });
          }
        }
      });

      // Strategy 2: Workflow cards
      const cards = document.querySelectorAll('[class*="workflow"], [class*="card"], [class*="item"]');
      cards.forEach(card => {
        const text = card.textContent;
        const link = card.querySelector('a[href*="workflow"]') || card.closest('a[href*="workflow"]');
        if (link?.href && text) {
          const name = text.split('\n')[0]?.trim()?.substring(0, 50);
          if (name && !workflows.find(w => w.href === link.href)) {
            workflows.push({ name, href: link.href });
          }
        }
      });

      // Strategy 3: Direct links
      const links = document.querySelectorAll('a[href*="/workflow/"]');
      links.forEach(link => {
        const href = link.href;
        // Only include workflow builder links (not folder links)
        if (href.includes('/workflow/') && !href.includes('/folder')) {
          const name = link.textContent?.trim() || 'Unknown';
          if (!workflows.find(w => w.href === href)) {
            workflows.push({ name, href });
          }
        }
      });

      // Log what we found to console for debugging
      console.log('Found workflows:', workflows);

      return workflows;
    });

    console.log(`Found ${workflowsFromPage.length} workflows on page`);
    workflowsFromPage.forEach(w => console.log(`  - ${w.name}`));

    // Map template workflows to actual GHL workflows
    const workflowMap = {
      'New Lead Nurture Sequence': templates.workflows.find(w => w.id === 'wf-new-lead-nurture'),
      'Appointment Reminder Sequence': templates.workflows.find(w => w.id === 'wf-appointment-reminders'),
      'Missed Appointment Follow-Up': templates.workflows.find(w => w.id === 'wf-missed-appointment'),
      'Pre-Qualification Process Workflow': templates.workflows.find(w => w.id === 'wf-pre-qual-process'),
      'Pre-Qualification Complete Notification': templates.workflows.find(w => w.id === 'wf-pre-qual-complete'),
      'Application Process Updates': templates.workflows.find(w => w.id === 'wf-application-process'),
      'Underwriting Status Updates': templates.workflows.find(w => w.id === 'wf-underwriting-updates'),
      'Conditional Approval Celebration': templates.workflows.find(w => w.id === 'wf-conditional-approval'),
      'Clear to Close Celebration': templates.workflows.find(w => w.id === 'wf-clear-to-close'),
      'Closing Countdown Sequence': templates.workflows.find(w => w.id === 'wf-closing-sequence'),
      'Post-Close Nurture & Referral Sequence': templates.workflows.find(w => w.id === 'wf-post-close-nurture'),
      'Realtor Partner Updates': templates.workflows.find(w => w.id === 'wf-realtor-updates'),
      'Rate Drop Alert Campaign': templates.workflows.find(w => w.id === 'wf-rate-drop-alert'),
      'Birthday Wishes': templates.workflows.find(w => w.id === 'wf-birthday'),
      'Stale Lead Re-engagement': templates.workflows.find(w => w.id === 'wf-stale-lead-reengagement')
    };

    // Process each workflow
    for (const [workflowName, templateData] of Object.entries(workflowMap)) {
      if (!templateData) continue;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`BUILDING: ${workflowName}`);
      console.log('='.repeat(60));

      // Find the workflow on the page
      const workflowLink = workflowsFromPage.find(w =>
        w.name?.toLowerCase().includes(workflowName.toLowerCase().split(' ')[0]) ||
        workflowName.toLowerCase().includes(w.name?.toLowerCase().split(' ')[0])
      );

      if (!workflowLink?.href) {
        console.log(`  Could not find workflow link for: ${workflowName}`);
        continue;
      }

      // Navigate to the workflow builder
      console.log(`  Opening: ${workflowLink.href}`);
      await page.goto(workflowLink.href);
      await delay(3000);

      // Take screenshot of the workflow builder
      const screenshotName = `workflow-${templateData.id}.png`;
      await page.screenshot({ path: `screenshots/${screenshotName}` });
      console.log(`  Screenshot: ${screenshotName}`);

      // Now build the steps
      console.log(`  Building ${templateData.steps.length} steps...`);

      for (const step of templateData.steps) {
        console.log(`    Step ${step.order}: ${step.action} - ${step.description}`);

        try {
          // Try to add an action
          await addWorkflowAction(page, step);
        } catch (e) {
          console.log(`      Error: ${e.message}`);
        }
      }

      // Save the workflow
      console.log('  Saving workflow...');
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Publish")').first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await delay(2000);
      }

      console.log(`  Completed: ${workflowName}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW BUILD COMPLETE');
    console.log('='.repeat(60));
    console.log('\nBrowser will stay open for review.');
    console.log('Press Ctrl+C to close.');

    await delay(300000); // 5 minutes

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await context.close();
  }
}

async function addWorkflowAction(page, step) {
  // Look for the "+" button to add action
  const addButton = await findAddButton(page);

  if (!addButton) {
    console.log('      Could not find add button');
    return;
  }

  // Click add button
  await addButton.click();
  await delay(1000);

  // Select action type
  switch (step.action) {
    case 'send_sms':
      await selectAction(page, 'SMS', 'Send SMS');
      break;
    case 'send_email':
      await selectAction(page, 'Email', 'Send Email');
      break;
    case 'add_tag':
      await selectAction(page, 'Tag', 'Add Tag');
      break;
    case 'update_pipeline_stage':
      await selectAction(page, 'Pipeline', 'Update');
      break;
    case 'internal_notification':
      await selectAction(page, 'Notification', 'Internal');
      break;
    default:
      console.log(`      Unknown action type: ${step.action}`);
  }

  // Configure delay if needed
  if (step.delay && step.delay !== '0 minutes') {
    await configureDelay(page, step.delay);
  }
}

async function findAddButton(page) {
  // Try multiple selectors for the add button
  const selectors = [
    'button:has(svg[class*="plus"])',
    '[class*="add-action"]',
    '[class*="add-node"]',
    'button[aria-label*="add" i]',
    '[data-testid*="add"]',
    '.add-step',
    'button:has-text("+")',
    '[class*="AddAction"]'
  ];

  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      return btn;
    }
  }

  // Try clicking on the connector line between nodes
  const connector = page.locator('[class*="connector"], [class*="edge"], [class*="path"]').first();
  if (await connector.isVisible({ timeout: 500 }).catch(() => false)) {
    return connector;
  }

  return null;
}

async function selectAction(page, category, actionName) {
  // Wait for action modal/panel
  await delay(500);

  // Try to find and click the category
  const categoryBtn = page.locator(`text=${category}`).first();
  if (await categoryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await categoryBtn.click();
    await delay(500);
  }

  // Try to find and click the specific action
  const actionBtn = page.locator(`text=${actionName}`).first();
  if (await actionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await actionBtn.click();
    await delay(500);
  }
}

async function configureDelay(page, delayValue) {
  // Look for delay/wait configuration
  const waitInput = page.locator('[class*="delay"], [class*="wait"], input[type="number"]').first();
  if (await waitInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Parse delay value like "1 day", "5 minutes", "1 hour"
    const match = delayValue.match(/(\d+)\s*(minute|hour|day)/i);
    if (match) {
      await waitInput.fill(match[1]);

      // Select unit
      const unitSelect = page.locator('select, [class*="dropdown"]').first();
      if (await unitSelect.isVisible({ timeout: 500 }).catch(() => false)) {
        await unitSelect.selectOption({ label: match[2] });
      }
    }
  }
}

buildWorkflows();
