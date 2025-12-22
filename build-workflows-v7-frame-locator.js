/**
 * Build All 15 Mortgage Workflows - v7 (Frame Locator Method)
 * Uses frame.locator() for reliable GHL iframe interaction
 * Dec 13, 2025 - Working method discovered
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

// All 15 workflow definitions with their triggers
const WORKFLOWS = [
  { name: 'New Lead Nurture Sequence', trigger: 'Contact Tag', tagFilter: 'New Lead' },
  { name: 'Appointment Reminder Sequence', trigger: 'Appointment Status', manual: true },
  { name: 'Missed Appointment Follow-Up', trigger: 'Appointment Status', manual: true },
  { name: 'Pre-Qualification Process Workflow', trigger: 'Contact Tag', tagFilter: 'Pre-Qual Started' },
  { name: 'Pre-Qualification Complete Notification', trigger: 'Contact Tag', tagFilter: 'Pre-Qual Complete' },
  { name: 'Application Process Updates', trigger: 'Contact Tag', tagFilter: 'Application Started' },
  { name: 'Underwriting Status Updates', trigger: 'Contact Tag', tagFilter: 'In Underwriting' },
  { name: 'Conditional Approval Celebration', trigger: 'Contact Tag', tagFilter: 'Conditionally Approved' },
  { name: 'Clear to Close Celebration', trigger: 'Contact Tag', tagFilter: 'Clear to Close' },
  { name: 'Closing Countdown Sequence', trigger: 'Contact Tag', tagFilter: 'Closing Scheduled' },
  { name: 'Post-Close Nurture & Referral Sequence', trigger: 'Contact Tag', tagFilter: 'Closed' },
  { name: 'Realtor Partner Updates', trigger: 'Contact Tag', tagFilter: 'Realtor Referral' },
  { name: 'Rate Drop Alert Campaign', trigger: 'Manual', manual: true },
  { name: 'Birthday Wishes', trigger: 'Birthday Reminder', manual: true },
  { name: 'Stale Lead Re-engagement', trigger: 'Contact Tag', tagFilter: 'Cold Lead' }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}.png` });
  console.log(`   [screenshot: ${name}]`);
}

async function getFrame(page) {
  return page.frame({ url: /automation-workflows/ });
}

async function createWorkflow(page, frame, workflow, index) {
  console.log(`\n[${index + 1}/15] ${workflow.name}`);

  try {
    // Click Create Workflow
    console.log('   Creating workflow...');
    await frame.locator('button:has-text("Create Workflow")').click();
    await sleep(1500);

    // Click Start from Scratch
    await frame.locator('text=Start from Scratch').click();
    await sleep(6000);

    // Refresh frame reference after navigation
    frame = await getFrame(page);
    if (!frame) {
      console.log('   ERROR: Lost frame reference');
      return false;
    }

    // Rename workflow - click on name area
    console.log('   Renaming...');
    const nameArea = frame.locator('text=New Workflow').first();
    if (await nameArea.count() > 0) {
      await nameArea.click();
      await sleep(500);
      await page.keyboard.press('Control+a');
      await page.keyboard.type(workflow.name);
      await page.keyboard.press('Enter');
      await sleep(1000);
    }

    // Add trigger if it's a Contact Tag workflow
    if (workflow.trigger === 'Contact Tag' && workflow.tagFilter) {
      console.log(`   Adding trigger: ${workflow.tagFilter}...`);

      // Click Add New Trigger
      await frame.locator('text=Add New Trigger').click();
      await sleep(2000);

      // Click Contact Tag in the trigger list
      await frame.locator('text=Contact Tag').first().click();
      await sleep(2000);

      // Click Add filters to configure tag
      const addFilters = frame.locator('text=Add filters');
      if (await addFilters.count() > 0) {
        await addFilters.click();
        await sleep(1500);

        // Wait for filter UI and try to select tag
        // The UI typically shows a dropdown for selecting the tag
        const filterInput = frame.locator('input').last();
        if (await filterInput.count() > 0) {
          await filterInput.fill(workflow.tagFilter);
          await sleep(1000);
          // Click matching option
          const tagOption = frame.locator(`text="${workflow.tagFilter}"`).first();
          if (await tagOption.count() > 0) {
            await tagOption.click();
            await sleep(500);
          }
        }
      }

      // Save the trigger
      const saveTrigger = frame.locator('button:has-text("Save Trigger")');
      if (await saveTrigger.count() > 0) {
        await saveTrigger.click();
        await sleep(2000);
        console.log('   Trigger saved!');
      }
    } else if (workflow.manual) {
      console.log(`   Skipping trigger (needs manual config): ${workflow.trigger}`);
    }

    // Save the workflow
    const saveBtn = frame.locator('text=Save').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      await sleep(1500);
    }

    await screenshot(page, `wf-${index + 1}`);

    // Go back to workflows list
    console.log('   Going back to list...');
    const backBtn = frame.locator('text=Back to Workflows');
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await sleep(1000);

      // Handle unsaved changes modal if it appears
      const confirmBtn = frame.locator('button:has-text("CONFIRM")');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await sleep(2000);
      }
    }

    await sleep(3000);
    console.log('   SUCCESS!');
    return true;

  } catch (e) {
    console.log(`   ERROR: ${e.message}`);
    await screenshot(page, `error-${index + 1}`);

    // Try to recover
    try {
      await page.keyboard.press('Escape');
      await sleep(1000);
      await page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
      await sleep(5000);
    } catch (e2) {}

    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  BUILD ALL WORKFLOWS v7 (Frame Locator Method)');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  const results = { success: 0, failed: 0 };

  try {
    // Navigate to workflows
    console.log('Navigating to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
    await sleep(8000);

    let frame = await getFrame(page);
    if (!frame) {
      throw new Error('Workflow frame not found');
    }
    console.log('Frame found!\n');

    // Build each workflow
    for (let i = 0; i < WORKFLOWS.length; i++) {
      // Refresh frame reference before each workflow
      frame = await getFrame(page);
      if (!frame) {
        console.log('Lost frame reference, renavigating...');
        await page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
        await sleep(8000);
        frame = await getFrame(page);
      }

      if (frame) {
        const success = await createWorkflow(page, frame, WORKFLOWS[i], i);
        if (success) results.success++;
        else results.failed++;
      } else {
        console.log(`[${i + 1}/15] SKIPPED - no frame`);
        results.failed++;
      }
    }

    await screenshot(page, 'final-list');

  } catch (e) {
    console.error('FATAL ERROR:', e.message);
    await screenshot(page, 'fatal-error');
  }

  console.log('\n' + '='.repeat(50));
  console.log(`  RESULTS: ${results.success} success, ${results.failed} failed`);
  console.log('='.repeat(50));

  // Keep browser open briefly to verify
  await sleep(10000);
  await browser.close();
}

main().catch(console.error);
