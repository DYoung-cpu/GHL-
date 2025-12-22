const { chromium } = require('playwright');

// Script to rename the existing "New Lead" pipeline to "Mortgage Sales Pipeline"
// CORRECT FLOW: Opportunities page header -> Pipelines TAB -> Click pipeline row -> Edit name

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer v4');
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
    console.log('📍 Step 3: Clicking Opportunities in main sidebar...');
    const oppLink = page.locator('a:has-text("Opportunities")').first();
    await oppLink.click();
    await page.waitForTimeout(3000);
    await screenshot(page, 'v4-01-opportunities');

    // ===== CLICK "PIPELINES" TAB IN THE PAGE HEADER =====
    // The header shows: "Opportunities | Pipelines | Bulk Actions"
    console.log('📍 Step 4: Clicking Pipelines tab in header...');

    // Find Pipelines tab - it's in the header area (y < 100) and NOT the first one
    const pipelinesTab = page.locator('text=Pipelines').nth(0);
    const tabBox = await pipelinesTab.boundingBox();
    console.log(`   Pipelines tab at x=${tabBox?.x}, y=${tabBox?.y}`);

    // Click using coordinates to avoid overlay issues
    if (tabBox) {
      await page.mouse.click(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    } else {
      await pipelinesTab.click({ force: true });
    }
    await page.waitForTimeout(3000);
    await screenshot(page, 'v4-02-pipelines-tab-clicked');

    // ===== NOW WE SHOULD BE ON PIPELINE MANAGEMENT PAGE =====
    console.log('📍 Step 5: Looking for pipeline list...');

    // Check if we're on the pipeline management page
    const createPipelineBtn = page.locator('text=Create Pipeline, button:has-text("Create")');
    if (await createPipelineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Create Pipeline button - we\'re on the right page!');
    }

    await screenshot(page, 'v4-03-pipeline-list');

    // ===== FIND AND CLICK ON "NEW LEAD" PIPELINE ROW =====
    console.log('📍 Step 6: Looking for "New Lead" pipeline in the list...');

    // The pipeline should be in a table row
    // Try clicking on the pipeline name text
    const pipelineRow = page.locator('tr:has-text("New Lead"), [class*="pipeline"]:has-text("New Lead")').first();

    if (await pipelineRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found pipeline row!');

      // Get the row's bounding box and click it
      const rowBox = await pipelineRow.boundingBox();
      if (rowBox) {
        console.log(`   Row at x=${rowBox.x}, y=${rowBox.y}`);
        await page.mouse.click(rowBox.x + 100, rowBox.y + rowBox.height / 2);
        await page.waitForTimeout(3000);
      }
    } else {
      // Try finding just the text "New Lead" in a link or clickable element
      console.log('   Row not found, trying text link...');
      const pipelineLink = page.locator('a:has-text("New Lead"), [role="link"]:has-text("New Lead")').first();
      if (await pipelineLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pipelineLink.click({ force: true });
        await page.waitForTimeout(3000);
      }
    }

    await screenshot(page, 'v4-04-pipeline-clicked');

    // ===== NOW WE SHOULD BE IN PIPELINE DETAIL VIEW =====
    console.log('📍 Step 7: Looking for pencil/edit icon next to pipeline name...');

    // The header shows something like: "← New Lead ✏️"
    // Look for edit/pencil icon near the top

    // Try to find SVG icons in the header area
    const headerArea = page.locator('h1, h2, [class*="header"], [class*="title"]').first();

    // Look for a pencil/edit button
    const editBtn = page.locator('[class*="edit"], [class*="pencil"], svg').filter({
      has: page.locator('[class*="edit"], [d*="M"]')
    }).first();

    // Alternative: Look for any clickable icon near the title
    const icons = await page.$$('svg, [class*="icon"]');
    for (const icon of icons) {
      const box = await icon.boundingBox();
      if (box && box.y < 150 && box.y > 50 && box.width < 30) {
        console.log(`   Found small icon at x=${box.x}, y=${box.y}`);
        // Click icons that might be the pencil
        if (box.x > 150 && box.x < 500) {
          await icon.click({ force: true });
          await page.waitForTimeout(1500);
          break;
        }
      }
    }

    await screenshot(page, 'v4-05-after-icon-click');

    // ===== LOOK FOR INPUT FIELD TO CHANGE NAME =====
    console.log('📍 Step 8: Looking for name input field...');

    // After clicking pencil, there should be an input
    const nameInput = page.locator('input').filter({ hasText: '' }).first();
    const visibleInputs = await page.$$('input:visible');

    console.log(`   Found ${visibleInputs.length} visible inputs`);

    for (const input of visibleInputs) {
      const value = await input.inputValue().catch(() => '');
      const box = await input.boundingBox();
      console.log(`   Input: value="${value}" at y=${box?.y}`);

      if (value.toLowerCase().includes('new lead') || (box && box.y < 200 && value === '')) {
        console.log('   → Using this input for new name');
        await input.click();
        await input.press('Control+a');
        await input.type('Mortgage Sales Pipeline');
        await page.waitForTimeout(500);
        await input.press('Enter');
        await page.waitForTimeout(1000);

        // Try to save
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
        }
        break;
      }
    }

    await screenshot(page, 'v4-06-name-changed');

    // ===== VERIFY =====
    console.log('\n📍 Step 9: Verifying...');
    await screenshot(page, 'v4-07-final');

    const success = page.locator('text=Mortgage Sales Pipeline');
    if (await success.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n✅ SUCCESS! Pipeline renamed!');
    } else {
      console.log('\n⚠️ Could not verify. Check screenshots.');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Browser staying open for 45 seconds...\n');
    await page.waitForTimeout(45000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v4-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
