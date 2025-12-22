const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('FIXING SIGNATURE - PROPER INSPECTION');
  console.log('===========================================\n');

  const signatureHtml = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/signature-for-ghl.html', 'utf8');
  console.log('Loaded signature HTML (' + signatureHtml.length + ' chars)\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // ========== LOGIN ==========
    console.log('Step 1: Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }
    console.log('   Logged in!\n');

    // ========== SWITCH SUB-ACCOUNT ==========
    console.log('Step 2: Switching to Lendwise...');
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
    console.log('   In sub-account!\n');

    // ========== GO DIRECTLY TO MY STAFF ==========
    console.log('Step 3: Going to My Staff settings...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/settings/my-staff', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/my-staff-direct.png' });
    console.log('   On My Staff page!\n');

    // ========== CLICK EDIT ON DAVID YOUNG ==========
    console.log('Step 4: Opening David Young profile...');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Find David Young's row by email and click the edit pencil
    const davidEmail = page.locator('text=david@lendwisemtg.com').first();
    if (await davidEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
      const emailBox = await davidEmail.boundingBox();
      if (emailBox) {
        // Click the pencil icon in the Action column (rightmost)
        await page.mouse.click(1175, emailBox.y + emailBox.height / 2);
        console.log('   Clicked edit icon');
      }
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/edit-modal-fix.png' });

    // ========== NAVIGATE TO USER INFO TAB ==========
    console.log('\nStep 5: Going to User Info section...');

    // Click on "User Info" tab
    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInfoTab.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked User Info tab');
    }

    // Dump the modal HTML for analysis
    const modalHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-user-info-modal.html', modalHtml);
    console.log('   Saved modal HTML to debug-user-info-modal.html');

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/user-info-section.png' });

    // ========== SCROLL DOWN TO FIND SIGNATURE ==========
    console.log('\nStep 6: Finding signature section...');

    // Scroll the modal content down
    await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .modal-content, .drawer-content, .n-drawer-body-content-wrapper');
      modals.forEach(modal => {
        if (modal.scrollHeight > modal.clientHeight) {
          modal.scrollTop = modal.scrollHeight;
        }
      });
      // Also try scrolling the main scrollable area
      const scrollable = document.querySelector('.overflow-auto, .overflow-y-auto, [style*="overflow"]');
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    });
    await page.waitForTimeout(1000);

    // Look for signature-related text
    const signatureText = page.locator('text=Enable signature').first();
    if (await signatureText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signatureText.scrollIntoViewIfNeeded();
      console.log('   Found "Enable signature" text');
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-area.png' });

    // ========== FIND AND ANALYZE THE TOGGLE ==========
    console.log('\nStep 7: Analyzing signature toggle...');

    // Get all toggle/switch elements
    const toggles = await page.evaluate(() => {
      const switches = document.querySelectorAll('[role="switch"], input[type="checkbox"], .n-switch');
      return Array.from(switches).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        type: el.type,
        checked: el.checked,
        ariaChecked: el.getAttribute('aria-checked'),
        className: el.className,
        id: el.id,
        nearText: el.parentElement?.innerText?.substring(0, 50) || ''
      }));
    });

    console.log('   Found ' + toggles.length + ' toggle elements:');
    toggles.forEach(t => {
      console.log('     [' + t.index + '] ' + t.tagName + ' checked=' + (t.checked || t.ariaChecked) + ' near: "' + t.nearText.substring(0, 30) + '"');
    });

    // ========== FIND THE SIGNATURE TOGGLE SPECIFICALLY ==========
    console.log('\nStep 8: Finding and enabling signature toggle...');

    // Look for toggle near "Enable signature on all outgoing messages"
    const enableSigContainer = await page.evaluate(() => {
      const labels = document.querySelectorAll('label, span, div');
      for (const label of labels) {
        if (label.innerText && label.innerText.includes('Enable signature')) {
          // Find nearby switch
          const parent = label.closest('div');
          const toggle = parent?.querySelector('[role="switch"], input[type="checkbox"], .n-switch');
          if (toggle) {
            return {
              found: true,
              isEnabled: toggle.checked || toggle.getAttribute('aria-checked') === 'true',
              toggleSelector: toggle.className ? '.' + toggle.className.split(' ')[0] : toggle.tagName
            };
          }
        }
      }
      return { found: false };
    });

    console.log('   Signature toggle found: ' + enableSigContainer.found);
    if (enableSigContainer.found) {
      console.log('   Currently enabled: ' + enableSigContainer.isEnabled);
    }

    // Click on the toggle to enable it
    const sigToggle = page.locator('text=Enable signature on all outgoing messages').locator('..').locator('[role="switch"], input[type="checkbox"], .n-switch').first();

    if (await sigToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isChecked = await sigToggle.getAttribute('aria-checked') === 'true' || await sigToggle.isChecked().catch(() => false);
      console.log('   Toggle visible, currently: ' + (isChecked ? 'ON' : 'OFF'));

      if (!isChecked) {
        await sigToggle.click();
        console.log('   CLICKED TOGGLE - NOW ON');
        await page.waitForTimeout(1000);
      }
    } else {
      // Try clicking on the label/text itself
      const sigLabel = page.locator('text=Enable signature on all outgoing messages').first();
      if (await sigLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click on the row containing this text
        await sigLabel.click();
        console.log('   Clicked signature label');
        await page.waitForTimeout(500);

        // Try clicking further right (where toggle usually is)
        const labelBox = await sigLabel.boundingBox();
        if (labelBox) {
          await page.mouse.click(labelBox.x + 400, labelBox.y + labelBox.height / 2);
          console.log('   Clicked to the right of label (toggle area)');
        }
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/toggle-clicked.png' });

    // ========== CHECK SIGNATURE CONTENT ==========
    console.log('\nStep 9: Checking signature content...');

    // Look for signature editor
    const signatureLabel = page.locator('label:has-text("Signature"), text=Signature').last();
    if (await signatureLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signatureLabel.scrollIntoViewIfNeeded();
    }

    // Find the editor content
    const editorContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.tiptap, .ProseMirror, [contenteditable="true"]');
      for (const ed of editors) {
        if (ed.innerHTML && ed.innerHTML.length > 50) {
          return { found: true, length: ed.innerHTML.length, preview: ed.innerText.substring(0, 100) };
        }
      }
      return { found: false };
    });

    console.log('   Signature editor content found: ' + editorContent.found);
    if (editorContent.found) {
      console.log('   Content length: ' + editorContent.length + ' chars');
      console.log('   Preview: "' + editorContent.preview + '"');
    }

    // ========== PASTE SIGNATURE IF EMPTY ==========
    if (!editorContent.found || editorContent.length < 100) {
      console.log('\nStep 10: Pasting signature HTML...');

      // Find and click source code button
      const sourceButtons = await page.$$('button');
      for (const btn of sourceButtons) {
        const text = await btn.innerText().catch(() => '');
        const hasCodeIcon = await btn.$('svg').catch(() => null);
        if (text.includes('</>') || text.includes('Source') || hasCodeIcon) {
          await btn.click();
          console.log('   Clicked source/code button');
          await page.waitForTimeout(1000);
          break;
        }
      }

      // Or try clicking by aria-label or title
      const codeBtn = page.locator('[aria-label*="source" i], [title*="source" i], button:has-text("</>")').first();
      if (await codeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await codeBtn.click();
        console.log('   Clicked source code button via aria-label');
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/source-code-modal.png' });

      // Find textarea and paste
      const textarea = page.locator('textarea').last();
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textarea.click();
        await textarea.press('Control+a');
        await textarea.fill(signatureHtml);
        console.log('   Pasted signature HTML into textarea');
        await page.waitForTimeout(500);

        // Click Save in source modal
        const saveSource = page.locator('button:has-text("Save")').first();
        if (await saveSource.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveSource.click();
          console.log('   Clicked Save on source modal');
          await page.waitForTimeout(1000);
        }
      }
    } else {
      console.log('\nStep 10: Signature content already present, skipping paste');
    }

    // ========== SAVE THE PROFILE ==========
    console.log('\nStep 11: Saving profile...');

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/before-save.png' });

    // Click Next/Save button
    const saveBtn = page.locator('button:has-text("Next"), button:has-text("Save")').last();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   Clicked Save/Next');
      await page.waitForTimeout(3000);
    }

    // Continue clicking Next if there are more steps
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button:has-text("Next")').last();
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        console.log('   Clicked Next (step ' + (i + 1) + ')');
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/profile-saved-fix.png' });
    console.log('   Profile saved!\n');

    // ========== SEND TEST EMAIL ==========
    console.log('===========================================');
    console.log('Step 12: SENDING TEST EMAIL');
    console.log('===========================================\n');

    // Go to contacts
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);

    // Click on first contact
    const contactLink = page.locator('tbody tr').first();
    if (await contactLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactLink.click();
      await page.waitForTimeout(3000);
    }

    // Type in email body
    const body = page.locator('[contenteditable="true"]').first();
    if (await body.isVisible({ timeout: 3000 }).catch(() => false)) {
      await body.click();
      await body.type('Test email after signature fix - signature should appear below.');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-with-sig-test.png' });

    // Send
    const sendBtn2 = page.locator('button:has-text("Send")').first();
    if (await sendBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn2.click();
      console.log('   EMAIL SENT!\n');
    }

    await page.waitForTimeout(3000);

    console.log('===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('Browser stays open for 3 minutes.');
    console.log('===========================================\n');

    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/fix-error.png' });

    const errorHtml = await page.content().catch(() => '');
    if (errorHtml) {
      fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-error.html', errorHtml);
    }

    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
