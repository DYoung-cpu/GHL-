const { chromium } = require('playwright');

// Script to rename the existing "New Lead" pipeline to "Mortgage Sales Pipeline"
// Uses CORRECT navigation: Opportunities sidebar -> Pipelines tab

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer v3');
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

    // Click Google sign-in iframe button
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
    console.log('📍 Step 2: Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ In sub-account!\n');
    await screenshot(page, 'v3-01-logged-in');

    // ===== NAVIGATE VIA OPPORTUNITIES (NOT Settings) =====
    console.log('📍 Step 3: Clicking Opportunities in main sidebar...');

    // Click Opportunities in the main left sidebar
    const oppLink = page.locator('a:has-text("Opportunities")').first();
    if (await oppLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await oppLink.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked Opportunities');
    } else {
      // Try clicking the icon/link directly
      await page.click('text=Opportunities', { force: true });
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v3-02-opportunities-page');

    // ===== CLICK PIPELINES TAB =====
    console.log('📍 Step 4: Clicking Pipelines tab...');

    // Find all "Pipelines" text elements and click the RIGHTMOST one (x > 500)
    const pipelinesElements = await page.$$('text=Pipelines');
    console.log(`   Found ${pipelinesElements.length} elements with "Pipelines"`);

    for (const el of pipelinesElements) {
      const box = await el.boundingBox();
      if (box) {
        console.log(`   Element at x=${box.x}, y=${box.y}`);
        if (box.y < 100 && box.x > 500) {
          console.log('   → Clicking this one (rightmost tab)');
          await el.click({ force: true });
          await page.waitForTimeout(2000);
          break;
        }
      }
    }

    await screenshot(page, 'v3-03-pipelines-tab');
    console.log('✅ On Pipelines page!\n');

    // ===== FIND THE "NEW LEAD" PIPELINE =====
    console.log('📍 Step 5: Looking for "New Lead" pipeline...');

    // Look for the pipeline name in the table/list
    const pipelineLink = page.locator('text=New Lead').first();

    if (await pipelineLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found "New Lead" pipeline!');
      await screenshot(page, 'v3-04-found-pipeline');

      // Click on it to open the pipeline detail view
      console.log('   Clicking to open pipeline...');
      await pipelineLink.click();
      await page.waitForTimeout(3000);

      await screenshot(page, 'v3-05-pipeline-detail');

      // ===== FIND AND CLICK THE PENCIL ICON =====
      console.log('📍 Step 6: Looking for pencil/edit icon...');

      // The header shows: "← New Lead ✏️"
      // Look for SVG elements near the title
      const allSvgs = await page.$$('svg');
      console.log(`   Found ${allSvgs.length} SVG elements`);

      // Try to find pencil icon - usually in the header area
      let foundPencil = false;
      for (const svg of allSvgs) {
        const box = await svg.boundingBox();
        if (box && box.y < 150 && box.x > 200 && box.x < 600) {
          // Check if it's near the "New Lead" text
          const parent = await svg.evaluateHandle(el => el.parentElement);
          const parentText = await parent.evaluate(el => el.textContent || '');
          console.log(`   SVG at x=${box.x}, y=${box.y}, parent text: "${parentText.substring(0, 30)}..."`);

          // Click on small SVG icons in header area (likely pencil)
          if (box.width < 30 && box.height < 30) {
            console.log('   → Clicking this SVG (small icon in header)');
            await svg.click({ force: true });
            await page.waitForTimeout(1500);
            foundPencil = true;
            break;
          }
        }
      }

      if (!foundPencil) {
        // Try clicking directly on the title text to trigger inline edit
        console.log('   Pencil not found, trying to click on title directly...');
        const titleHeader = page.locator('h1, h2, [class*="header"]').filter({ hasText: 'New Lead' }).first();
        if (await titleHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
          await titleHeader.dblclick();
          await page.waitForTimeout(1000);
        }
      }

      await screenshot(page, 'v3-06-after-pencil-click');

      // ===== ENTER NEW NAME =====
      console.log('📍 Step 7: Entering new pipeline name...');

      // Find the input field that appeared
      const inputs = await page.$$('input:visible');
      console.log(`   Found ${inputs.length} visible inputs`);

      for (const input of inputs) {
        const value = await input.inputValue().catch(() => '');
        const placeholder = await input.getAttribute('placeholder').catch(() => '');
        console.log(`   Input: value="${value}", placeholder="${placeholder}"`);

        // Look for input with "New Lead" value or pipeline-related placeholder
        if (value.toLowerCase().includes('new lead') || value === '' || placeholder.toLowerCase().includes('name')) {
          console.log('   → Found name input!');
          await input.click();
          await input.press('Control+a');
          await input.type('Mortgage Sales Pipeline');
          await page.waitForTimeout(500);

          // Try to save
          await input.press('Enter');
          await page.waitForTimeout(1000);

          // Look for Save button if Enter didn't work
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Done"), button[type="submit"]').first();
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   Clicking Save button...');
            await saveBtn.click();
            await page.waitForTimeout(2000);
          }

          console.log('   ✅ Name entered!');
          break;
        }
      }

      await screenshot(page, 'v3-07-name-entered');

    } else {
      // Check if already renamed
      const mortgagePipeline = page.locator('text=Mortgage Sales Pipeline').first();
      if (await mortgagePipeline.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   ✅ Pipeline already named "Mortgage Sales Pipeline"!');
      } else {
        console.log('   ⚠️ Could not find "New Lead" pipeline');
        await screenshot(page, 'v3-pipeline-not-found');
      }
    }

    // ===== VERIFY RESULT =====
    console.log('\n📍 Step 8: Verifying result...');

    // Go back to pipelines list
    const backArrow = page.locator('text=←, [class*="back"]').first();
    if (await backArrow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backArrow.click();
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v3-08-final-result');

    // Check if rename was successful
    const finalCheck = page.locator('text=Mortgage Sales Pipeline');
    if (await finalCheck.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n✅ SUCCESS! Pipeline renamed to "Mortgage Sales Pipeline"!');
    } else {
      console.log('\n⚠️ Could not verify rename. Check screenshots.');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Done! Browser staying open for 45 seconds...\n');

    await page.waitForTimeout(45000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v3-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
