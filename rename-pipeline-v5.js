const { chromium } = require('playwright');

// Script to rename "New Lead" pipeline to "Mortgage Sales Pipeline"
// CORRECT: Click the PENCIL ICON in the Actions column (right side of row)

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer v5');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('📍 Step 1: Logging into GHL...');
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
    console.log('📍 Step 2: Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO OPPORTUNITIES =====
    console.log('📍 Step 3: Clicking Opportunities in sidebar...');
    await page.locator('a:has-text("Opportunities")').first().click();
    await page.waitForTimeout(3000);

    // ===== CLICK PIPELINES TAB =====
    console.log('📍 Step 4: Clicking Pipelines tab...');
    const pipelinesTab = page.locator('text=Pipelines').first();
    await pipelinesTab.click({ force: true });
    await page.waitForTimeout(3000);
    await screenshot(page, 'v5-01-pipelines-list');

    // ===== FIND THE PENCIL ICON IN ACTIONS COLUMN =====
    console.log('📍 Step 5: Finding pencil/edit icon in Actions column...');

    // The row shows: "New Lead | 10 | Dec 9, 2025 | [pencil] [key] [trash]"
    // We need to click the FIRST icon (pencil) in the row with "New Lead"

    // Find the row containing "New Lead"
    const pipelineRow = page.locator('tr:has-text("New Lead")').first();

    if (await pipelineRow.isVisible({ timeout: 5000 })) {
      console.log('   Found New Lead row!');

      // Find SVG icons within this row - the pencil is usually first
      const rowIcons = pipelineRow.locator('svg');
      const iconCount = await rowIcons.count();
      console.log(`   Found ${iconCount} icons in the row`);

      if (iconCount > 0) {
        // Click the first icon (pencil/edit)
        const pencilIcon = rowIcons.first();
        console.log('   Clicking pencil icon...');
        await pencilIcon.click({ force: true });
        await page.waitForTimeout(2000);
      }
    } else {
      // Alternative: Find by coordinates
      // From screenshot: Actions column is around x=1260-1320, row y is around 290-310
      console.log('   Trying coordinate click on pencil icon...');
      await page.mouse.click(1265, 299);
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v5-02-after-pencil-click');

    // ===== A MODAL OR INLINE EDIT SHOULD APPEAR =====
    console.log('📍 Step 6: Looking for name input...');

    // Wait for modal or input to appear
    await page.waitForTimeout(1000);

    // Look for input field - might be in a modal or inline
    const inputs = await page.$$('input:visible');
    console.log(`   Found ${inputs.length} visible inputs`);

    let foundNameInput = false;
    for (const input of inputs) {
      const value = await input.inputValue().catch(() => '');
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      console.log(`   Input: value="${value}", placeholder="${placeholder}"`);

      // Look for input with "New Lead" value or pipeline name placeholder
      if (value === 'New Lead' || value.toLowerCase().includes('new lead') ||
          placeholder.toLowerCase().includes('name') || placeholder.toLowerCase().includes('pipeline')) {
        console.log('   → Found pipeline name input!');
        await input.click();
        await page.waitForTimeout(300);
        await input.press('Control+a');
        await input.type('Mortgage Sales Pipeline');
        foundNameInput = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    // If not found by value, try the first non-search input
    if (!foundNameInput && inputs.length > 0) {
      console.log('   Trying first available input...');
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder').catch(() => '');
        if (!placeholder.toLowerCase().includes('search')) {
          await input.click();
          await page.waitForTimeout(300);
          await input.press('Control+a');
          await input.type('Mortgage Sales Pipeline');
          foundNameInput = true;
          break;
        }
      }
    }

    await screenshot(page, 'v5-03-name-entered');

    // ===== SAVE CHANGES =====
    console.log('📍 Step 7: Saving changes...');

    // Look for Save/Update button
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Confirm")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Clicking Save button...');
      await saveBtn.click();
      await page.waitForTimeout(2000);
    } else {
      // Try pressing Enter
      console.log('   No save button found, pressing Enter...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v5-04-after-save');

    // ===== VERIFY RESULT =====
    console.log('\n📍 Step 8: Verifying result...');

    // Close any modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Check if the name changed
    const newName = page.locator('text=Mortgage Sales Pipeline');
    if (await newName.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n✅ SUCCESS! Pipeline renamed to "Mortgage Sales Pipeline"!');
    } else {
      const oldName = page.locator('tr:has-text("New Lead")');
      if (await oldName.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('\n⚠️ Pipeline still shows "New Lead"');
      } else {
        console.log('\n❓ Could not verify. Check final screenshot.');
      }
    }

    await screenshot(page, 'v5-05-final');

    console.log('\n' + '='.repeat(50));
    console.log('Browser staying open for 45 seconds...\n');
    await page.waitForTimeout(45000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v5-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
