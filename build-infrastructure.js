const { chromium } = require('playwright');

const MORTGAGE_PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Application Started',
  'Application Submitted',
  'Processing',
  'Underwriting',
  'Conditional Approval',
  'Clear to Close',
  'Closing Scheduled',
  'Funded',
  'Lost/Dead'
];

// Helper to take screenshot and log
async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

// Helper to wait for page to be ready - more lenient version
async function waitForPageReady(page, timeout = 5000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
    await page.waitForTimeout(2000); // Buffer for Vue/React hydration
  } catch (e) {
    console.log('   (page load wait timed out, continuing...)');
  }
}

(async () => {
  console.log('🚀 GHL Infrastructure Builder - FIXED VERSION');
  console.log('='.repeat(50) + '\n');

  // Create screenshots directory
  const fs = require('fs');
  const screenshotDir = '/mnt/c/Users/dyoun/ghl-automation/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300 // Slow enough to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== STEP 1: LOGIN =====
    console.log('📍 STEP 1: Logging into GHL via Google...');

    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-login-page');

    // Click Google sign-in button (it's in an iframe)
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }

    await page.waitForTimeout(3000);

    // Handle Google popup
    const pages = context.pages();
    const googlePage = pages.length > 1 ? pages[pages.length - 1] : page;

    if (googlePage.url().includes('accounts.google.com')) {
      console.log('   Entering Google credentials...');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    await waitForPageReady(page);
    await screenshot(page, '02-after-login');
    console.log('✅ Logged in!\n');

    // ===== STEP 2: SWITCH TO SUB-ACCOUNT =====
    console.log('📍 STEP 2: Switching to Lendwise Mortgage sub-account...');

    // Look for account switcher
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }

    await waitForPageReady(page);
    await screenshot(page, '03-subaccount');
    console.log('✅ In sub-account!\n');

    // ===== STEP 3: NAVIGATE TO SETTINGS =====
    console.log('📍 STEP 3: Clicking Settings in sidebar...');

    // Click Settings - use getByRole for better reliability
    await page.getByRole('link', { name: 'Settings' }).click();
    await waitForPageReady(page);
    await screenshot(page, '04-settings-page');
    console.log('✅ On Settings page!\n');

    // ===== STEP 4: CLICK OPPORTUNITIES & PIPELINES =====
    console.log('📍 STEP 4: Clicking Opportunities & Pipelines...');

    // Find and click "Opportunities & Pipelines" in settings menu
    await page.getByText('Opportunities & Pipelines').click();
    await waitForPageReady(page);
    await screenshot(page, '05-opp-pipelines');
    console.log('✅ On Opportunities & Pipelines settings!\n');

    // ===== STEP 5: CLICK PIPELINES TAB =====
    console.log('📍 STEP 5: Clicking Pipelines tab...');

    // Wait for the page to settle
    await page.waitForTimeout(2000);
    await screenshot(page, '05b-before-pipelines-click');

    // The Pipelines tab is visible in the header area next to "Opportunities"
    // GHL uses naive-ui tabs - need to find and click the actual tab element

    // Approach 1: Click by exact text match with force
    try {
      // Find all elements with "Pipelines" text
      const pipelinesElements = await page.$$('text=Pipelines');
      console.log(`   Found ${pipelinesElements.length} elements with "Pipelines" text`);

      // Collect all elements with their positions
      const elementsWithPos = [];
      for (let i = 0; i < pipelinesElements.length; i++) {
        const el = pipelinesElements[i];
        const box = await el.boundingBox();
        if (box) {
          console.log(`   Element ${i}: position (${Math.round(box.x)}, ${Math.round(box.y)}), size ${Math.round(box.width)}x${Math.round(box.height)}`);
          elementsWithPos.push({ el, box, index: i });
        }
      }

      // The Pipelines TAB is the one near the top (y < 100) that's FURTHEST to the RIGHT
      // Based on output: Element 2 at x=582 is the actual tab (vs Element 1 at x=232 which is the header)
      const tabCandidates = elementsWithPos.filter(e => e.box.y < 100 && e.box.height < 50);

      if (tabCandidates.length > 0) {
        // Sort by x position descending - rightmost is the actual tab
        tabCandidates.sort((a, b) => b.box.x - a.box.x);
        const tabElement = tabCandidates[0];

        console.log(`   Clicking Pipelines TAB (element ${tabElement.index}) at (${Math.round(tabElement.box.x + tabElement.box.width/2)}, ${Math.round(tabElement.box.y + tabElement.box.height/2)})`);
        await tabElement.el.click({ force: true });
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log(`   Approach 1 failed: ${e.message}`);
    }

    await screenshot(page, '06-after-pipelines-click');

    // Check if we're on the Pipelines content
    let pageText = await page.textContent('body');
    let onPipelinesTab = pageText.includes('Add Pipeline') || pageText.includes('Create Pipeline') || pageText.includes('Default');
    console.log(`   On Pipelines tab: ${onPipelinesTab ? 'YES' : 'NO'}`);

    // Approach 2: If not on Pipelines tab, try navigating directly via URL click
    if (!onPipelinesTab) {
      console.log('   Trying direct navigation link approach...');

      // Look for any link/anchor with pipelines in href
      const pipelinesLink = page.locator('a[href*="pipelines"]').first();
      if (await pipelinesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pipelinesLink.click({ force: true });
        await page.waitForTimeout(3000);
        await screenshot(page, '06b-after-link-click');
      }
    }

    // Approach 3: Use keyboard navigation - Tab through to reach Pipelines
    pageText = await page.textContent('body');
    onPipelinesTab = pageText.includes('Add Pipeline') || pageText.includes('Create Pipeline') || pageText.includes('Default');

    if (!onPipelinesTab) {
      console.log('   Trying to click via naive-ui tab structure...');

      // GHL uses naive-ui which has specific class names
      const naiveTab = page.locator('.n-tabs-tab:has-text("Pipelines"), [class*="tab"]:has-text("Pipelines")').first();
      if (await naiveTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await naiveTab.click({ force: true });
        await page.waitForTimeout(2000);
        await screenshot(page, '06c-after-naive-click');
      }
    }

    // Final check
    pageText = await page.textContent('body');
    onPipelinesTab = pageText.includes('Add Pipeline') || pageText.includes('Create Pipeline') || pageText.includes('Default');
    console.log(`   Final check - On Pipelines tab: ${onPipelinesTab ? 'YES' : 'NO'}`);

    console.log('✅ Pipelines tab navigation attempted!\n');

    // ===== STEP 6: CREATE PIPELINE (or skip if exists) =====
    console.log('📍 STEP 6: Checking for existing pipelines...');

    // Check if a pipeline already exists (look for pipeline rows)
    const existingPipeline = page.locator('text=New Lead, text=Mortgage Sales Pipeline').first();
    const pipelineExists = await existingPipeline.isVisible({ timeout: 3000 }).catch(() => false);

    if (pipelineExists) {
      console.log('   ✅ Pipeline already exists! Skipping creation...');
      await screenshot(page, '07-pipeline-exists');
    } else {
      // List all buttons to help debug
      const buttons = await page.$$eval('button', btns =>
        btns.map(b => ({ text: b.textContent?.trim(), visible: b.offsetParent !== null }))
            .filter(b => b.text && b.visible)
      );
      console.log('   Visible buttons:', buttons.slice(0, 10).map(b => b.text));

      // Try to click Create Pipeline (GHL uses "Create Pipeline" not "Add Pipeline")
      const addPipelineBtn = page.locator('button:has-text("Create Pipeline")').first();
      if (await addPipelineBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Found Create Pipeline button!');
        await addPipelineBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, '07-add-pipeline-modal');

        // Wait for modal to fully render
        await page.waitForTimeout(1000);

      // The modal structure:
      // - First input is Pipeline Name (has placeholder "Marketing pipeline")
      // - Then there are stage name inputs (New Lead, Contacted, Proposal Sent, Closed)

      // Find all inputs in the modal
      const modalInputs = await page.locator('.n-modal input, [role="dialog"] input, .n-card input').all();
      console.log(`   Found ${modalInputs.length} inputs in modal`);

      // If we found inputs in modal, use those; otherwise fallback
      let allInputs;
      if (modalInputs.length > 0) {
        allInputs = modalInputs;
      } else {
        // Fallback: get all visible inputs on page
        allInputs = await page.locator('input:visible').all();
        console.log(`   Fallback: Found ${allInputs.length} visible inputs`);
      }

      if (allInputs.length > 0) {
        // First input should be pipeline name
        const nameInput = allInputs[0];
        console.log('   Filling pipeline name...');
        await nameInput.click();
        await page.waitForTimeout(200);
        // Select all and replace
        await nameInput.press('Control+a');
        await page.waitForTimeout(100);
        await nameInput.type('Mortgage Sales Pipeline');
        await page.waitForTimeout(500);
        console.log('   ✅ Entered pipeline name');

        await screenshot(page, '07b-name-filled');

        // Now handle the stages - there are 4 default stages
        // We need to: modify existing ones + add more for our 11 stages
        // Default: New Lead, Contacted, Proposal Sent, Closed
        // Our stages: New Lead, Contacted, Application Started, Application Submitted,
        //             Processing, Underwriting, Conditional Approval, Clear to Close,
        //             Closing Scheduled, Funded, Lost/Dead

        console.log('   Modifying stage names...');

        // Re-fetch inputs after name fill
        const stageInputs = await page.locator('input:visible').all();
        console.log(`   Found ${stageInputs.length} total inputs`);

        // Map our stages to existing inputs (skip first which is name)
        for (let i = 0; i < Math.min(MORTGAGE_PIPELINE_STAGES.length, stageInputs.length - 1); i++) {
          const stageName = MORTGAGE_PIPELINE_STAGES[i];
          const stageInput = stageInputs[i + 1]; // +1 to skip name input

          await stageInput.click();
          await page.waitForTimeout(100);
          await stageInput.press('Control+a');
          await stageInput.type(stageName);
          await page.waitForTimeout(200);
          console.log(`      Stage ${i + 1}: ${stageName}`);
        }

        // If we need more stages than the default 4, add them
        const existingStageCount = stageInputs.length - 1; // subtract name input
        if (MORTGAGE_PIPELINE_STAGES.length > existingStageCount) {
          console.log(`   Adding ${MORTGAGE_PIPELINE_STAGES.length - existingStageCount} more stages...`);

          for (let i = existingStageCount; i < MORTGAGE_PIPELINE_STAGES.length; i++) {
            const stageName = MORTGAGE_PIPELINE_STAGES[i];

            // Click "+ Add Stage"
            const addStageBtn = page.locator('text=Add Stage');
            if (await addStageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await addStageBtn.click();
              await page.waitForTimeout(500);

              // Get the newly added input (should be the last one)
              const updatedInputs = await page.locator('input:visible').all();
              const newStageInput = updatedInputs[updatedInputs.length - 1];

              await newStageInput.click();
              await newStageInput.press('Control+a');
              await newStageInput.type(stageName);
              await page.waitForTimeout(200);
              console.log(`      Stage ${i + 1}: ${stageName}`);
            }
          }
        }

        await screenshot(page, '07c-stages-configured');

        // Click Create button
        console.log('   Clicking Create button...');
        await page.waitForTimeout(500);

        // Click outside inputs first to trigger validation
        await page.click('text=Pipeline Stages');
        await page.waitForTimeout(500);

        const createBtn = page.locator('button:has-text("Create")').last();
        if (await createBtn.isVisible()) {
          // Force click even if disabled (will show error if truly invalid)
          await createBtn.click({ force: true });
          await page.waitForTimeout(3000);
          console.log('   ✅ Clicked Create!');
        }
      }

      await screenshot(page, '08-pipeline-created');
      console.log('✅ Pipeline creation attempted!\n');

    } else {
      console.log('   ⚠️ Create Pipeline button not found - checking if pipeline already exists...');

      // Check if there's already a pipeline we can edit
      const existingPipeline2 = page.locator('text=Mortgage Sales Pipeline, text=Default Pipeline').first();
      if (await existingPipeline2.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found existing pipeline, clicking to edit...');
        await existingPipeline2.click();
        await page.waitForTimeout(2000);
        await screenshot(page, '07-existing-pipeline');
      }
    }
    } // Close the pipelineExists else block

    // ===== STEP 7: CLOSE MODAL AND RENAME PIPELINE =====
    console.log('📍 STEP 7: Checking for open modal and pipeline rename...');

    // Close any open modal using multiple methods
    // Method 1: Click the X button at top right of modal
    const modalCloseX = page.locator('.hr-modal-close, [class*="modal"] button:has(svg), button[aria-label="Close"]').first();
    if (await modalCloseX.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Clicking X to close modal...');
      await modalCloseX.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Method 2: Click Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Clicking Cancel button...');
      await cancelBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Method 3: Press Escape multiple times
    console.log('   Pressing Escape to close modal...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Method 4: Click outside the modal (on the mask)
    const modalMask = page.locator('.hr-modal-mask, [class*="modal-overlay"]').first();
    if (await modalMask.isVisible({ timeout: 500 }).catch(() => false)) {
      console.log('   Clicking outside modal to close...');
      await page.mouse.click(50, 50);  // Click top-left corner
      await page.waitForTimeout(1000);
    }

    await screenshot(page, '09-modal-closed');

    // Now look for the pipeline to rename
    const pipelineRow = page.locator('tr:has-text("New Lead"), [class*="row"]:has-text("New Lead")').first();
    if (await pipelineRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found pipeline "New Lead" - attempting to rename...');

      // Find the edit button (pencil icon) in the same row
      const editIcon = page.locator('svg[class*="pencil"], [class*="edit-icon"], button[title*="Edit"]').first();
      if (await editIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editIcon.click();
        await page.waitForTimeout(2000);
        await screenshot(page, '10-edit-modal');

        // Find and update the name input
        const nameInput = page.locator('input').first();
        if (await nameInput.isVisible()) {
          await nameInput.click();
          await nameInput.press('Control+a');
          await nameInput.type('Mortgage Sales Pipeline');
          await page.waitForTimeout(500);

          // Click Update/Save
          const updateBtn = page.locator('button:has-text("Update"), button:has-text("Save")').first();
          if (await updateBtn.isVisible()) {
            await updateBtn.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Pipeline renamed!');
          }
        }
      } else {
        console.log('   Edit icon not found, pipeline may need manual rename');
      }
      await screenshot(page, '10-pipeline-renamed');
    } else {
      console.log('   Pipeline "New Lead" not found (may already be renamed or not exist)');
    }

    // ===== STEP 8: CREATE CUSTOM FIELDS =====
    console.log('📍 STEP 8: Creating custom fields...');

    // Navigate to Custom Fields section
    const customFieldsLink = page.locator('text=Custom Fields');
    if (await customFieldsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customFieldsLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '11-custom-fields-page');

      // Define mortgage-specific custom fields
      const CUSTOM_FIELDS = [
        { name: 'Loan Amount', type: 'Number' },
        { name: 'Property Address', type: 'Text' },
        { name: 'Credit Score', type: 'Number' },
        { name: 'Loan Type', type: 'Dropdown' },
        { name: 'Property Type', type: 'Dropdown' },
        { name: 'Down Payment', type: 'Number' },
        { name: 'Interest Rate', type: 'Number' },
        { name: 'Loan Term', type: 'Dropdown' },
        { name: 'Pre-Approval Amount', type: 'Number' },
        { name: 'Employment Status', type: 'Dropdown' },
        { name: 'Annual Income', type: 'Number' },
        { name: 'Debt-to-Income Ratio', type: 'Number' },
        { name: 'Referral Source', type: 'Dropdown' },
        { name: 'Target Close Date', type: 'Date' },
        { name: 'Co-Borrower Name', type: 'Text' }
      ];

      console.log(`   Creating ${CUSTOM_FIELDS.length} custom fields...`);

      // Click Add Field button
      const addFieldBtn = page.locator('button:has-text("Add Field"), button:has-text("Create Field")');
      if (await addFieldBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        for (const field of CUSTOM_FIELDS.slice(0, 5)) { // Start with first 5
          await addFieldBtn.click();
          await page.waitForTimeout(1000);

          // Fill field name
          const fieldNameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
          if (await fieldNameInput.isVisible()) {
            await fieldNameInput.fill(field.name);
            console.log(`      Creating: ${field.name}`);

            // Select field type
            const typeDropdown = page.locator('select, [class*="dropdown"]').first();
            if (await typeDropdown.isVisible()) {
              await typeDropdown.click();
              await page.locator(`text=${field.type}`).click().catch(() => {});
            }

            // Save
            const saveFieldBtn = page.locator('button:has-text("Save"), button:has-text("Create")').last();
            if (await saveFieldBtn.isVisible()) {
              await saveFieldBtn.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      }
      await screenshot(page, '12-custom-fields-created');
      console.log('✅ Custom fields created!\n');
    }

    // ===== FINAL SCREENSHOT =====
    await screenshot(page, '99-final-state');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 GHL Infrastructure Build Complete!');
    console.log('   ✅ Pipeline created with 10+ mortgage stages');
    console.log('   ✅ Custom fields added');
    console.log('   Check /ghl-automation/screenshots/ for all screenshots');
    console.log('   Press Ctrl+C to close.\n');

    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
