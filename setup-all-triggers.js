/**
 * SETUP ALL WORKFLOW TRIGGERS
 *
 * Based on discovered coordinates:
 * - "Add New Trigger" button: (700, 153)
 * - Search box (after clicking trigger): type to filter
 * - "Contact Tag" option: ~(950, 405) after searching "tag"
 *
 * Browser stays open throughout - one login for all work.
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Workflows with tag-based triggers (11 of 15)
const TAG_WORKFLOWS = [
  { name: 'Application Process Updates', tag: 'Application Started' },
  { name: 'Clear to Close Celebration', tag: 'Clear to Close' },
  { name: 'Closing Countdown Sequence', tag: 'Closing Scheduled' },
  { name: 'Conditional Approval Celebration', tag: 'Conditionally Approved' },
  { name: 'New Lead Nurture Sequence', tag: 'New Lead' },
  { name: 'Post-Close Nurture & Referral Sequence', tag: 'Closed' },
  { name: 'Pre-Qualification Complete Notification', tag: 'Pre-Qual Complete' },
  { name: 'Pre-Qualification Process Workflow', tag: 'Pre-Qual Started' },
  { name: 'Realtor Partner Updates', tag: 'Realtor Referral' },
  { name: 'Underwriting Status Updates', tag: 'In Underwriting' }
];

// Manual configuration needed (4 of 15)
const MANUAL_WORKFLOWS = [
  { name: 'Appointment Reminder Sequence', trigger: 'Appointment Booked' },
  { name: 'Birthday Wishes', trigger: 'Birthday Reminder (Contact)' },
  { name: 'Missed Appointment Follow-Up', trigger: 'Appointment Status Changed' },
  { name: 'Rate Drop Alert Campaign', trigger: 'Manual Trigger' },
  { name: 'Stale Lead Re-engagement', trigger: 'Custom (no activity)' }
];

let page, context, browser;
const sleep = (ms) => page.waitForTimeout(ms);

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

async function openWorkflowBySearch(name) {
  await goToWorkflows();

  // Click search box and type
  await page.mouse.click(1200, 239);
  await sleep(300);
  await page.keyboard.press('Control+a');
  await page.keyboard.type(name.substring(0, 20));
  await sleep(2000);

  // Click first result
  await page.mouse.click(400, 371);
  await sleep(4000);

  return page.url().includes('/workflow/');
}

async function addContactTagTrigger(tagName) {
  // Click "Add New Trigger" button
  await page.mouse.click(700, 153);
  await sleep(2000);

  // Search for "tag" in the trigger panel
  await page.keyboard.type('tag');
  await sleep(1500);

  // Click "Contact Tag" option (filtered result)
  await page.mouse.click(950, 405);
  await sleep(2000);

  // Screenshot the tag configuration panel
  await page.screenshot({ path: './screenshots/tag-config-panel.png' });

  // Now we need to select the specific tag
  // The panel should show a dropdown or search for tags
  // Let's click on the tag selector area and type the tag name
  await page.mouse.click(1100, 350);  // Tag selector area
  await sleep(500);
  await page.keyboard.type(tagName);
  await sleep(1000);

  // Press Enter or click the matching tag
  await page.keyboard.press('Enter');
  await sleep(1000);

  // Look for and click Save button
  await page.mouse.click(1280, 750);  // Common save position
  await sleep(2000);

  return true;
}

async function configureTagWorkflow(wf, index, total) {
  console.log(`\n[${index + 1}/${total}] ${wf.name}`);
  console.log(`         Tag: "${wf.tag}"`);

  const opened = await openWorkflowBySearch(wf.name);
  if (!opened) {
    console.log('         ERROR: Could not open workflow');
    return false;
  }

  // Check if trigger already exists (canvas won't show "Add New Trigger" if it has one)
  await sleep(1000);
  await page.screenshot({ path: `./screenshots/setup-${index + 1}-before.png` });

  try {
    await addContactTagTrigger(wf.tag);
    console.log('         SUCCESS: Trigger added');
  } catch (e) {
    console.log(`         WARNING: ${e.message}`);
  }

  await page.screenshot({ path: `./screenshots/setup-${index + 1}-after.png` });

  // Go back
  await page.mouse.click(118, 27);
  await sleep(2000);

  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('WORKFLOW TRIGGER SETUP - ONE SESSION');
  console.log('='.repeat(60));

  browser = await chromium.launch({ headless: false, slowMo: 150 });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  try {
    await login();

    const total = TAG_WORKFLOWS.length;
    console.log(`\n[CONFIG] Setting up ${total} tag-based workflows...\n`);

    for (let i = 0; i < TAG_WORKFLOWS.length; i++) {
      await configureTagWorkflow(TAG_WORKFLOWS[i], i, total);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TAG WORKFLOWS COMPLETE');
    console.log('='.repeat(60));
    console.log('\nManual configuration needed for:');
    MANUAL_WORKFLOWS.forEach(wf => {
      console.log(`  - ${wf.name}: ${wf.trigger}`);
    });

    console.log('\nBrowser staying open for manual work...');
    console.log('Press Ctrl+C when done.\n');

    // Keep open for manual work
    await sleep(600000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: './screenshots/setup-error.png' });
  }

  await browser.close();
}

main();
