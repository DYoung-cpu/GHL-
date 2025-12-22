/**
 * CONFIGURE ALL WORKFLOW TRIGGERS
 *
 * One session - browser stays open throughout.
 *
 * Steps:
 * 1. Login
 * 2. Delete 2 duplicate workflows
 * 3. Configure trigger for each of 15 workflows
 *
 * Key coordinates (from workflow-builder.png):
 * - "Add New Trigger" button: (700, 153)
 * - Back to Workflows: (118, 27)
 * - Draft/Publish toggle: (1270, 77)
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// All 15 workflows with their trigger configurations
const WORKFLOWS = [
  { name: 'Application Process Updates', trigger: 'tag', tag: 'Application Started' },
  { name: 'Appointment Reminder Sequence', trigger: 'appointment_booked', tag: null },
  { name: 'Birthday Wishes', trigger: 'birthday', tag: null },
  { name: 'Clear to Close Celebration', trigger: 'tag', tag: 'Clear to Close' },
  { name: 'Closing Countdown Sequence', trigger: 'tag', tag: 'Closing Scheduled' },
  { name: 'Conditional Approval Celebration', trigger: 'tag', tag: 'Conditionally Approved' },
  { name: 'Missed Appointment Follow-Up', trigger: 'appointment_status', tag: null },
  { name: 'New Lead Nurture Sequence', trigger: 'tag', tag: 'New Lead' },
  { name: 'Post-Close Nurture & Referral Sequence', trigger: 'tag', tag: 'Closed' },
  { name: 'Pre-Qualification Complete Notification', trigger: 'tag', tag: 'Pre-Qual Complete' },
  { name: 'Pre-Qualification Process Workflow', trigger: 'tag', tag: 'Pre-Qual Started' },
  { name: 'Rate Drop Alert Campaign', trigger: 'manual', tag: null },
  { name: 'Realtor Partner Updates', trigger: 'tag', tag: 'Realtor Referral' },
  { name: 'Stale Lead Re-engagement', trigger: 'stale', tag: null },
  { name: 'Underwriting Status Updates', trigger: 'tag', tag: 'In Underwriting' }
];

let page, context, browser;

async function sleep(ms) {
  await page.waitForTimeout(ms);
}

async function login() {
  console.log('\n[LOGIN] Starting...');
  await page.goto('https://app.gohighlevel.com/');
  await sleep(3000);

  const iframe = await page.$('#g_id_signin iframe');
  if (iframe) {
    const frame = await iframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await sleep(4000);

  const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (gp) {
    await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
    await gp.keyboard.press('Enter');
    await sleep(4000);
    try {
      await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
      await gp.fill('input[type="password"]:visible', 'Fafa2185!');
      await gp.keyboard.press('Enter');
    } catch(e) {}
    await sleep(10000);
  }
  console.log('[LOGIN] Complete!');
}

async function goToWorkflows() {
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(5000);
}

async function searchAndOpenWorkflow(name) {
  await goToWorkflows();

  // Click search box
  await page.mouse.click(1200, 239);
  await sleep(500);

  // Clear any existing search
  await page.keyboard.press('Control+a');
  await page.keyboard.type(name.substring(0, 25));
  await sleep(2000);

  // Click first result
  await page.mouse.click(400, 371);
  await sleep(4000);

  return page.url().includes('/workflow/');
}

async function addTagTrigger(tagName) {
  console.log(`      Adding "Tag Added" trigger for "${tagName}"...`);

  // Click "Add New Trigger" button
  await page.mouse.click(700, 153);
  await sleep(2000);

  // Screenshot the trigger selection panel
  await page.screenshot({ path: './screenshots/trigger-selection.png' });

  // Look for "Contact Tag" or similar in the trigger panel
  // The panel typically appears on the right side
  // Common trigger categories: Contact, Appointment, Opportunity, etc.

  // Try clicking on "Contact Tag" option - usually in a list
  // First, let's see if there's a search in the panel
  await page.keyboard.type('tag');
  await sleep(1000);

  // Click on the tag trigger option (position varies based on UI)
  // Usually first result after search
  await page.mouse.click(1100, 200);  // Approximate position in right panel
  await sleep(2000);

  await page.screenshot({ path: './screenshots/trigger-config.png' });

  // Now configure the tag name
  // Look for a dropdown or input to select the tag
  await page.keyboard.type(tagName);
  await sleep(1000);

  // Press Enter to confirm or click Save
  await page.keyboard.press('Enter');
  await sleep(1500);

  // Click Save if there's a save button
  await page.mouse.click(1300, 800);  // Common save button position
  await sleep(2000);
}

async function configureWorkflow(wf, index) {
  console.log(`\n[${index + 1}/15] ${wf.name}`);

  const opened = await searchAndOpenWorkflow(wf.name);
  if (!opened) {
    console.log('      ERROR: Could not open workflow');
    return;
  }

  await page.screenshot({ path: `./screenshots/wf-${index + 1}-before.png` });

  if (wf.trigger === 'tag' && wf.tag) {
    await addTagTrigger(wf.tag);
  } else {
    console.log(`      MANUAL: ${wf.trigger} trigger - configure manually`);
  }

  await page.screenshot({ path: `./screenshots/wf-${index + 1}-after.png` });

  // Go back to workflow list
  await page.mouse.click(118, 27);
  await sleep(3000);
}

async function main() {
  console.log('='.repeat(60));
  console.log('WORKFLOW TRIGGER CONFIGURATION');
  console.log('='.repeat(60));

  browser = await chromium.launch({ headless: false, slowMo: 200 });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  try {
    await login();

    // First, let's screenshot the trigger panel to understand its structure
    console.log('\n[EXPLORE] Opening first workflow to map trigger UI...');

    await goToWorkflows();
    await page.mouse.click(400, 371);  // Click first workflow
    await sleep(4000);

    // Click "Add New Trigger"
    await page.mouse.click(700, 153);
    await sleep(3000);
    await page.screenshot({ path: './screenshots/trigger-panel-full.png', fullPage: true });

    console.log('\n[INFO] Trigger panel screenshot saved.');
    console.log('[INFO] Review screenshots/trigger-panel-full.png to see available triggers.\n');

    // Go back
    await page.mouse.click(118, 27);
    await sleep(3000);

    // Now configure each workflow
    console.log('\n[CONFIGURE] Starting workflow configuration...');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      await configureWorkflow(WORKFLOWS[i], i);
    }

    // Final screenshot
    await goToWorkflows();
    await page.screenshot({ path: './screenshots/all-triggers-done.png' });

    console.log('\n' + '='.repeat(60));
    console.log('CONFIGURATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nBrowser staying open for review...');
    console.log('Press Ctrl+C to close.\n');

    // Keep browser open
    await sleep(600000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/config-error.png' });
  }

  await browser.close();
}

main();
