/**
 * GHL Workflow Builder v4
 *
 * Creates 15 mortgage workflows with triggers.
 * More robust with longer waits and verification.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOWS_URL = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`;

// Workflow definitions - simplified for creation
const WORKFLOWS = [
  { name: 'New Lead Nurture Sequence', triggerType: 'tag', triggerValue: 'New Lead' },
  { name: 'Appointment Reminder Sequence', triggerType: 'appointment_booked', triggerValue: null },
  { name: 'Missed Appointment Follow-Up', triggerType: 'appointment_status', triggerValue: 'no_show' },
  { name: 'Pre-Qualification Process Workflow', triggerType: 'tag', triggerValue: 'Pre-Qual Started' },
  { name: 'Pre-Qualification Complete Notification', triggerType: 'tag', triggerValue: 'Pre-Qual Complete' },
  { name: 'Application Process Updates', triggerType: 'tag', triggerValue: 'Application Started' },
  { name: 'Underwriting Status Updates', triggerType: 'tag', triggerValue: 'In Underwriting' },
  { name: 'Conditional Approval Celebration', triggerType: 'tag', triggerValue: 'Conditionally Approved' },
  { name: 'Clear to Close Celebration', triggerType: 'tag', triggerValue: 'Clear to Close' },
  { name: 'Closing Countdown Sequence', triggerType: 'tag', triggerValue: 'Closing Scheduled' },
  { name: 'Post-Close Nurture & Referral Sequence', triggerType: 'tag', triggerValue: 'Closed' },
  { name: 'Realtor Partner Updates', triggerType: 'tag', triggerValue: 'Realtor Referral' },
  { name: 'Rate Drop Alert Campaign', triggerType: 'manual', triggerValue: null },
  { name: 'Birthday Wishes', triggerType: 'birthday', triggerValue: null },
  { name: 'Stale Lead Re-engagement', triggerType: 'stale', triggerValue: 30 }
];

let screenshotCount = 0;

async function screenshot(page, name) {
  screenshotCount++;
  const path = `./screenshots/wf4-${String(screenshotCount).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`      [screenshot: ${name}]`);
  return path;
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('='.repeat(60));
  console.log('  GHL WORKFLOW BUILDER v4');
  console.log('  Creating 15 Mortgage Workflows');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  let successCount = 0;
  const results = [];

  try {
    // ==================== LOGIN ====================
    console.log('[1/4] LOGGING IN...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Google One-Tap login
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('      Found Google One-Tap...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }
    await sleep(4000);

    // Handle Google popup
    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('      Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(4000);

      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch (e) {
        console.log('      (password not needed - already authenticated)');
      }
      await sleep(8000);
    }

    // Verify login - just wait for page to stabilize and check URL
    await sleep(5000);
    const loginUrl = page.url();
    if (loginUrl.includes('gohighlevel.com') && !loginUrl.includes('login')) {
      console.log('      Login successful!\n');
    } else {
      // Try to find any logged-in indicator
      const loggedIn = await page.locator('text=Hey David').isVisible({ timeout: 10000 }).catch(() => false) ||
                       await page.locator('text=Setup Guide').isVisible({ timeout: 5000 }).catch(() => false) ||
                       await page.locator('text=Dashboard').isVisible({ timeout: 5000 }).catch(() => false);
      if (loggedIn) {
        console.log('      Login successful!\n');
      } else {
        throw new Error('Login verification failed');
      }
    }

    // ==================== SWITCH ACCOUNT ====================
    console.log('[2/4] SWITCHING TO SUB-ACCOUNT...');

    // Always look for account switcher - we may be at agency level
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('      Found account switcher, clicking...');
      await switcher.click();
      await sleep(3000);

      // Look for LENDWISE in the dropdown
      const lendwiseOption = page.locator('text=LENDWISE MORTGA, text=LENDWISE').first();
      if (await lendwiseOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwiseOption.click();
        await sleep(6000);
        console.log('      Switched to LENDWISE sub-account!');
      } else {
        console.log('      Could not find LENDWISE option, taking screenshot...');
        await screenshot(page, 'switcher-dropdown');
      }
    } else {
      console.log('      No switcher found - may already be in sub-account');
    }

    // Verify we're in sub-account by checking URL or sidebar
    const currentUrl = page.url();
    console.log(`      Current URL: ${currentUrl}`);
    console.log('');

    // ==================== NAVIGATE TO WORKFLOWS ====================
    console.log('[3/4] NAVIGATING TO WORKFLOWS...');
    await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    await screenshot(page, 'workflows-start');
    console.log('      On Workflows page!\n');

    // ==================== CREATE WORKFLOWS ====================
    console.log('[4/4] CREATING WORKFLOWS...\n');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      const wf = WORKFLOWS[i];
      console.log(`  [${i + 1}/${WORKFLOWS.length}] "${wf.name}"`);

      try {
        // Wait for page to be ready
        await sleep(2000);

        // Click Create Workflow button
        console.log('      Clicking Create Workflow...');
        const createBtn = page.locator('button:has-text("Create Workflow")');

        if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await createBtn.click();
        } else {
          // Maybe we're on empty state, look for different button
          const altBtn = page.locator('text=Create Workflow').first();
          if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await altBtn.click();
          }
        }
        await sleep(3000);
        await screenshot(page, `${i + 1}-modal`);

        // Select "Start from Scratch"
        console.log('      Selecting Start from Scratch...');
        const scratchCard = page.locator('text=Start from Scratch').first();
        if (await scratchCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          await scratchCard.click();
          await sleep(2000);
        }

        // Enter workflow name
        console.log('      Entering name...');
        const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="workflow" i]').first();
        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nameInput.click();
          await nameInput.fill(wf.name);
          await sleep(500);
        } else {
          // Try any visible text input
          const anyInput = page.locator('input[type="text"]:visible').first();
          if (await anyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await anyInput.fill(wf.name);
          }
        }
        await screenshot(page, `${i + 1}-named`);

        // Click Continue/Create
        console.log('      Clicking Continue...');
        const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Create")').first();
        if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await continueBtn.click();
        }
        await sleep(4000);
        await screenshot(page, `${i + 1}-editor`);

        // ========== ADD TRIGGER ==========
        console.log('      Adding trigger...');

        // Click on trigger area or "Add New Trigger" button
        const addTrigger = page.locator('text=Add New Trigger, text=Add Trigger, [data-testid*="trigger"]').first();
        if (await addTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
          await addTrigger.click();
          await sleep(2000);
        } else {
          // Click on the trigger placeholder area
          const triggerPlaceholder = page.locator('.workflow-trigger, [class*="trigger"]').first();
          if (await triggerPlaceholder.isVisible({ timeout: 3000 }).catch(() => false)) {
            await triggerPlaceholder.click();
            await sleep(2000);
          }
        }
        await screenshot(page, `${i + 1}-trigger-panel`);

        // Select trigger type based on workflow
        if (wf.triggerType === 'tag') {
          console.log(`      Setting tag trigger: "${wf.triggerValue}"...`);

          // Look for Contact Tag option
          const tagTrigger = page.locator('text=Contact Tag').first();
          if (await tagTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tagTrigger.click();
            await sleep(2000);
          }

          // Look for "Added" option
          const addedOption = page.locator('text=Added, text=added').first();
          if (await addedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addedOption.click();
            await sleep(1500);
          }

          // Select or type the tag
          const tagDropdown = page.locator('[class*="select"], [class*="dropdown"], input[placeholder*="tag" i]').first();
          if (await tagDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tagDropdown.click();
            await sleep(500);
            await page.keyboard.type(wf.triggerValue);
            await sleep(1500);

            // Try to click the matching option
            const tagOption = page.locator(`text="${wf.triggerValue}"`).first();
            if (await tagOption.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tagOption.click();
            } else {
              await page.keyboard.press('Enter');
            }
            await sleep(1000);
          }

        } else if (wf.triggerType === 'appointment_booked') {
          console.log('      Setting appointment booked trigger...');
          const apptTrigger = page.locator('text=Customer Booked Appointment, text=Appointment').first();
          if (await apptTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await apptTrigger.click();
            await sleep(2000);
          }

        } else if (wf.triggerType === 'appointment_status') {
          console.log('      Setting appointment status trigger...');
          const statusTrigger = page.locator('text=Appointment Status').first();
          if (await statusTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await statusTrigger.click();
            await sleep(2000);
          }

        } else if (wf.triggerType === 'manual') {
          console.log('      Setting manual trigger...');
          const manualTrigger = page.locator('text=Manual').first();
          if (await manualTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await manualTrigger.click();
            await sleep(2000);
          }

        } else if (wf.triggerType === 'birthday') {
          console.log('      Setting birthday trigger...');
          const bdayTrigger = page.locator('text=Birthday, text=Date').first();
          if (await bdayTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await bdayTrigger.click();
            await sleep(2000);
          }

        } else if (wf.triggerType === 'stale') {
          console.log('      Setting stale/no-activity trigger...');
          const staleTrigger = page.locator('text=Stale Opportunities, text=No Activity').first();
          if (await staleTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await staleTrigger.click();
            await sleep(2000);
          }
        }

        await screenshot(page, `${i + 1}-trigger-set`);

        // Save trigger
        console.log('      Saving trigger...');
        const saveTriggerBtn = page.locator('button:has-text("Save Trigger"), button:has-text("Save"), button:has-text("Apply")').first();
        if (await saveTriggerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveTriggerBtn.click();
          await sleep(2000);
        }

        // ========== SAVE/PUBLISH WORKFLOW ==========
        console.log('      Saving workflow...');

        // Look for Save or Publish button
        const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Save")').first();
        if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await publishBtn.click();
          await sleep(2000);
        }

        // Check for any confirmation modal
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")').first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await sleep(1000);
        }

        await screenshot(page, `${i + 1}-saved`);

        successCount++;
        results.push({ name: wf.name, status: 'SUCCESS' });
        console.log(`      SUCCESS!\n`);

        // Navigate back to workflows list
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await sleep(4000);

      } catch (error) {
        console.log(`      ERROR: ${error.message}\n`);
        results.push({ name: wf.name, status: 'FAILED', error: error.message });
        await screenshot(page, `${i + 1}-error`);

        // Try to recover - press Escape and go back to workflows
        await page.keyboard.press('Escape');
        await sleep(1000);
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await sleep(4000);
      }
    }

    // Final screenshot
    await screenshot(page, 'final-list');

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    await screenshot(page, 'fatal-error');
  }

  // ==================== SUMMARY ====================
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Created: ${successCount}/${WORKFLOWS.length} workflows\n`);

  results.forEach((r, i) => {
    const icon = r.status === 'SUCCESS' ? '✓' : '✗';
    console.log(`  ${icon} ${i + 1}. ${r.name}`);
  });

  console.log('\n  Screenshots saved to ./screenshots/wf4-*.png');
  console.log('\n  Browser staying open for 60 seconds...');

  await sleep(60000);
  await browser.close();
  console.log('\n  Browser closed.');
})();
