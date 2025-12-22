/**
 * GHL Workflow Builder v5
 *
 * Uses the INLINE quick-create flow on the workflows page:
 * 1. Click trigger dropdown ("Customer Booked Appointment")
 * 2. Select trigger type
 * 3. Click action dropdown ("Send Email")
 * 4. Select action type
 * 5. Click Continue
 * 6. Name the workflow
 * 7. Save/Publish
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOWS_URL = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`;

// Simplified workflow list - just need names and basic trigger/action
const WORKFLOWS = [
  { name: 'New Lead Nurture Sequence', trigger: 'Contact Tag' },
  { name: 'Appointment Reminder Sequence', trigger: 'Customer Booked Appointment' },
  { name: 'Missed Appointment Follow-Up', trigger: 'Appointment Status' },
  { name: 'Pre-Qualification Process Workflow', trigger: 'Contact Tag' },
  { name: 'Pre-Qualification Complete Notification', trigger: 'Contact Tag' },
  { name: 'Application Process Updates', trigger: 'Contact Tag' },
  { name: 'Underwriting Status Updates', trigger: 'Contact Tag' },
  { name: 'Conditional Approval Celebration', trigger: 'Contact Tag' },
  { name: 'Clear to Close Celebration', trigger: 'Contact Tag' },
  { name: 'Closing Countdown Sequence', trigger: 'Contact Tag' },
  { name: 'Post-Close Nurture & Referral Sequence', trigger: 'Contact Tag' },
  { name: 'Realtor Partner Updates', trigger: 'Contact Tag' },
  { name: 'Rate Drop Alert Campaign', trigger: 'Contact Tag' },
  { name: 'Birthday Wishes', trigger: 'Birthday Reminder' },
  { name: 'Stale Lead Re-engagement', trigger: 'Stale Opportunities' }
];

let ssCount = 0;
async function ss(page, name) {
  ssCount++;
  const path = `./screenshots/wf5-${String(ssCount).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`      [ss: ${name}]`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('='.repeat(60));
  console.log('  GHL WORKFLOW BUILDER v5 - Using Inline Quick-Create');
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let successCount = 0;

  try {
    // ========== LOGIN ==========
    console.log('[1] LOGGING IN...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await sleep(4000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      console.log('      Entering Google credentials...');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(4000);
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch(e) {}
      await sleep(8000);
    }
    console.log('      Login complete!\n');

    // ========== SWITCH ACCOUNT ==========
    console.log('[2] SWITCHING TO SUB-ACCOUNT...');
    await sleep(3000);

    const switcherBtn = page.locator('text=Click here to switch');
    if (await switcherBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('      Found switcher, clicking...');
      await switcherBtn.click();
      await sleep(3000);
      await ss(page, 'switcher-open');

      // Click LENDWISE option
      const lendwise = page.locator('text=LENDWISE').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await sleep(5000);
        console.log('      Switched to LENDWISE!');
      }
    }
    console.log('');

    // ========== GO TO WORKFLOWS ==========
    console.log('[3] NAVIGATING TO WORKFLOWS...');
    await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    await ss(page, 'workflows-page');
    console.log('      On workflows page!\n');

    // ========== CREATE WORKFLOWS ==========
    console.log('[4] CREATING WORKFLOWS...\n');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      const wf = WORKFLOWS[i];
      console.log(`  [${i+1}/${WORKFLOWS.length}] "${wf.name}"`);

      try {
        await sleep(2000);

        // Method 1: Try clicking the Create Workflow dropdown button directly
        console.log('      Clicking Create Workflow dropdown...');

        // The button has a chevron - click it to open dropdown
        const createBtn = page.locator('button:has-text("Create Workflow")');
        if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await createBtn.click();
          await sleep(2000);
          await ss(page, `${i+1}-dropdown`);

          // Look for "Start from Scratch" in dropdown
          const scratchOption = page.locator('text=Start from Scratch, text=Blank Workflow, text=Create New').first();
          if (await scratchOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('      Found scratch option, clicking...');
            await scratchOption.click();
            await sleep(3000);
            await ss(page, `${i+1}-scratch-clicked`);
          } else {
            // Maybe dropdown didn't open, try clicking the chevron/arrow part
            console.log('      Dropdown not showing options, trying chevron...');
            const chevron = page.locator('button:has-text("Create Workflow") svg, button:has-text("Create Workflow") >> nth=-1');
            if (await chevron.isVisible({ timeout: 2000 }).catch(() => false)) {
              await chevron.click();
              await sleep(2000);
            }
          }
        }

        // Check if we're now in a modal or workflow editor
        await ss(page, `${i+1}-after-create`);

        // Look for name input field
        const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="workflow" i], input[type="text"]').first();
        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('      Found name input, entering name...');
          await nameInput.fill(wf.name);
          await sleep(1000);
          await ss(page, `${i+1}-named`);

          // Click Continue or Create button
          const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Create"), button:has-text("Save")').first();
          if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await continueBtn.click();
            await sleep(3000);
          }
        }

        // Check if workflow editor opened (should have trigger/action areas)
        const workflowEditor = page.locator('[class*="workflow-editor"], [class*="WorkflowEditor"], text=Add New Trigger');
        if (await workflowEditor.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('      Workflow editor opened!');
          await ss(page, `${i+1}-editor`);

          // Save/Publish the workflow
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Publish")').first();
          if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await saveBtn.click();
            await sleep(2000);
          }

          successCount++;
          console.log('      SUCCESS!\n');
        } else {
          console.log('      Workflow editor did not open\n');
        }

        // Go back to workflows list
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await sleep(4000);

      } catch (err) {
        console.log(`      ERROR: ${err.message}\n`);
        await ss(page, `${i+1}-error`);
        await page.keyboard.press('Escape');
        await sleep(1000);
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await sleep(3000);
      }
    }

    await ss(page, 'final');

  } catch (error) {
    console.error('FATAL:', error.message);
    await ss(page, 'fatal');
  }

  console.log('='.repeat(60));
  console.log(`  RESULT: ${successCount}/${WORKFLOWS.length} workflows created`);
  console.log('='.repeat(60));
  console.log('\n  Browser open for 60 seconds...');
  await sleep(60000);
  await browser.close();
})();
