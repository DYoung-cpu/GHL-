const { chromium } = require('playwright');

// Script to rename "New Lead" pipeline to "Mortgage Sales Pipeline"
// CORRECT FLOW:
// 1. Go to Pipelines tab
// 2. Click pencil in row → opens detail view
// 3. In detail view header "← New Lead ✏️", click the PENCIL next to title
// 4. Edit inline and save

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer v6');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
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

    // ===== NAVIGATE TO PIPELINES =====
    console.log('📍 Step 3: Going to Pipelines...');
    await page.locator('a:has-text("Opportunities")').first().click();
    await page.waitForTimeout(3000);
    await page.locator('text=Pipelines').first().click({ force: true });
    await page.waitForTimeout(3000);
    await screenshot(page, 'v6-01-pipelines-list');

    // ===== CLICK PENCIL TO OPEN PIPELINE DETAIL =====
    console.log('📍 Step 4: Opening pipeline detail view...');
    const pipelineRow = page.locator('tr:has-text("New Lead")').first();
    const rowPencil = pipelineRow.locator('svg').first();
    await rowPencil.click({ force: true });
    await page.waitForTimeout(3000);
    await screenshot(page, 'v6-02-detail-view');

    // ===== NOW CLICK THE PENCIL NEXT TO "New Lead" IN THE HEADER =====
    console.log('📍 Step 5: Clicking pencil icon next to "New Lead" in header...');

    // From user screenshot: The pencil icon is at approximately x=407, y=133
    // It's the small pencil icon right after "New Lead" text in the header

    // Click directly at the pencil coordinates
    console.log('   Clicking pencil icon at coordinates (407, 133)...');
    await page.mouse.click(407, 133);
    await page.waitForTimeout(2000);

    await screenshot(page, 'v6-03-after-header-pencil');

    // ===== NOW AN INPUT SHOULD APPEAR FOR EDITING THE NAME =====
    console.log('📍 Step 6: Looking for inline name input...');

    // The title should now be an editable input
    const inputs = await page.$$('input:visible');
    console.log(`   Found ${inputs.length} visible inputs`);

    let renamed = false;
    for (const input of inputs) {
      const value = await input.inputValue().catch(() => '');
      const box = await input.boundingBox();
      console.log(`   Input: value="${value}" at y=${box?.y}`);

      // The name input should have "New Lead" as value and be in the header area (y < 160)
      if (value === 'New Lead' || (box && box.y < 160 && box.y > 100)) {
        console.log('   → Found pipeline name input!');
        await input.click();
        await page.waitForTimeout(300);

        // Select all and type new name
        await input.press('Control+a');
        await input.type('Mortgage Sales Pipeline');
        console.log('   Typed new name: "Mortgage Sales Pipeline"');

        await page.waitForTimeout(500);

        // Press Enter or Tab to save inline edit
        await input.press('Enter');
        await page.waitForTimeout(1000);

        renamed = true;
        break;
      }
    }

    // If input wasn't found by value, try clicking directly on the text area
    if (!renamed) {
      console.log('   Input not found, trying to click on title text directly...');
      const titleText = page.locator('text=New Lead').first();
      const titleBox = await titleText.boundingBox();
      if (titleBox && titleBox.y < 160) {
        await titleText.dblclick();
        await page.waitForTimeout(1000);

        // Now try to find the input again
        const newInputs = await page.$$('input:visible');
        for (const input of newInputs) {
          const value = await input.inputValue().catch(() => '');
          if (value === 'New Lead' || value === '') {
            await input.press('Control+a');
            await input.type('Mortgage Sales Pipeline');
            await input.press('Enter');
            renamed = true;
            break;
          }
        }
      }
    }

    await screenshot(page, 'v6-04-name-changed');

    // ===== LOOK FOR SAVE BUTTON IF NEEDED =====
    console.log('📍 Step 7: Looking for save button...');
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Done")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Clicking Save...');
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    // Also try clicking outside to confirm
    await page.mouse.click(800, 400);
    await page.waitForTimeout(1000);

    await screenshot(page, 'v6-05-after-save');

    // ===== VERIFY =====
    console.log('\n📍 Step 8: Verifying result...');

    // Go back to pipeline list to verify
    const backBtn = page.locator('text=←').first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v6-06-final');

    const success = page.locator('text=Mortgage Sales Pipeline');
    if (await success.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n✅ SUCCESS! Pipeline renamed to "Mortgage Sales Pipeline"!');
    } else {
      console.log('\n⚠️ Could not verify rename. Check screenshots.');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Browser staying open for 45 seconds...\n');
    await page.waitForTimeout(45000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v6-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
