const { chromium } = require('playwright');

// Script to create custom fields for mortgage CRM
// Flow: Click Add Field -> Select Type -> Click Next -> Enter Name -> Save

const CUSTOM_FIELDS = [
  { name: 'Loan Amount', type: 'Monetary' },
  { name: 'Property Address', type: 'Single Line' },
  { name: 'Credit Score', type: 'Number' },
  { name: 'Loan Type', type: 'Dropdown (Single)', options: ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo', 'Other'] },
  { name: 'Property Type', type: 'Dropdown (Single)', options: ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Investment'] },
  { name: 'Down Payment Percent', type: 'Number' },
  { name: 'Interest Rate', type: 'Number' },
  { name: 'Loan Term', type: 'Dropdown (Single)', options: ['30-Year Fixed', '15-Year Fixed', '20-Year Fixed', 'ARM 5/1', 'ARM 7/1'] },
  { name: 'Pre-Approval Amount', type: 'Monetary' },
  { name: 'Employment Status', type: 'Dropdown (Single)', options: ['W-2 Employee', 'Self-Employed', 'Retired', 'Other'] },
  { name: 'Annual Income', type: 'Monetary' },
  { name: 'DTI Ratio', type: 'Number' },
  { name: 'Referral Source', type: 'Dropdown (Single)', options: ['Zillow', 'Realtor.com', 'Referral', 'Website', 'Social Media', 'Cold Call', 'Other'] },
  { name: 'Target Close Date', type: 'Date Picker' },
  { name: 'Co-Borrower Name', type: 'Single Line' }
];

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

async function createField(page, field, index) {
  console.log(`\n📍 Creating field ${index + 1}/${CUSTOM_FIELDS.length}: "${field.name}" (${field.type})`);

  try {
    // Step 1: Click "+ Add Field" button
    const addBtn = page.locator('button:has-text("Add Field")').first();
    await addBtn.click();
    await page.waitForTimeout(2000);

    // Step 2: Select field type from the modal grid
    // The buttons are inside the modal - need to click the button containing the type text
    // Types: Single Line, Multi Line, Text Box List, Number, Phone, Monetary,
    //        Dropdown (Single), Dropdown (Multiple), Radio Select, Checkbox, Date Picker, File Upload, Signature

    // Click on the button that contains the type text
    const typeBtn = page.locator(`button:has-text("${field.type}"), div:has-text("${field.type}"):not(:has(*))`).first();
    if (await typeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeBtn.click({ force: true });
      console.log(`   ✓ Selected type: ${field.type}`);
      await page.waitForTimeout(1000);
    } else {
      // Try clicking by text directly
      await page.click(`text="${field.type}"`, { force: true });
      console.log(`   ✓ Selected type (alt): ${field.type}`);
      await page.waitForTimeout(1000);
    }

    // Step 3: Click "Next" button - wait for it to be enabled
    await page.waitForTimeout(500);
    const nextBtn = page.locator('button:has-text("Next")').first();
    await nextBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Step 4: Enter field name
    // Look for the name input field
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="label"], input[placeholder*="Label"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.click();
      await nameInput.fill(field.name);
      console.log(`   ✓ Entered name: ${field.name}`);
    } else {
      // Try first input in modal
      const inputs = await page.$$('input:visible');
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder');
        const type = await input.getAttribute('type');
        if (placeholder && (placeholder.toLowerCase().includes('name') || placeholder.toLowerCase().includes('label'))) {
          await input.fill(field.name);
          console.log(`   ✓ Entered name: ${field.name}`);
          break;
        }
      }
    }

    await page.waitForTimeout(500);

    // Step 5: If dropdown, add options
    if (field.type.includes('Dropdown') && field.options) {
      console.log(`   Adding ${field.options.length} dropdown options...`);

      for (let i = 0; i < field.options.length; i++) {
        const option = field.options[i];

        // Click "Add Option" if exists
        const addOptionBtn = page.locator('button:has-text("Add Option"), text=Add Option, button:has-text("+ Add")').first();
        if (await addOptionBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await addOptionBtn.click();
          await page.waitForTimeout(300);
        }

        // Find option input - usually the last empty input
        const optionInputs = await page.$$('input[placeholder*="ption"], input[placeholder*="value"]');
        if (optionInputs.length > 0) {
          const lastInput = optionInputs[optionInputs.length - 1];
          await lastInput.fill(option);
          await page.waitForTimeout(200);
        }
      }
      console.log(`   ✓ Added options`);
    }

    // Step 6: Click Save/Create button (inside the modal)
    await page.waitForTimeout(500);
    const saveBtn = page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create"), .modal button:has-text("Save"), [class*="modal"] button:has-text("Save")').first();

    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
      console.log(`   ✓ Clicked Save`);
      await page.waitForTimeout(2000);
    } else {
      // Try clicking any visible Save button
      const anySaveBtn = page.locator('button:has-text("Save")').first();
      if (await anySaveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await anySaveBtn.click({ force: true });
        console.log(`   ✓ Clicked Save (alt)`);
        await page.waitForTimeout(2000);
      }
    }

    // Close any remaining modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log(`   ✅ Field "${field.name}" created!`);
    return true;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return false;
  }
}

(async () => {
  console.log('🔧 GHL Custom Fields Creator');
  console.log('='.repeat(50));
  console.log(`Creating ${CUSTOM_FIELDS.length} mortgage-specific custom fields\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }
    await page.waitForTimeout(3000);

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
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO CUSTOM FIELDS =====
    console.log('📍 Navigating to Custom Fields...');

    // Use direct URL for reliability
    await page.goto('https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/settings/custom_fields', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await screenshot(page, 'cf-01-custom-fields-page');
    console.log('✅ On Custom Fields page!\n');

    // ===== CREATE EACH FIELD =====
    let successCount = 0;
    for (let i = 0; i < CUSTOM_FIELDS.length; i++) {
      const success = await createField(page, CUSTOM_FIELDS[i], i);
      if (success) successCount++;

      // Take screenshot every 5 fields
      if ((i + 1) % 5 === 0) {
        await screenshot(page, `cf-progress-${i + 1}`);
      }
    }

    await screenshot(page, 'cf-final');

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Created ${successCount}/${CUSTOM_FIELDS.length} custom fields`);
    console.log('Browser staying open for 30 seconds...\n');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'cf-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
