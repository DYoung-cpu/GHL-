const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('ENABLING SIGNATURE TOGGLE & SENDING TEST');
  console.log('===========================================\n');

  // Read the correct signature HTML
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

    // ========== SETTINGS -> MY STAFF ==========
    console.log('Step 3: Going to Settings -> My Staff...');
    await page.click('text=Settings');
    await page.waitForTimeout(2000);

    // Click My Staff in settings sidebar
    const myStaff = page.locator('a:has-text("My Staff"), [href*="my-staff"]').first();
    await myStaff.click();
    await page.waitForTimeout(3000);
    console.log('   On My Staff page!\n');

    // ========== EDIT DAVID YOUNG ==========
    console.log('Step 4: Opening David Young edit modal...');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/my-staff-page.png' });

    // The page uses a table structure - David Young's email is unique identifier
    // Click directly on david@lendwisemtg.com to find that row, then locate edit icon

    // First, let's use the email as unique identifier
    const davidEmail = page.locator('text=david@lendwisemtg.com').first();

    if (await davidEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found David Young row via email');

      // The edit icon is a pencil SVG in the same row - use relative positioning
      // Get bounding box of email to find row position
      const emailBox = await davidEmail.boundingBox();

      if (emailBox) {
        // Edit icon is in Action column, roughly x=1175 based on screenshot
        // Same y position as the email
        const editY = emailBox.y + emailBox.height / 2;
        console.log('   Clicking edit icon at coordinates (1175, ' + editY + ')');
        await page.mouse.click(1175, editY);
      }
    } else {
      // Fallback: use fixed coordinates from screenshot
      // David Young row is second row, edit icon at approximately (1175, 356)
      console.log('   Using fixed coordinates for edit icon...');
      await page.mouse.click(1175, 356);
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/edit-modal-opened.png' });
    console.log('   Edit modal opened!\n');

    // ========== EXPAND USER INFO ==========
    console.log('Step 5: Expanding User Info section...');

    // Click on User Info to expand it
    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInfoTab.click();
      await page.waitForTimeout(1500);
    }
    console.log('   User Info expanded!\n');

    // ========== SCROLL DOWN TO SIGNATURE ==========
    console.log('Step 6: Scrolling to signature section...');

    // Scroll within the modal to find signature section
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') ||
                   document.querySelector('.modal-content') ||
                   document.querySelector('.drawer-content');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(1000);

    // Look for "Enable signature" text and scroll to it
    const enableSignatureLabel = page.locator('text=Enable signature on all outgoing messages').first();
    if (await enableSignatureLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableSignatureLabel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-section.png' });
    console.log('   Found signature section!\n');

    // ========== ENABLE THE TOGGLE ==========
    console.log('Step 7: ENABLING THE SIGNATURE TOGGLE...');

    // Find the toggle switch near "Enable signature on all outgoing messages"
    // GHL uses switch/toggle components - look for various selectors
    const toggleSelectors = [
      'input[type="checkbox"]:near(:text("Enable signature"))',
      '[role="switch"]:near(:text("Enable signature"))',
      'label:has-text("Enable signature") input',
      'label:has-text("Enable signature") [role="switch"]',
      '.switch:near(:text("Enable signature"))',
      'button[role="switch"]'
    ];

    let toggleClicked = false;

    // Try to find the toggle by looking at the container with "Enable signature" text
    const enableContainer = page.locator('div:has-text("Enable signature on all outgoing")').filter({ hasText: 'Enable signature' }).first();

    if (await enableContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Look for switch/checkbox within or near this container
      const switches = enableContainer.locator('[role="switch"], input[type="checkbox"], .switch');
      const switchCount = await switches.count();

      if (switchCount > 0) {
        const toggle = switches.first();

        // Check if already enabled
        const isChecked = await toggle.getAttribute('aria-checked') === 'true' ||
                         await toggle.isChecked().catch(() => false);

        if (!isChecked) {
          await toggle.click();
          console.log('   CLICKED TOGGLE - NOW ENABLED!');
          toggleClicked = true;
        } else {
          console.log('   Toggle already enabled!');
          toggleClicked = true;
        }
      }
    }

    // Fallback: click on the label text itself (some UIs toggle on label click)
    if (!toggleClicked) {
      console.log('   Trying fallback - clicking label...');
      const labelClick = page.locator('label:has-text("Enable signature"), span:has-text("Enable signature on all outgoing")').first();
      if (await labelClick.isVisible({ timeout: 2000 }).catch(() => false)) {
        await labelClick.click();
        console.log('   Clicked label to toggle!');
        toggleClicked = true;
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/toggle-enabled.png' });

    // ========== VERIFY SIGNATURE HTML EXISTS ==========
    console.log('\nStep 8: Checking if signature HTML is present...');

    // Look for the signature editor area
    const signatureArea = page.locator('text=Signature').first();
    if (await signatureArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signatureArea.scrollIntoViewIfNeeded();
    }

    // Check if there's content in the editor
    const editorContent = page.locator('.tiptap, [contenteditable="true"], .ProseMirror').last();
    const hasContent = await editorContent.textContent().catch(() => '');

    if (hasContent && hasContent.length > 100) {
      console.log('   Signature HTML already present (' + hasContent.length + ' chars)');
    } else {
      console.log('   Signature may need to be pasted - will paste now...');

      // Find and click source code button
      const sourceBtn = page.locator('button:has(svg), [title*="ource"], button >> text=</>').first();
      if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sourceBtn.click();
        await page.waitForTimeout(1000);

        // Paste HTML in textarea
        const textarea = page.locator('textarea').last();
        if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await textarea.fill(signatureHtml);
          console.log('   Pasted signature HTML');

          // Save source code
          const saveSourceBtn = page.locator('button:has-text("Save")').first();
          if (await saveSourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveSourceBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    // ========== SAVE THE PROFILE ==========
    console.log('\nStep 9: Saving user profile...');

    // Click Next button to save
    const nextBtn = page.locator('button:has-text("Next")').last();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked Next - profile saving...');
    }

    // May need to click through additional steps
    const nextBtn2 = page.locator('button:has-text("Next")').last();
    if (await nextBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn2.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/profile-saved.png' });
    console.log('   Profile saved!\n');

    // ========== SEND TEST EMAIL ==========
    console.log('===========================================');
    console.log('Step 10: SENDING TEST EMAIL');
    console.log('===========================================\n');

    // Navigate to Contacts
    await page.click('text=Contacts');
    await page.waitForTimeout(3000);

    // Search for test contact
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('david@lendwisemtg.com');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Click on contact
    const contactRow = page.locator('tr:has-text("david@lendwisemtg.com"), [data-testid="contact-row"]').first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactRow.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/contact-opened.png' });

    // Click Email tab or compose
    const emailTab = page.locator('[data-testid="email"], text=Email >> visible=true').first();
    if (await emailTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailTab.click();
      await page.waitForTimeout(2000);
    }

    // Fill subject
    const subjectInput = page.locator('input[placeholder*="ubject" i], input[name="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.fill('Signature Test - ' + new Date().toLocaleTimeString());
    }

    // Fill body
    const bodyEditor = page.locator('[contenteditable="true"]').first();
    if (await bodyEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyEditor.click();
      await bodyEditor.type('Testing email signature - this message should include the full signature with logo, contact info, and disclosures.');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-ready-to-send.png' });
    console.log('   Screenshot: email-ready-to-send.png');
    console.log('   Check if signature appears in the email preview!\n');

    // Send the email
    console.log('Sending email...');
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   EMAIL SENT!\n');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-sent-final.png' });

    console.log('===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('===========================================');
    console.log('Browser stays open for 2 minutes for verification.\n');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/enable-toggle-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
