const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Workflow definitions - starting with New Lead Nurture
const workflows = [
  {
    name: 'New Lead Nurture Sequence',
    trigger: { type: 'tag_added', tag: 'New Lead' },
    steps: [
      { type: 'sms', delay: '0', template: 'Lead Response 1' },
      { type: 'wait', delay: '5 minutes' },
      { type: 'email', template: 'Lead Welcome Email' },
      { type: 'wait', delay: '1 day' },
      { type: 'sms', template: 'Lead Follow-up 2' },
      { type: 'wait', delay: '1 day' },
      { type: 'email', template: 'Lead Follow-up 1' },
      { type: 'wait', delay: '1 day' },
      { type: 'sms', template: 'Lead Follow-up 3' },
      { type: 'wait', delay: '2 days' },
      { type: 'email', template: 'Lead Follow-up 2' },
      { type: 'wait', delay: '2 days' },
      { type: 'sms', template: 'Lead Follow-up 4' },
      { type: 'wait', delay: '3 days' },
      { type: 'email', template: 'Lead Follow-up 3' },
      { type: 'wait', delay: '4 days' },
      { type: 'sms', template: 'Lead Follow-up 5' },
      { type: 'add_tag', tag: 'Long-Term Nurture' }
    ]
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createWorkflow(page, workflow) {
  console.log(`\n=== Creating workflow: ${workflow.name} ===`);

  // Navigate to Automation > Workflows
  console.log('Navigating to Workflows...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(3000);

  // Take screenshot to see current state
  await page.screenshot({ path: 'screenshots/workflows-page.png' });
  console.log('Screenshot saved: workflows-page.png');

  // Click "Create Workflow" button
  console.log('Looking for Create Workflow button...');

  // Try different selectors for the create button
  const createSelectors = [
    'button:has-text("Create Workflow")',
    'button:has-text("Create")',
    '[data-testid="create-workflow"]',
    'button.hl-btn-primary:has-text("Create")',
    'text=Create Workflow'
  ];

  let clicked = false;
  for (const selector of createSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        console.log(`Clicked: ${selector}`);
        clicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!clicked) {
    // Try clicking by coordinates if no button found
    console.log('Trying coordinate click for Create button...');
    await page.mouse.click(1200, 150);
  }

  await sleep(2000);
  await page.screenshot({ path: 'screenshots/after-create-click.png' });

  // Select "Start from Scratch" option
  console.log('Looking for Start from Scratch option...');
  const scratchSelectors = [
    'text=Start from Scratch',
    ':has-text("Start from Scratch")',
    'div:has-text("Start from Scratch")',
    '[data-testid="start-from-scratch"]'
  ];

  for (const selector of scratchSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        console.log(`Clicked: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }

  await sleep(2000);
  await page.screenshot({ path: 'screenshots/after-scratch-select.png' });

  // Name the workflow
  console.log('Naming the workflow...');
  const nameInput = await page.$('input[placeholder*="name" i], input[placeholder*="workflow" i], input.workflow-name');
  if (nameInput) {
    await nameInput.fill(workflow.name);
    console.log(`Named workflow: ${workflow.name}`);
  }

  await sleep(1000);

  // Click Continue or Create
  const continueBtn = await page.$('button:has-text("Continue"), button:has-text("Create"), button:has-text("Save")');
  if (continueBtn) {
    await continueBtn.click();
    console.log('Clicked continue/create button');
  }

  await sleep(3000);
  await page.screenshot({ path: 'screenshots/workflow-builder.png' });

  // Now we're in the workflow builder
  // Add Trigger
  console.log('Adding trigger...');

  // Click on "Add New Trigger" or the trigger area
  const triggerSelectors = [
    'text=Add New Trigger',
    'text=Add Trigger',
    '[data-testid="add-trigger"]',
    '.trigger-placeholder',
    'text=Click to add trigger'
  ];

  for (const selector of triggerSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        console.log(`Clicked trigger: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }

  await sleep(2000);
  await page.screenshot({ path: 'screenshots/trigger-selection.png' });

  // Select "Contact Tag" trigger
  if (workflow.trigger.type === 'tag_added') {
    console.log('Selecting Tag trigger...');
    const tagTriggerSelectors = [
      'text=Contact Tag',
      'text=Tag Added',
      ':has-text("Contact Tag")',
      'div:has-text("Tag")'
    ];

    for (const selector of tagTriggerSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.click();
          console.log(`Selected: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    await sleep(2000);
    await page.screenshot({ path: 'screenshots/tag-trigger-config.png' });

    // Configure tag filter
    console.log(`Setting tag filter: ${workflow.trigger.tag}`);

    // Look for tag dropdown/input
    const tagInput = await page.$('input[placeholder*="tag" i], select.tag-select, [data-testid="tag-select"]');
    if (tagInput) {
      await tagInput.click();
      await sleep(500);

      // Type to search for tag
      await page.keyboard.type(workflow.trigger.tag);
      await sleep(1000);

      // Click the matching option
      const tagOption = await page.$(`text="${workflow.trigger.tag}"`);
      if (tagOption) {
        await tagOption.click();
      }
    }

    await sleep(1000);

    // Save trigger
    const saveTriggerBtn = await page.$('button:has-text("Save"), button:has-text("Add"), button:has-text("Done")');
    if (saveTriggerBtn) {
      await saveTriggerBtn.click();
    }
  }

  await sleep(2000);
  await page.screenshot({ path: 'screenshots/trigger-saved.png' });

  // Add workflow steps
  console.log('Adding workflow steps...');

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    console.log(`Adding step ${i + 1}: ${step.type}`);

    // Click "+" to add action
    const addActionBtn = await page.$('button:has-text("+"), .add-action-btn, [data-testid="add-action"], text=Add Action');
    if (addActionBtn) {
      await addActionBtn.click();
      await sleep(1500);
    }

    if (step.type === 'sms') {
      // Select Send SMS action
      const smsAction = await page.$('text=Send SMS, text=SMS, :has-text("Send SMS")');
      if (smsAction) {
        await smsAction.click();
        await sleep(1500);

        // Configure SMS - use template
        const templateBtn = await page.$('text=Use Template, text=Template, button:has-text("Template")');
        if (templateBtn) {
          await templateBtn.click();
          await sleep(1000);

          // Search for template
          const searchInput = await page.$('input[placeholder*="search" i]');
          if (searchInput) {
            await searchInput.fill(step.template);
            await sleep(1000);

            // Click matching template
            const templateOption = await page.$(`text="${step.template}"`);
            if (templateOption) {
              await templateOption.click();
            }
          }
        }

        // Save action
        const saveBtn = await page.$('button:has-text("Save"), button:has-text("Add")');
        if (saveBtn) {
          await saveBtn.click();
        }
      }
    } else if (step.type === 'email') {
      // Select Send Email action
      const emailAction = await page.$('text=Send Email, text=Email, :has-text("Send Email")');
      if (emailAction) {
        await emailAction.click();
        await sleep(1500);

        // Configure email - use template
        const templateBtn = await page.$('text=Use Template, text=Template, button:has-text("Template")');
        if (templateBtn) {
          await templateBtn.click();
          await sleep(1000);

          const searchInput = await page.$('input[placeholder*="search" i]');
          if (searchInput) {
            await searchInput.fill(step.template);
            await sleep(1000);

            const templateOption = await page.$(`text="${step.template}"`);
            if (templateOption) {
              await templateOption.click();
            }
          }
        }

        const saveBtn = await page.$('button:has-text("Save"), button:has-text("Add")');
        if (saveBtn) {
          await saveBtn.click();
        }
      }
    } else if (step.type === 'wait') {
      // Add Wait action
      const waitAction = await page.$('text=Wait, text=Delay, :has-text("Wait")');
      if (waitAction) {
        await waitAction.click();
        await sleep(1500);

        // Parse delay
        const delayParts = step.delay.split(' ');
        const value = delayParts[0];
        const unit = delayParts[1] || 'minutes';

        // Enter delay value
        const delayInput = await page.$('input[type="number"], input.delay-value');
        if (delayInput) {
          await delayInput.fill(value);
        }

        // Select unit
        const unitSelect = await page.$(`select option:has-text("${unit}"), text=${unit}`);
        if (unitSelect) {
          await unitSelect.click();
        }

        const saveBtn = await page.$('button:has-text("Save"), button:has-text("Add")');
        if (saveBtn) {
          await saveBtn.click();
        }
      }
    } else if (step.type === 'add_tag') {
      // Add tag action
      const tagAction = await page.$('text=Add Tag, text=Tag, :has-text("Add Tag")');
      if (tagAction) {
        await tagAction.click();
        await sleep(1500);

        const tagInput = await page.$('input[placeholder*="tag" i]');
        if (tagInput) {
          await tagInput.click();
          await page.keyboard.type(step.tag);
          await sleep(500);

          const tagOption = await page.$(`text="${step.tag}"`);
          if (tagOption) {
            await tagOption.click();
          }
        }

        const saveBtn = await page.$('button:has-text("Save"), button:has-text("Add")');
        if (saveBtn) {
          await saveBtn.click();
        }
      }
    }

    await sleep(1500);
  }

  await page.screenshot({ path: 'screenshots/workflow-complete.png' });

  // Save and publish workflow
  console.log('Saving workflow...');
  const publishBtn = await page.$('button:has-text("Publish"), button:has-text("Save"), button:has-text("Activate")');
  if (publishBtn) {
    await publishBtn.click();
    await sleep(2000);
  }

  await page.screenshot({ path: 'screenshots/workflow-published.png' });
  console.log(`Workflow "${workflow.name}" created!`);
}

async function main() {
  console.log('Starting GHL Workflow Builder...');
  console.log('Location ID:', LOCATION_ID);

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: {
      cookies: [],
      origins: []
    }
  });

  const page = await context.newPage();

  try {
    // Navigate to GHL and login
    console.log('\n=== Step 1: Login to GHL ===');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(2000);

    // Check if already logged in
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('oauth')) {
      console.log('Need to login - clicking Google OAuth...');

      // Click Google login button
      const googleBtn = await page.$('button:has-text("Google"), [data-provider="google"], img[alt*="Google"]');
      if (googleBtn) {
        await googleBtn.click();
        console.log('Clicked Google login button');

        // Wait for user to complete login
        console.log('\n>>> Please complete Google login in the browser <<<');
        console.log('>>> Waiting up to 120 seconds for login... <<<\n');

        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 120000 }).catch(() => {});
        await page.waitForURL('**/location/**', { timeout: 30000 }).catch(() => {});
      }
    }

    await sleep(3000);

    // Check if we need to select sub-account
    console.log('\n=== Step 2: Select Sub-Account ===');
    const switchBtn = await page.$('text=LENDWISE, text=Switch, [data-testid="account-switcher"]');
    if (switchBtn) {
      // Already in account or need to switch
      console.log('Looking for account switcher...');
    }

    // Navigate directly to workflows
    console.log('\n=== Step 3: Navigate to Workflows ===');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await sleep(5000);

    await page.screenshot({ path: 'screenshots/workflows-initial.png' });
    console.log('Screenshot saved: workflows-initial.png');

    // Get page HTML for debugging
    const html = await page.content();
    require('fs').writeFileSync('debug-workflows-page.html', html);
    console.log('Saved page HTML to debug-workflows-page.html');

    // Create each workflow
    for (const workflow of workflows) {
      await createWorkflow(page, workflow);
    }

    console.log('\n=== All workflows created! ===');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/error-workflow.png' });
  }

  // Keep browser open for manual verification
  console.log('\nBrowser staying open for verification. Press Ctrl+C to close.');
  await sleep(300000); // 5 minutes

  await browser.close();
}

main().catch(console.error);
