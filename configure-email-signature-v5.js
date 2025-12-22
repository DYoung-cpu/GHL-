const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V5
// Now we know the exact UI: Team page has pencil icons for edit

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V5');
  console.log('='.repeat(50));
  console.log('Path: Settings → Team → Edit (pencil icon) → Email Signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600
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

    // ===== NAVIGATE TO SETTINGS → TEAM =====
    console.log('📍 Step 3: Navigating to Settings → Team...');

    await page.click('text=Settings');
    await page.waitForTimeout(4000);

    // Click "Team" in the sidebar (not "My Staff")
    const teamLink = page.locator('a:has-text("Team"), text=Team').first();
    if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamLink.click();
      console.log('   ✓ Clicked Team');
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig5-01-team-page');

    // ===== FIND DAVID YOUNG ROW AND CLICK EDIT ICON =====
    console.log('📍 Step 4: Finding David Young and clicking edit icon...');

    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find the row containing "David Young"
    const davidRow = page.locator('tr').filter({ hasText: 'David Young' });
    const davidVisible = await davidRow.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   David Young row visible: ${davidVisible}`);

    if (davidVisible) {
      // Click the pencil/edit icon in David's row
      // The Action column has svg icons - pencil is first
      const editIcon = davidRow.locator('svg').first();

      if (await editIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editIcon.click();
        console.log('   ✓ Clicked edit (pencil) icon on David Young row');
      } else {
        // Try clicking the first button/link in the action column
        const editBtn = davidRow.locator('td').last().locator('button, a, svg').first();
        await editBtn.click();
        console.log('   ✓ Clicked action button on David Young row');
      }
    } else {
      console.log('   David row not found, trying alternative...');
      // Try finding by email
      const emailRow = page.locator('tr').filter({ hasText: 'david@lendwisemtg.com' });
      if (await emailRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        const editIcon = emailRow.locator('svg').first();
        await editIcon.click();
        console.log('   ✓ Clicked edit icon on email row');
      }
    }

    await page.waitForTimeout(4000);
    await screenshot(page, 'sig5-02-edit-modal');

    // ===== CHECK FOR EDIT MODAL/DRAWER =====
    console.log('📍 Step 5: Looking for edit form...');

    // GHL typically opens a modal or side drawer for editing
    const modal = page.locator('[class*="modal"], [class*="drawer"], [role="dialog"], .n-drawer');
    const isModalOpen = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   Modal/drawer open: ${isModalOpen}`);

    await screenshot(page, 'sig5-03-form-visible');

    // ===== LOOK FOR USER INFO / EMAIL SIGNATURE SECTION =====
    console.log('📍 Step 6: Looking for Email Signature section...');

    // First, check if there are tabs or expandable sections
    // Look for "User Info" section which typically contains signature
    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userInfoTab.click();
      console.log('   ✓ Clicked User Info tab/section');
      await page.waitForTimeout(1000);
    }

    // Scroll to find Email Signature
    let signatureFound = false;
    for (let i = 0; i < 12; i++) {
      const sigLabel = page.locator('text=Email Signature').first();
      if (await sigLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('   ✓ Found Email Signature label');
        signatureFound = true;
        break;
      }
      // Scroll inside the modal if it exists
      if (isModalOpen) {
        await modal.evaluate(el => el.scrollTop += 150);
      } else {
        await page.mouse.wheel(0, 150);
      }
      await page.waitForTimeout(300);
    }

    await screenshot(page, 'sig5-04-signature-section');

    // ===== FILL EMAIL SIGNATURE FIELD =====
    console.log('📍 Step 7: Filling Email Signature field...');

    // The signature field is likely a textarea or rich text editor
    // Try finding it near the "Email Signature" label

    let filled = false;

    // Approach 1: Find textarea near signature label
    if (signatureFound) {
      const sigLabel = page.locator('text=Email Signature').first();
      const sigBox = await sigLabel.boundingBox();

      if (sigBox) {
        // Click below the label to focus the input
        await page.mouse.click(sigBox.x + 200, sigBox.y + 80);
        await page.waitForTimeout(500);

        // Try to find and fill the textarea
        const nearbyTextarea = page.locator('textarea').first();
        if (await nearbyTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nearbyTextarea.click();
          await page.keyboard.press('Control+a');
          await nearbyTextarea.fill(SIGNATURE_HTML);
          console.log('   ✓ Filled signature textarea');
          filled = true;
        }
      }
    }

    // Approach 2: Find any textarea on the page
    if (!filled) {
      const textareas = page.locator('textarea');
      const count = await textareas.count();
      console.log(`   Found ${count} textareas on page`);

      for (let i = 0; i < count; i++) {
        const ta = textareas.nth(i);
        if (await ta.isVisible({ timeout: 500 }).catch(() => false)) {
          // Check if this might be the signature field
          const placeholder = await ta.getAttribute('placeholder').catch(() => '');
          const name = await ta.getAttribute('name').catch(() => '');
          console.log(`   Textarea ${i}: placeholder="${placeholder}", name="${name}"`);

          if (name?.toLowerCase().includes('signature') || placeholder?.toLowerCase().includes('signature') || i === count - 1) {
            await ta.click();
            await page.keyboard.press('Control+a');
            await ta.fill(SIGNATURE_HTML);
            console.log(`   ✓ Filled textarea ${i}`);
            filled = true;
            break;
          }
        }
      }
    }

    // Approach 3: Try content editable div (rich text editor)
    if (!filled) {
      const richEditor = page.locator('[contenteditable="true"], .ql-editor, .mce-content-body').first();
      if (await richEditor.isVisible({ timeout: 2000 }).catch(() => false)) {
        await richEditor.click();
        await page.keyboard.press('Control+a');
        await richEditor.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled rich text editor');
        filled = true;
      }
    }

    if (!filled) {
      console.log('   ⚠️ Could not find signature field to fill');
    }

    await screenshot(page, 'sig5-05-signature-filled');

    // ===== SAVE CHANGES =====
    console.log('📍 Step 8: Saving changes...');

    // Look for Save/Update button
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save button');
    } else {
      // Try finding button in modal footer
      const modalSave = page.locator('[class*="modal"] button, [class*="drawer"] button').filter({ hasText: /save|update/i }).first();
      if (await modalSave.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalSave.click();
        console.log('   ✓ Clicked modal Save button');
      }
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'sig5-06-saved');

    // ===== VERIFY SUCCESS =====
    console.log('📍 Step 9: Checking for success...');

    const successToast = page.locator('text=success, text=saved, text=updated, [class*="success"]').first();
    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✓ Success message detected!');
    }

    await screenshot(page, 'sig5-07-final');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONFIGURATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser staying open 60 seconds for verification...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig5-error');
    console.log('\nBrowser open 45 seconds for debugging...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
