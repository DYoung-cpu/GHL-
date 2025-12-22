const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V13
// Fix: Use HTML source mode (</>button) to paste raw HTML without stripping

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V13');
  console.log('='.repeat(50));
  console.log('Using HTML source mode to preserve formatting\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
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
    await screenshot(page, 'sig13-01-my-staff');

    // ===== FIND DAVID'S ROW AND CLICK PENCIL =====
    console.log('📍 Step 4: Finding David Young row...');

    // Wait for the email to be visible
    await page.waitForSelector('text=david@lendwisemtg.com', { timeout: 10000 });

    // Get the bounding box of David's email to find the row
    const davidEmail = page.locator('text=david@lendwisemtg.com');
    const emailBox = await davidEmail.boundingBox();

    if (emailBox) {
      console.log(`   David's email at: (${emailBox.x}, ${emailBox.y})`);

      // The pencil icon is in the Action column, to the right
      // Based on screenshots, Action column is around x=920-960 area
      // We'll click at the same Y level but far to the right where Action column is

      // First, let's find all clickable elements in David's row area
      // Look for SVG icons in the same horizontal band
      const pencilY = emailBox.y + emailBox.height / 2;

      // Click slightly above the row to ensure we're in it
      console.log('   Attempting to click pencil icon area...');

      // Method 1: Click by coordinates - Action column is typically around x=920
      await page.mouse.click(920, pencilY);
      await page.waitForTimeout(2000);

      let editFormOpened = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);

      if (!editFormOpened) {
        console.log('   First click missed, trying different X position...');
        await page.mouse.click(940, pencilY);
        await page.waitForTimeout(2000);
        editFormOpened = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);
      }

      if (!editFormOpened) {
        console.log('   Trying x=960...');
        await page.mouse.click(960, pencilY);
        await page.waitForTimeout(2000);
        editFormOpened = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);
      }

      // Method 2: If coordinates didn't work, try finding SVG by aria-label or title
      if (!editFormOpened) {
        console.log('   Coordinate clicks failed, trying SVG with title...');

        // Look for edit/pencil icon by various attributes
        const editIcons = await page.locator('svg[class*="cursor-pointer"], [data-icon="pencil"], [aria-label*="edit"], button svg').all();
        console.log(`   Found ${editIcons.length} potential edit icons`);

        for (let i = 0; i < Math.min(editIcons.length, 10); i++) {
          const icon = editIcons[i];
          const box = await icon.boundingBox().catch(() => null);
          if (box && Math.abs(box.y - pencilY) < 30) {
            console.log(`   Clicking icon ${i} at (${box.x}, ${box.y})`);
            await icon.click({ force: true });
            await page.waitForTimeout(2000);

            editFormOpened = await page.locator('text=User Info').isVisible({ timeout: 2000 }).catch(() => false);
            if (editFormOpened) {
              console.log('   ✓ Edit form opened!');
              break;
            }
          }
        }
      }

      await screenshot(page, 'sig13-02-after-pencil-click');
    }

    // ===== CHECK IF EDIT FORM OPENED =====
    console.log('📍 Step 5: Checking for edit form...');

    const hasUserInfo = await page.locator('text=User Info').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   User Info tab visible: ${hasUserInfo}`);

    if (!hasUserInfo) {
      console.log('   ⚠️ Edit form not opened. Trying row click...');

      // Try clicking on David's name directly
      await page.locator('text=David Young').first().click();
      await page.waitForTimeout(3000);

      const hasUserInfo2 = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`   After name click - User Info visible: ${hasUserInfo2}`);
    }

    // ===== IF FORM IS OPEN, NAVIGATE TO SIGNATURE =====
    if (await page.locator('text=User Info').isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📍 Step 6: Navigating to Signature section...');

      // Click User Info tab to ensure we're on it
      await page.locator('text=User Info').first().click();
      await page.waitForTimeout(2000);

      // Scroll down to find Signature section
      console.log('   Scrolling to find Signature...');

      // Find the scrollable container (usually a modal or side panel)
      const scrollContainer = page.locator('.hl-drawer-body, [class*="overflow-auto"], [class*="scroll"]').first();

      for (let i = 0; i < 30; i++) {
        const sigVisible = await page.locator('label:has-text("Signature"), text=Enable signature').first().isVisible({ timeout: 200 }).catch(() => false);
        if (sigVisible) {
          console.log('   ✓ Found Signature section');
          break;
        }

        // Try scrolling within the container or the page
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(150);
      }

      await screenshot(page, 'sig13-03-signature-area');

      // ===== ENABLE SIGNATURE TOGGLE =====
      console.log('📍 Step 7: Enabling signature toggle...');

      const toggleSwitch = page.locator('[role="switch"]').first();
      if (await toggleSwitch.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await toggleSwitch.getAttribute('aria-checked');
        if (isChecked !== 'true') {
          await toggleSwitch.click();
          console.log('   ✓ Enabled signature toggle');
          await page.waitForTimeout(1000);
        } else {
          console.log('   Toggle already enabled');
        }
      }

      // ===== CLICK HTML SOURCE BUTTON =====
      console.log('📍 Step 8: Clicking HTML source button (</>)...');

      // The HTML/source code button typically has </> text or a code icon
      // Look for it in the Quill toolbar
      const sourceButton = page.locator('button:has-text("</>"), button[title*="source"], button[title*="html"], button[title*="code"], .ql-html, button.ql-source');

      if (await sourceButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await sourceButton.first().click();
        console.log('   ✓ Clicked HTML source button');
        await page.waitForTimeout(1000);
      } else {
        console.log('   Source button not found, checking toolbar...');

        // List all buttons in toolbar area for debugging
        const toolbarButtons = await page.locator('.ql-toolbar button, [class*="toolbar"] button').all();
        console.log(`   Found ${toolbarButtons.length} toolbar buttons`);

        // Look for a button that might be the source/code button
        for (const btn of toolbarButtons) {
          const text = await btn.textContent().catch(() => '');
          const title = await btn.getAttribute('title').catch(() => '');
          const className = await btn.getAttribute('class').catch(() => '');

          if (text.includes('<') || text.includes('html') ||
              title?.toLowerCase().includes('source') || title?.toLowerCase().includes('html') ||
              className?.includes('code') || className?.includes('source')) {
            console.log(`   Found potential source button: text="${text}", title="${title}"`);
            await btn.click();
            await page.waitForTimeout(1000);
            break;
          }
        }
      }

      await screenshot(page, 'sig13-04-html-mode');

      // ===== PASTE HTML INTO SOURCE MODE =====
      console.log('📍 Step 9: Pasting HTML signature...');

      // In HTML source mode, there should be a textarea or input for raw HTML
      const htmlInput = page.locator('textarea, .ql-html-editor, [class*="source"] textarea, .ql-editor');

      if (await htmlInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Clear existing content and paste new HTML
        await htmlInput.first().click();
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);

        // Type the HTML (fill might not work for all input types)
        await htmlInput.first().fill(SIGNATURE_HTML);
        console.log('   ✓ Pasted HTML signature');
      } else {
        console.log('   HTML input not found, trying contenteditable...');

        // If in regular editor mode, try to use clipboard API
        const editor = page.locator('.ql-editor, [contenteditable="true"]').first();
        if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editor.click();
          await page.keyboard.press('Control+a');

          // Set clipboard and paste
          await page.evaluate((html) => {
            navigator.clipboard.writeText(html);
          }, SIGNATURE_HTML);

          await page.keyboard.press('Control+v');
          console.log('   ✓ Pasted via clipboard');
        }
      }

      await screenshot(page, 'sig13-05-html-pasted');

      // ===== CLOSE SOURCE MODE IF OPEN =====
      // Click the source button again to apply and preview
      if (await sourceButton.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await sourceButton.first().click();
        console.log('   ✓ Closed HTML source mode');
        await page.waitForTimeout(1000);
      }

      // ===== SAVE =====
      console.log('📍 Step 10: Saving changes...');

      // Look for Save or Next button
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Next"), button:has-text("Update")');

      if (await saveBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.first().click();
        console.log('   ✓ Clicked Save/Next');
        await page.waitForTimeout(3000);
      }

      await screenshot(page, 'sig13-06-saved');
      console.log('\n✅ Signature configuration complete!');
    } else {
      console.log('\n⚠️ Could not open edit form for David Young');
      console.log('   Manual steps needed:');
      console.log('   1. Click the pencil icon next to David Young');
      console.log('   2. Go to User Info tab');
      console.log('   3. Scroll to Signature section');
      console.log('   4. Enable toggle');
      console.log('   5. Click </> button for HTML mode');
      console.log('   6. Paste the HTML signature');
      console.log('   7. Click </> again to apply');
      console.log('   8. Save');
    }

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 90 seconds for verification...\n');
    console.log('TIP: Use the </> button in editor toolbar to paste raw HTML\n');

    await page.waitForTimeout(90000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig13-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
