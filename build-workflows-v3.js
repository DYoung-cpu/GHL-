/**
 * GHL Workflow Builder v3
 *
 * Uses the EXACT SAME patterns as create-sms-templates.js which successfully
 * created 93 snippets. Key patterns:
 * - Google One-Tap iframe login
 * - Auto-fill Google credentials
 * - page.locator() for text selectors
 * - Coordinate fallbacks
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Load workflow definitions
const workflowsData = JSON.parse(fs.readFileSync('./templates/workflows-templates.json', 'utf8'));
const WORKFLOWS = workflowsData.workflows;

console.log(`Loaded ${WORKFLOWS.length} workflow definitions`);

async function screenshot(page, name) {
  const screenshotPath = `./screenshots/${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return screenshotPath;
}

(async () => {
  console.log('🔧 GHL Workflow Builder v3');
  console.log('='.repeat(50));
  console.log(`Creating ${WORKFLOWS.length} workflows\n`);

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 200,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN (PROVEN PATTERN) =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try Google One-Tap first (iframe in corner)
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google One-Tap iframe...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google One-Tap button');
      }
    } else {
      const googleBtn = page.locator('text=Sign in with Google');
      if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Clicking Sign in with Google button...');
        await googleBtn.click();
      }
    }
    await page.waitForTimeout(3000);

    // Handle Google popup
    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering Google credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    const loggedIn = await page.waitForSelector('text=LENDWISE', { timeout: 30000 }).catch(() => null);
    if (!loggedIn) {
      console.log('   ⚠️ Login may not have completed, checking page...');
      await screenshot(page, 'wf-login-check');
    }
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
        console.log('   Clicked LENDWISE sub-account');
      }
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO WORKFLOWS =====
    console.log('📍 Navigating to Automation > Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(5000);
    await screenshot(page, 'wf-01-workflows-list');
    console.log('✅ On Workflows page!\n');

    // ===== CREATE WORKFLOWS =====
    let successCount = 0;
    const maxWorkflows = WORKFLOWS.length; // Build all 15 workflows

    for (let i = 0; i < Math.min(WORKFLOWS.length, maxWorkflows); i++) {
      const workflow = WORKFLOWS[i];
      console.log(`\n📍 Creating Workflow ${i + 1}/${Math.min(WORKFLOWS.length, maxWorkflows)}: "${workflow.name}"`);

      try {
        // Wait for page to settle
        await page.waitForTimeout(1500);

        // Click "Create Workflow" button
        console.log('   Clicking Create Workflow button...');
        const createBtn = page.locator('button:has-text("Create Workflow")');
        if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await createBtn.click();
        } else {
          // Try coordinate fallback (top right area)
          console.log('   Using coordinate click...');
          await page.mouse.click(1200, 140);
        }
        await page.waitForTimeout(2000);
        await screenshot(page, `wf-${i + 1}-create-modal`);

        // Select "Start from Scratch"
        console.log('   Selecting Start from Scratch...');
        const scratchOption = page.locator('text=Start from Scratch');
        if (await scratchOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await scratchOption.click();
        } else {
          // Try "Blank" option
          const blankOption = page.locator('text=Blank');
          if (await blankOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await blankOption.click();
          }
        }
        await page.waitForTimeout(2000);
        await screenshot(page, `wf-${i + 1}-scratch-selected`);

        // Enter workflow name
        console.log(`   Entering name: ${workflow.name}`);
        const nameInputSelectors = [
          'input[placeholder*="name" i]',
          'input[placeholder*="workflow" i]',
          'input[name="name"]',
          'input[type="text"]'
        ];

        for (const selector of nameInputSelectors) {
          const nameInput = page.locator(selector).first();
          if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nameInput.click();
            await nameInput.fill(workflow.name);
            console.log(`   ✓ Entered name`);
            break;
          }
        }
        await page.waitForTimeout(500);

        // Click Continue/Create
        console.log('   Clicking Continue...');
        const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Create"), button:has-text("Next")');
        if (await continueBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await continueBtn.first().click();
        }
        await page.waitForTimeout(3000);
        await screenshot(page, `wf-${i + 1}-workflow-editor`);

        // ===== ADD TRIGGER =====
        console.log('   Adding trigger...');
        const addTriggerBtn = page.locator('text=Add New Trigger, text=Add Trigger');
        if (await addTriggerBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await addTriggerBtn.first().click();
        } else {
          // Try clicking the trigger area directly
          const triggerArea = page.locator('.trigger-placeholder, [data-testid="add-trigger"]');
          if (await triggerArea.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await triggerArea.first().click();
          }
        }
        await page.waitForTimeout(2000);
        await screenshot(page, `wf-${i + 1}-trigger-panel`);

        // Handle different trigger types
        const triggerType = workflow.trigger.type;
        console.log(`   Selecting trigger type: ${triggerType}...`);

        if (triggerType === 'tag_added') {
          // Click "Contact Tag" in the trigger list
          const contactTagOption = page.locator('text=Contact Tag');
          if (await contactTagOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await contactTagOption.click();
            await page.waitForTimeout(1500);
          }

          // Look for "tag is added" option
          const tagAddedOption = page.locator('text=tag is added, text=Tag Added');
          if (await tagAddedOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await tagAddedOption.first().click();
            await page.waitForTimeout(1000);
          }

          // Select the specific tag
          const tagDropdown = page.locator('[data-testid="tag-select"], input[placeholder*="tag" i], .tag-select');
          if (await tagDropdown.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await tagDropdown.first().click();
            await page.waitForTimeout(500);
            await page.keyboard.type(workflow.trigger.tag);
            await page.waitForTimeout(1500);

            // Click matching tag or create new
            const tagOption = page.locator(`text="${workflow.trigger.tag}"`);
            if (await tagOption.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tagOption.click();
            } else {
              await page.keyboard.press('Enter');
            }
          }
        } else if (triggerType === 'appointment_booked') {
          // Click "Appointment" trigger
          const apptOption = page.locator('text=Appointment');
          if (await apptOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await apptOption.first().click();
            await page.waitForTimeout(1500);
          }
          console.log(`   Note: Appointment trigger requires manual calendar selection`);
        } else if (triggerType === 'appointment_status_changed') {
          // Click "Appointment Status" trigger
          const statusOption = page.locator('text=Appointment Status, text=Appointment');
          if (await statusOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await statusOption.first().click();
            await page.waitForTimeout(1500);
          }
          console.log(`   Note: Appointment status trigger configured for: ${workflow.trigger.status}`);
        } else if (triggerType === 'birthday') {
          // Click "Birthday Reminder" or "Date" trigger
          const bdayOption = page.locator('text=Birthday, text=Date');
          if (await bdayOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await bdayOption.first().click();
            await page.waitForTimeout(1500);
          }
          console.log(`   Note: Birthday trigger configured`);
        } else if (triggerType === 'no_activity') {
          // Click "Stale Opportunities" or similar
          const staleOption = page.locator('text=Stale, text=No Activity');
          if (await staleOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await staleOption.first().click();
            await page.waitForTimeout(1500);
          }
          console.log(`   Note: No activity trigger - ${workflow.trigger.days} days`);
        } else if (triggerType === 'manual_trigger') {
          console.log(`   Note: Manual trigger - will need to be triggered manually`);
        } else {
          console.log(`   Warning: Unknown trigger type: ${triggerType}`);
        }

        await page.waitForTimeout(1000);

        // Save trigger
        const saveTriggerBtn = page.locator('button:has-text("Save Trigger"), button:has-text("Save"), button:has-text("Add")');
        if (await saveTriggerBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveTriggerBtn.first().click();
        }

        await page.waitForTimeout(2000);
        await screenshot(page, `wf-${i + 1}-trigger-saved`);

        // ===== ADD WORKFLOW STEPS =====
        console.log(`   Adding ${workflow.steps.length} workflow steps...`);

        for (let s = 0; s < workflow.steps.length; s++) {  // Process all steps
          const step = workflow.steps[s];
          console.log(`   Step ${s + 1}: ${step.action} (${step.delay})`);

          // Click + or Add Action
          const addActionBtn = page.locator('[data-testid="add-action"], text=Add Action');
          const plusBtn = page.locator('button svg[data-icon="plus"]').first();

          if (await addActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await addActionBtn.first().click();
          } else if (await plusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await plusBtn.click();
          }
          await page.waitForTimeout(1500);

          // Add the appropriate action
          switch (step.action) {
            case 'send_sms':
              await addSmsAction(page, step);
              break;
            case 'send_email':
              await addEmailAction(page, step);
              break;
            case 'add_tag':
              await addTagAction(page, step);
              break;
            case 'internal_notification':
              await addInternalNotification(page, step);
              break;
            case 'update_pipeline_stage':
              await addPipelineStageAction(page, step);
              break;
            case 'conditional':
              console.log(`      Note: Conditional action - will need manual configuration`);
              break;
            case 'send_sms_to_referrer':
            case 'send_email_to_referrer':
              console.log(`      Note: Referrer action (${step.action}) - requires manual setup`);
              break;
            default:
              console.log(`      Skipping action: ${step.action}`);
          }

          await page.waitForTimeout(1500);
        }

        await screenshot(page, `wf-${i + 1}-steps-added`);

        // ===== SAVE/PUBLISH WORKFLOW =====
        console.log('   Saving workflow...');
        const saveBtn = page.locator('button:has-text("Publish"), button:has-text("Save")');
        if (await saveBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.first().click();
        }
        await page.waitForTimeout(2000);
        await screenshot(page, `wf-${i + 1}-saved`);

        successCount++;
        console.log(`   ✅ Workflow "${workflow.name}" created!\n`);

        // Navigate back to workflows list for next one
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
          waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(3000);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await screenshot(page, `wf-error-${i + 1}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    await screenshot(page, 'wf-final');

    console.log('='.repeat(50));
    console.log(`✅ Created ${successCount}/${Math.min(WORKFLOWS.length, maxWorkflows)} workflows`);
    console.log('Browser staying open for 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    await screenshot(page, 'wf-fatal-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();

// Helper function: Add SMS action
async function addSmsAction(page, step) {
  console.log(`      Adding SMS action...`);

  const smsOption = page.locator('text=Send SMS');
  if (await smsOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await smsOption.first().click();
    await page.waitForTimeout(1500);

    // Use template option
    const useTemplateBtn = page.locator('text=Use Template, button:has-text("Template")');
    if (await useTemplateBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await useTemplateBtn.first().click();
      await page.waitForTimeout(1000);

      // Search for template (just use a generic SMS template)
      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchInput.fill('Lead');  // Search for Lead templates
        await page.waitForTimeout(1500);

        // Click first matching result
        await page.keyboard.press('Enter');
      }
    }

    // Save action
    const saveActionBtn = page.locator('button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    if (await saveActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveActionBtn.first().click();
    }
  }
}

// Helper function: Add Email action
async function addEmailAction(page, step) {
  console.log(`      Adding Email action...`);

  const emailOption = page.locator('text=Send Email');
  if (await emailOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailOption.first().click();
    await page.waitForTimeout(1500);

    const useTemplateBtn = page.locator('text=Use Template, button:has-text("Template")');
    if (await useTemplateBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await useTemplateBtn.first().click();
      await page.waitForTimeout(1000);

      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchInput.fill('Lead');
        await page.waitForTimeout(1500);
        await page.keyboard.press('Enter');
      }
    }

    const saveActionBtn = page.locator('button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    if (await saveActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveActionBtn.first().click();
    }
  }
}

// Helper function: Add Tag action
async function addTagAction(page, step) {
  console.log(`      Adding Tag action: ${step.tag}`);

  const tagOption = page.locator('text=Add Tag');
  if (await tagOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await tagOption.first().click();
    await page.waitForTimeout(1500);

    const tagInput = page.locator('[data-testid="tag-select"], input[placeholder*="tag" i]');
    if (await tagInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagInput.first().click();
      await page.keyboard.type(step.tag);
      await page.waitForTimeout(1000);

      const tagOption2 = page.locator(`text="${step.tag}"`);
      if (await tagOption2.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tagOption2.click();
      } else {
        await page.keyboard.press('Enter');
      }
    }

    const saveActionBtn = page.locator('button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    if (await saveActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveActionBtn.first().click();
    }
  }
}

// Helper function: Add Internal Notification action
async function addInternalNotification(page, step) {
  console.log(`      Adding Internal Notification action...`);

  const notifyOption = page.locator('text=Internal Notification, text=Send Notification');
  if (await notifyOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await notifyOption.first().click();
    await page.waitForTimeout(1500);

    // Try to fill notification message
    const messageInput = page.locator('textarea, input[type="text"]').first();
    if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messageInput.fill(step.message || 'Internal notification');
    }

    const saveActionBtn = page.locator('button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    if (await saveActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveActionBtn.first().click();
    }
  } else {
    console.log(`      Note: Internal Notification action not found - may need manual setup`);
  }
}

// Helper function: Add Pipeline Stage action
async function addPipelineStageAction(page, step) {
  console.log(`      Adding Pipeline Stage action: ${step.stage}`);

  const stageOption = page.locator('text=Update Pipeline, text=Change Stage, text=Pipeline');
  if (await stageOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await stageOption.first().click();
    await page.waitForTimeout(1500);

    // Try to select the stage
    const stageDropdown = page.locator('select, [data-testid="stage-select"], input[placeholder*="stage" i]');
    if (await stageDropdown.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await stageDropdown.first().click();
      await page.waitForTimeout(500);
      await page.keyboard.type(step.stage);
      await page.waitForTimeout(1000);

      const stageOption2 = page.locator(`text="${step.stage}"`);
      if (await stageOption2.isVisible({ timeout: 1000 }).catch(() => false)) {
        await stageOption2.click();
      } else {
        await page.keyboard.press('Enter');
      }
    }

    const saveActionBtn = page.locator('button:has-text("Save Action"), button:has-text("Save"), button:has-text("Add")');
    if (await saveActionBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveActionBtn.first().click();
    }
  } else {
    console.log(`      Note: Pipeline Stage action not found - may need manual setup`);
  }
}
