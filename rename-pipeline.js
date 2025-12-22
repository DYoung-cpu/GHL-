const { chromium } = require('playwright');

// Script to rename the existing "New Lead" pipeline to "Mortgage Sales Pipeline"

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔄 GHL Pipeline Renamer');
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
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForTimeout(2000);

    await page.getByText('Opportunities & Pipelines').click();
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

    await screenshot(page, 'rename-01-pipelines-page');
    console.log('✅ On Pipelines page!\n');

    // ===== FIND AND CLICK ON THE PIPELINE =====
    console.log('📍 Looking for pipeline to rename...');

    // First click on the pipeline name to enter edit view
    const pipelineLink = page.locator('text=New Lead').first();
    if (await pipelineLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found "New Lead" pipeline, clicking to open...');
      await pipelineLink.click();
      await page.waitForTimeout(3000);

      await screenshot(page, 'rename-02-pipeline-opened');

      // Now we're in the pipeline detail view
      // Look for the pencil icon next to "New Lead" title
      // The header shows: "← New Lead ✏️"
      const pencilIcon = page.locator('svg[class*="pencil"], [class*="edit-icon"], h1 svg, h2 svg, [class*="title"] svg').first();

      if (await pencilIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found pencil icon, clicking to edit name...');
        await pencilIcon.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'rename-03-edit-mode');
      } else {
        // Try clicking directly on the title text
        console.log('   Pencil not found, trying to click title directly...');
        const titleText = page.locator('h1:has-text("New Lead"), h2:has-text("New Lead"), [class*="title"]:has-text("New Lead")').first();
        if (await titleText.isVisible()) {
          await titleText.click();
          await page.waitForTimeout(1000);
        }
      }

      // Now there should be an input field for the name
      // It might be inline editing
      const nameInput = page.locator('input:visible').first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found name input, entering new name...');
        await nameInput.click();
        await nameInput.press('Control+a');
        await nameInput.type('Mortgage Sales Pipeline');
        await page.waitForTimeout(500);

        // Press Enter to save inline edit, or look for Save button
        await nameInput.press('Enter');
        await page.waitForTimeout(1000);

        // Also try clicking a Save button if it exists
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Done")').first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
        }

        console.log('   ✅ Pipeline renamed!');
        await screenshot(page, 'rename-04-renamed');
      } else {
        console.log('   ⚠️ Name input not found after clicking edit');
      }

    } else {
      // Check if it's already renamed
      const mortgagePipeline = page.locator('text=Mortgage Sales Pipeline').first();
      if (await mortgagePipeline.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   ✅ Pipeline already named "Mortgage Sales Pipeline"!');
      } else {
        console.log('   ⚠️ Pipeline not found');
      }
    }

    await screenshot(page, 'rename-05-final');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Done! Check the screenshots.');
    console.log('   Browser staying open for 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'rename-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
