const { chromium } = require('playwright');

/**
 * Configure Contact Tag triggers for workflows
 * Uses multiple click methods and proper dropdown selection
 */

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// Workflows that need Contact Tag triggers
const TAG_WORKFLOWS = [
  { name: 'New Lead Nurture Sequence', tag: 'New Lead' },
  { name: 'Pre-Qualification Process Workflow', tag: 'Pre-Qual Started' },
  { name: 'Pre-Qualification Complete Notification', tag: 'Pre-Qual Complete' },
  { name: 'Application Process Updates', tag: 'Application Started' },
  { name: 'Underwriting Status Updates', tag: 'In Underwriting' },
  { name: 'Conditional Approval Celebration', tag: 'Conditionally Approved' },
  { name: 'Clear to Close Celebration', tag: 'Clear to Close' },
  { name: 'Closing Countdown Sequence', tag: 'Closing Scheduled' },
  { name: 'Post-Close Nurture & Referral Sequence', tag: 'Closed' },
  { name: 'Realtor Partner Updates', tag: 'Realtor Referral' }
];

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   Screenshot: ${name}.png`);
}

(async () => {
  console.log('=== CONFIGURE TAG TRIGGERS ===\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const sleep = (ms) => page.waitForTimeout(ms);

  try {
    // ===== LOGIN =====
    console.log('[LOGIN] Starting...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await sleep(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await sleep(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch (e) {}
      await sleep(8000);
    }
    console.log('[LOGIN] Done!\n');

    // ===== NAVIGATE TO WORKFLOWS LIST =====
    console.log('[1] Going to workflows list...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
      waitUntil: 'domcontentloaded'
    });
    await sleep(4000);
    await screenshot(page, 'trigger-config-01-list');

    // Process ONE workflow to test the flow
    const testWorkflow = TAG_WORKFLOWS[0]; // New Lead Nurture Sequence
    console.log(`\n[2] Testing with: "${testWorkflow.name}" -> Tag: "${testWorkflow.tag}"`);

    // Find and click on the workflow row
    // Workflows appear in list at y positions starting around 371
    // We need to click the workflow name link to open it

    // First, let's search for the workflow
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill(testWorkflow.name.substring(0, 15)); // First 15 chars
      await sleep(2000);
    }
    await screenshot(page, 'trigger-config-02-searched');

    // Click on the workflow name (should be first result)
    // The workflow name is a link that opens the workflow builder
    const workflowLink = page.locator(`text=${testWorkflow.name}`).first();
    if (await workflowLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[3] Found workflow, clicking to open...');
      await workflowLink.click();
      await sleep(4000);
    } else {
      // Fallback: try coordinate click on first row
      console.log('[3] Using coordinate click on first row...');
      await page.mouse.click(415, 371);
      await sleep(4000);
    }
    await screenshot(page, 'trigger-config-03-workflow-opened');

    // Now in the workflow builder, look for the trigger block
    // The trigger block should be at the top of the canvas
    console.log('[4] Looking for trigger block...');

    // Check current URL to confirm we're in workflow builder
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Try multiple methods to click the trigger block

    // Method 1: Look for "+ Add New Trigger" text
    console.log('[5] Method 1: Text selector...');
    const addTriggerText = page.locator('text=Add New Trigger').first();
    if (await addTriggerText.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found "Add New Trigger" text, clicking...');
      await addTriggerText.click();
      await sleep(2000);
      await screenshot(page, 'trigger-config-04-method1');
    }

    // Method 2: Try clicking at known canvas coordinates
    // Based on screenshots, trigger block is around (700, 153)
    console.log('[5] Method 2: Canvas coordinates...');
    await page.mouse.click(700, 153);
    await sleep(2000);
    await screenshot(page, 'trigger-config-05-method2');

    // Method 3: JavaScript elementFromPoint
    console.log('[5] Method 3: JavaScript click...');
    await page.evaluate(() => {
      const el = document.elementFromPoint(700, 153);
      if (el) {
        el.click();
        console.log('Clicked element:', el.tagName, el.className);
      }
    });
    await sleep(2000);
    await screenshot(page, 'trigger-config-06-method3');

    // Method 4: Look for any visible panel with "Add Trigger" heading
    console.log('[6] Checking if trigger panel opened...');
    const addTriggerPanel = page.locator('text=Add Trigger').first();
    const panelVisible = await addTriggerPanel.isVisible({ timeout: 3000 }).catch(() => false);

    if (panelVisible) {
      console.log('   Trigger panel is open!');

      // Search for "Contact Tag" in the panel
      console.log('[7] Searching for Contact Tag...');
      const searchInPanel = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInPanel.click();
        await searchInPanel.fill('Contact Tag');
        await sleep(1500);
        await screenshot(page, 'trigger-config-07-searched-tag');

        // Click on "Contact Tag" option
        const contactTagOption = page.locator('text=Contact Tag').first();
        if (await contactTagOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await contactTagOption.click();
          await sleep(2000);
          await screenshot(page, 'trigger-config-08-contact-tag-selected');
        }
      }

      // Now look for "+ Add filters" to add the specific tag
      console.log('[8] Looking for Add filters...');
      const addFiltersLink = page.locator('text=Add filters').first();
      if (await addFiltersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addFiltersLink.click();
        await sleep(2000);
        await screenshot(page, 'trigger-config-09-add-filters');

        // The filter dropdown should now be visible
        // Look for a dropdown to select "Tag"
        const filterDropdown = page.locator('select, [role="listbox"]').first();
        if (await filterDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
          await filterDropdown.click();
          await sleep(1000);
        }

        // Type the tag name and CLICK the dropdown option
        console.log(`[9] Typing tag name: ${testWorkflow.tag}`);
        const tagInput = page.locator('input').filter({ hasText: '' }).last();
        if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tagInput.click();
          await tagInput.fill(testWorkflow.tag);
          await sleep(2000);
          await screenshot(page, 'trigger-config-10-tag-typed');

          // IMPORTANT: Click on the dropdown option, don't just press Enter
          console.log('[10] Looking for dropdown option to click...');
          const dropdownOption = page.locator(`text="${testWorkflow.tag}"`).first();
          if (await dropdownOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('   Found dropdown option, clicking...');
            await dropdownOption.click();
            await sleep(1500);
            await screenshot(page, 'trigger-config-11-tag-selected');
          } else {
            // Try clicking first visible option in dropdown
            const anyOption = page.locator('[role="option"], .dropdown-item, li').first();
            if (await anyOption.isVisible({ timeout: 2000 }).catch(() => false)) {
              await anyOption.click();
              await sleep(1500);
            }
          }
        }

        // Click Save Trigger button
        console.log('[11] Saving trigger...');
        const saveBtn = page.locator('button:has-text("Save Trigger")').first();
        if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveBtn.click();
          await sleep(2000);
          await screenshot(page, 'trigger-config-12-saved');
          console.log('   Trigger saved!');
        }
      }
    } else {
      console.log('   Trigger panel did NOT open');
      console.log('   The canvas trigger block is not responding to clicks');
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Check screenshots trigger-config-01 through trigger-config-12');
    console.log('Browser staying open for manual inspection (2 minutes)...\n');

    await sleep(120000);

  } catch (error) {
    console.error('Error:', error.message);
    await screenshot(page, 'trigger-config-error');
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
