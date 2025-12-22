const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V10
// EXACT UI: Edit User → User Info tab → Scroll to Signature → Rich text editor

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V10');
  console.log('='.repeat(50));
  console.log('EXACT UI path based on user screenshot\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    // ===== LOGIN =====
    console.log('📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   ✓ Clicked Google sign-in');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    await page.waitForSelector('text=LENDWISE', { timeout: 30000 }).catch(() => null);
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Step 2: Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
      }
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO SETTINGS → MY STAFF =====
    console.log('📍 Step 3: Going to Settings → My Staff...');
    await page.click('text=Settings');
    await page.waitForTimeout(4000);
    await page.click('text=My Staff');
    await page.waitForTimeout(6000);
    await screenshot(page, 'sig10-01-my-staff');

    // ===== CLICK DAVID'S EDIT PENCIL =====
    console.log('📍 Step 4: Clicking edit pencil on David Young...');

    // Find David's email and get its position
    const davidEmail = page.locator('text=david@lendwisemtg.com').first();
    const emailBox = await davidEmail.boundingBox();

    if (emailBox) {
      console.log(`   David's row at y=${emailBox.y}`);
      // Pencil icon is at x≈1175 on the same row
      await page.mouse.click(1175, emailBox.y + 10);
      console.log('   ✓ Clicked pencil icon');
    } else {
      console.log('   Email not found, trying fixed coordinates...');
      await page.mouse.click(1175, 356);
    }

    await page.waitForTimeout(5000);
    await screenshot(page, 'sig10-02-edit-form');

    // ===== CHECK FOR "Edit or manage your team" PAGE =====
    console.log('📍 Step 5: Checking for edit form...');

    // The form should show "Edit or manage your team" header
    const editHeader = page.locator('text=Edit or manage your team');
    const headerVisible = await editHeader.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   "Edit or manage your team" visible: ${headerVisible}`);

    // Check for User Info tab
    const userInfoTab = page.locator('text=User Info').first();
    const userInfoVisible = await userInfoTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`   "User Info" tab visible: ${userInfoVisible}`);

    if (userInfoVisible) {
      // Click User Info tab to ensure we're on it
      await userInfoTab.click();
      console.log('   ✓ Clicked User Info tab');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'sig10-03-user-info-tab');

    // ===== SCROLL TO SIGNATURE SECTION =====
    console.log('📍 Step 6: Scrolling to Signature section...');

    // The Signature section is below Calendar, need to scroll
    let foundSignature = false;

    for (let i = 0; i < 20; i++) {
      const sigSection = page.locator('text=Signature').first();
      if (await sigSection.isVisible({ timeout: 300 }).catch(() => false)) {
        console.log('   ✓ Found Signature section');
        foundSignature = true;

        // Scroll the signature section into view
        await sigSection.scrollIntoViewIfNeeded();
        break;
      }

      // Scroll down in the form area (right side panel)
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(200);
    }

    await screenshot(page, 'sig10-04-signature-section');

    // ===== ENABLE SIGNATURE TOGGLE =====
    console.log('📍 Step 7: Enabling signature toggle...');

    const toggleLabel = page.locator('text=Enable signature on all outgoing messages');
    if (await toggleLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find the toggle switch near this label
      // The toggle is usually a button or div with role="switch"
      const toggle = page.locator('[role="switch"], .n-switch, input[type="checkbox"]').first();

      if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check if it's already enabled
        const isChecked = await toggle.getAttribute('aria-checked').catch(() => null);
        console.log(`   Toggle aria-checked: ${isChecked}`);

        if (isChecked !== 'true') {
          await toggle.click({ force: true });
          console.log('   ✓ Enabled signature toggle');
        } else {
          console.log('   ✓ Toggle already enabled');
        }
      } else {
        // Try clicking the label area
        const labelBox = await toggleLabel.boundingBox();
        if (labelBox) {
          // Toggle is usually to the left of the label
          await page.mouse.click(labelBox.x - 30, labelBox.y + 10);
          console.log('   ✓ Clicked toggle area');
        }
      }
    }

    await page.waitForTimeout(1000);
    await screenshot(page, 'sig10-05-toggle-enabled');

    // ===== FIND AND FILL RICH TEXT EDITOR =====
    console.log('📍 Step 8: Filling signature in rich text editor...');

    // The editor has placeholder "Create your email signature"
    // It's likely a Quill editor (.ql-editor) or similar

    // Method 1: Find by placeholder text and click
    const editorPlaceholder = page.locator('text=Create your email signature');
    if (await editorPlaceholder.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editorPlaceholder.click();
      console.log('   ✓ Clicked editor placeholder');
      await page.waitForTimeout(500);
    }

    // Method 2: Find .ql-editor (Quill)
    const qlEditor = page.locator('.ql-editor');
    if (await qlEditor.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qlEditor.click();
      await page.keyboard.press('Control+a');
      await qlEditor.fill(SIGNATURE_HTML);
      console.log('   ✓ Filled Quill editor');
    } else {
      // Method 3: Find contenteditable div
      const contentEditable = page.locator('[contenteditable="true"]').first();
      if (await contentEditable.isVisible({ timeout: 2000 }).catch(() => false)) {
        await contentEditable.click();
        await page.keyboard.press('Control+a');
        await contentEditable.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled contenteditable');
      } else {
        // Method 4: Use the HTML/code button </>
        console.log('   Looking for HTML/code button...');
        const codeBtn = page.locator('button:has-text("</>"), [title*="HTML"], [title*="Source"]');
        if (await codeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await codeBtn.click();
          console.log('   ✓ Clicked HTML button');
          await page.waitForTimeout(500);

          // Now should have a textarea for HTML
          const htmlTextarea = page.locator('textarea').first();
          if (await htmlTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
            await htmlTextarea.fill(SIGNATURE_HTML);
            console.log('   ✓ Filled HTML textarea');
          }
        }
      }
    }

    await screenshot(page, 'sig10-06-signature-filled');

    // ===== CLICK NEXT/SAVE =====
    console.log('📍 Step 9: Saving...');

    // The form has Cancel and Next buttons
    const nextBtn = page.locator('button:has-text("Next")');
    const saveBtn = page.locator('button:has-text("Save")');

    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      console.log('   ✓ Clicked Next');
      await page.waitForTimeout(2000);

      // May need to click through more pages or final Save
      const finalSave = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Finish")');
      if (await finalSave.isVisible({ timeout: 3000 }).catch(() => false)) {
        await finalSave.click();
        console.log('   ✓ Clicked final Save');
      }
    } else if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig10-07-saved');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig10-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
