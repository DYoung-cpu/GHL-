const { chromium } = require('playwright');

// Script to rename the existing "New Lead" pipeline to "Mortgage Sales Pipeline"
// Using the Actions menu approach

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer v2');
  console.log('='.repeat(50) + '\n');

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

    // Click Google sign-in
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

    // ===== NAVIGATE TO PIPELINES =====
    console.log('📍 Navigating to Pipelines...');

    // First, click Go Back if we're in agency settings to get to sub-account
    const goBack = page.locator('text=Go Back, text=← Go Back').first();
    if (await goBack.isVisible({ timeout: 2000 }).catch(() => false)) {
      await goBack.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to Settings from main sidebar
    await page.locator('[class*="sidebar"] >> text=Settings').first().click({ timeout: 5000 }).catch(async () => {
      // Try alternative - click the gear icon
      await page.locator('a[href*="settings"], [class*="settings"]').first().click();
    });
    await page.waitForTimeout(2000);
    await screenshot(page, 'v2-01a-settings-clicked');

    // Scroll down in the settings sidebar to find Opportunities & Pipelines
    const settingsSidebar = page.locator('[class*="sidebar"], [class*="menu"], nav').first();

    // Try to find and click Opportunities & Pipelines - it might need scrolling
    let foundOpportunities = false;
    for (let i = 0; i < 5; i++) {
      const oppLink = page.locator('text=Opportunities & Pipelines, text=Opportunities').first();
      if (await oppLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   Found Opportunities & Pipelines!');
        await oppLink.click();
        foundOpportunities = true;
        break;
      }
      // Scroll down in sidebar
      await settingsSidebar.evaluate(el => el.scrollTop += 200);
      await page.waitForTimeout(500);
    }

    if (!foundOpportunities) {
      // Direct URL approach as fallback
      console.log('   Trying direct navigation...');
      await page.goto('https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/settings/pipelines', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    await page.waitForTimeout(2000);

    // Click Pipelines tab (rightmost element)
    const pipelinesElements = await page.$$('text=Pipelines');
    for (const el of pipelinesElements) {
      const box = await el.boundingBox();
      if (box && box.y < 100 && box.x > 500) {
        await el.click({ force: true });
        await page.waitForTimeout(2000);
        break;
      }
    }

    await screenshot(page, 'v2-01-pipelines-page');
    console.log('✅ On Pipelines page!\n');

    // ===== CLEAR ANY SEARCH FILTERS =====
    console.log('📍 Clearing search filters...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.press('Control+a');
      await searchInput.press('Backspace');
      await page.waitForTimeout(1000);
    }

    // Also try to clear any filter chips
    const clearButtons = await page.$$('[class*="close"], [class*="clear"], svg[class*="x"]');
    for (const btn of clearButtons) {
      try {
        const box = await btn.boundingBox();
        if (box && box.y < 250) { // Only clear filters in the top area
          await btn.click({ force: true });
          await page.waitForTimeout(500);
        }
      } catch (e) {}
    }

    await page.waitForTimeout(1000);
    await screenshot(page, 'v2-02-filters-cleared');

    // ===== FIND THE PIPELINE ROW =====
    console.log('📍 Looking for pipeline...');

    // Look for any pipeline row - check for "New Lead" or might already be renamed
    const pipelineRow = page.locator('tr:has-text("New Lead"), tr:has-text("Lead")').first();

    if (await pipelineRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found pipeline row!');
      await screenshot(page, 'v2-03-found-pipeline');

      // Find the Actions column in this row
      // GHL typically has a gear icon or 3-dot menu
      const actionsButton = pipelineRow.locator('button, [class*="action"], svg').last();

      if (await actionsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Clicking actions button...');
        await actionsButton.click();
        await page.waitForTimeout(1000);
        await screenshot(page, 'v2-04-actions-menu');

        // Look for Edit or Rename option
        const editOption = page.locator('text=Edit, text=Rename, text=Settings').first();
        if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editOption.click();
          await page.waitForTimeout(1000);
        }
      }
    } else {
      console.log('   Pipeline row not found in table');
    }

    // ===== ALTERNATIVE: CLICK DIRECTLY ON PIPELINE NAME =====
    console.log('📍 Trying direct click on pipeline name...');

    // Click on the pipeline name to open its detail/edit view
    const pipelineName = page.locator('a:has-text("New Lead"), span:has-text("New Lead"), td:has-text("New Lead")').first();

    if (await pipelineName.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found pipeline name link, clicking...');
      await pipelineName.click();
      await page.waitForTimeout(3000);
      await screenshot(page, 'v2-05-pipeline-detail');

      // Now we should be in the pipeline detail view
      // Look for the header area with "New Lead" and a pencil icon
      console.log('📍 Looking for edit pencil icon...');

      // The header structure is typically: "← New Lead ✏️"
      // Try clicking on the pencil/edit icon
      const editIcon = page.locator('[class*="pencil"], [class*="edit"], svg[name*="edit"], svg[name*="pencil"]').first();

      if (await editIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   Found edit icon!');
        await editIcon.click();
        await page.waitForTimeout(1000);
      } else {
        console.log('   Edit icon not found, looking for title to click...');
        // Try double-clicking on the title itself
        const titleElement = page.locator('h1, h2, [class*="header"] span, [class*="title"]').filter({ hasText: 'New Lead' }).first();
        if (await titleElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   Double-clicking on title...');
          await titleElement.dblclick();
          await page.waitForTimeout(1000);
        }
      }

      await screenshot(page, 'v2-06-edit-mode');

      // Now look for an input field to change the name
      console.log('📍 Looking for name input field...');

      // Find visible input that might contain "New Lead"
      const inputs = await page.$$('input:visible');
      for (const input of inputs) {
        const value = await input.inputValue().catch(() => '');
        console.log(`   Input value: "${value}"`);

        if (value.toLowerCase().includes('new lead') || value === '') {
          console.log('   Found potential name input!');
          await input.click();
          await input.press('Control+a');
          await input.fill('Mortgage Sales Pipeline');
          await page.waitForTimeout(500);

          // Try to save
          await input.press('Enter');
          await page.waitForTimeout(1000);

          // Look for a save button
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Done")').first();
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
          }

          console.log('   ✅ Name changed!');
          break;
        }
      }

      await screenshot(page, 'v2-07-after-rename');
    }

    // ===== CHECK RESULT =====
    console.log('\n📍 Checking result...');

    // Go back to pipelines list
    const backButton = page.locator('text=← , [class*="back"], a:has-text("Back")').first();
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(2000);
    } else {
      // Navigate again
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForTimeout(2000);
      await page.getByText('Opportunities & Pipelines').click();
      await page.waitForTimeout(2000);
      const tabs = await page.$$('text=Pipelines');
      for (const el of tabs) {
        const box = await el.boundingBox();
        if (box && box.y < 100 && box.x > 500) {
          await el.click({ force: true });
          await page.waitForTimeout(2000);
          break;
        }
      }
    }

    await screenshot(page, 'v2-08-final-result');

    // Check if rename was successful
    const mortgagePipeline = page.locator('text=Mortgage Sales Pipeline');
    if (await mortgagePipeline.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ SUCCESS! Pipeline renamed to "Mortgage Sales Pipeline"!');
    } else {
      const newLeadPipeline = page.locator('text=New Lead');
      if (await newLeadPipeline.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('⚠️ Pipeline still named "New Lead"');
      } else {
        console.log('❓ Pipeline name unclear - check screenshot');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Done! Check the screenshots.');
    console.log('   Browser staying open for 30 seconds...\n');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v2-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
