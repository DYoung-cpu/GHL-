const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('FIX SIGNATURE V2 - With Better Waits');
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
  page.setDefaultTimeout(90000);

  try {
    // ========== LOGIN ==========
    console.log('Step 1: Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Look for Google sign-in button
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }
    await page.waitForTimeout(4000);

    // Handle Google popup
    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(4000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 20000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(12000);
    }
    console.log('   Logged in!\n');

    // ========== SWITCH SUB-ACCOUNT ==========
    console.log('Step 2: Switching to Lendwise...');
    await page.waitForTimeout(3000);
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 8000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(3000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 8000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(8000);
      }
    }
    console.log('   In sub-account!\n');

    // ========== GO TO MY STAFF ==========
    console.log('Step 3: Navigating to My Staff settings...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/settings/my-staff', {
      waitUntil: 'networkidle'
    });

    // Wait for page to actually load by looking for specific content
    console.log('   Waiting for My Staff page to load...');
    await page.waitForSelector('table', { timeout: 30000 }).catch(() => console.log('   No table found'));
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-01-my-staff.png', fullPage: true });
    console.log('   Screenshot saved: v2-01-my-staff.png\n');

    // ========== FIND DAVID YOUNG ROW ==========
    console.log('Step 4: Finding David Young row...');

    // Wait specifically for an element with david's email
    const davidEmailLocator = page.locator('text=david@lendwisemtg.com');
    await davidEmailLocator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
      console.log('   david email not immediately visible, trying alternative...');
    });

    // Get all visible text to understand page structure
    const visibleText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 2000);
    });
    console.log('   Page text preview:\n' + visibleText.substring(0, 500) + '\n...\n');

    // Find and click the edit button for David
    const davidRow = await page.evaluate(() => {
      // Find any element containing david@lendwisemtg.com
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.innerText && el.innerText.includes('david@lendwisemtg.com')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            // Find the parent row
            let parent = el;
            while (parent && parent.tagName !== 'TR' && parent.tagName !== 'BODY') {
              parent = parent.parentElement;
            }
            if (parent && parent.tagName === 'TR') {
              const rowRect = parent.getBoundingClientRect();
              return {
                found: true,
                y: rowRect.y + rowRect.height / 2,
                text: parent.innerText.substring(0, 100)
              };
            }
            return { found: true, y: rect.y + rect.height / 2, text: el.innerText.substring(0, 100) };
          }
        }
      }
      return { found: false };
    });

    console.log('   David row found: ' + davidRow.found);
    if (davidRow.found) {
      console.log('   Row text: ' + davidRow.text.replace(/\n/g, ' | '));
      console.log('   Row Y position: ' + davidRow.y);

      // Click at the right side of the screen (action column) at David's row level
      // GHL typically has edit icons around x=1100-1200 for 1400px viewport
      console.log('   Clicking edit button at (1150, ' + davidRow.y + ')...');
      await page.mouse.click(1150, davidRow.y);
      await page.waitForTimeout(3000);
    } else {
      // Try alternative approach - click directly on the text
      console.log('   Trying to click on David email text...');
      await davidEmailLocator.first().click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-02-after-edit-click.png', fullPage: true });
    console.log('   Screenshot saved: v2-02-after-edit-click.png\n');

    // ========== CHECK IF MODAL/DRAWER OPENED ==========
    console.log('Step 5: Looking for edit modal/drawer...');

    // Check for common drawer/modal indicators
    const modalCheck = await page.evaluate(() => {
      const indicators = [];
      // Look for drawer
      const drawers = document.querySelectorAll('[class*="drawer"], [class*="modal"], [role="dialog"]');
      drawers.forEach(d => {
        const rect = d.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          indicators.push({
            type: 'drawer/modal',
            class: d.className.substring(0, 50),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });
      return indicators;
    });

    console.log('   Modals/Drawers found: ' + modalCheck.length);
    modalCheck.forEach(m => console.log('     - ' + m.type + ': ' + m.class + ' (' + m.width + 'x' + m.height + ')'));

    // ========== NAVIGATE TO USER INFO TAB ==========
    console.log('\nStep 6: Looking for User Info tab...');

    // Look for tabs in the modal
    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found User Info tab, clicking...');
      await userInfoTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('   User Info tab not visible, checking available tabs...');
      const tabs = await page.evaluate(() => {
        const tabElements = document.querySelectorAll('[role="tab"], button, a');
        const results = [];
        tabElements.forEach(t => {
          const text = t.innerText.trim();
          if (text && text.length < 30) {
            results.push(text);
          }
        });
        return [...new Set(results)].slice(0, 15);
      });
      console.log('   Available tabs/buttons: ' + tabs.join(', '));
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-03-user-info.png', fullPage: true });

    // ========== SCROLL TO SIGNATURE SECTION ==========
    console.log('\nStep 7: Scrolling to signature section...');

    // Scroll within any scrollable drawer content
    await page.evaluate(() => {
      const scrollContainers = document.querySelectorAll('[class*="overflow"], [class*="scroll"], [class*="drawer-body"]');
      scrollContainers.forEach(container => {
        container.scrollTop = container.scrollHeight;
      });
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-04-scrolled.png', fullPage: true });

    // ========== FIND SIGNATURE TOGGLE ==========
    console.log('\nStep 8: Looking for signature toggle...');

    // Look for "Enable signature" text and nearby toggle
    const signatureCheck = await page.evaluate(() => {
      const results = {
        enableTextFound: false,
        toggleFound: false,
        toggleState: null,
        signatureEditorFound: false
      };

      // Find "Enable signature" text
      const allText = document.body.innerText;
      if (allText.toLowerCase().includes('enable signature')) {
        results.enableTextFound = true;
      }

      // Find all toggles/switches
      const toggles = document.querySelectorAll('[role="switch"], input[type="checkbox"], [class*="switch"]');
      toggles.forEach(toggle => {
        const parent = toggle.closest('div');
        const nearText = parent?.innerText?.toLowerCase() || '';
        if (nearText.includes('signature') || nearText.includes('enable')) {
          results.toggleFound = true;
          results.toggleState = toggle.checked || toggle.getAttribute('aria-checked');
        }
      });

      // Find signature editor (contenteditable or tiptap)
      const editors = document.querySelectorAll('[contenteditable="true"], .tiptap, .ProseMirror, textarea');
      editors.forEach(ed => {
        const rect = ed.getBoundingClientRect();
        if (rect.x > 700 && rect.height > 100) { // In drawer area and reasonably sized
          results.signatureEditorFound = true;
        }
      });

      return results;
    });

    console.log('   "Enable signature" text found: ' + signatureCheck.enableTextFound);
    console.log('   Signature toggle found: ' + signatureCheck.toggleFound);
    console.log('   Toggle state: ' + signatureCheck.toggleState);
    console.log('   Signature editor found: ' + signatureCheck.signatureEditorFound);

    // ========== ENABLE TOGGLE IF FOUND ==========
    if (signatureCheck.toggleFound) {
      console.log('\nStep 9: Enabling signature toggle...');

      // Click on toggle near "Enable signature"
      await page.evaluate(() => {
        const labels = document.querySelectorAll('label, span, div');
        for (const label of labels) {
          if (label.innerText.toLowerCase().includes('enable signature')) {
            const toggle = label.closest('div')?.querySelector('[role="switch"], input[type="checkbox"]');
            if (toggle) {
              toggle.click();
              return;
            }
          }
        }
      });
      await page.waitForTimeout(1000);
      console.log('   Clicked toggle');
    }

    // ========== PASTE SIGNATURE HTML ==========
    if (signatureCheck.signatureEditorFound || true) {
      console.log('\nStep 10: Looking for source code button...');

      // Find source code button (usually </>)
      const sourceBtn = page.locator('button:has-text("</>"), [aria-label*="source" i], [title*="source" i]').first();
      if (await sourceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sourceBtn.click();
        console.log('   Clicked source code button');
        await page.waitForTimeout(1500);

        // Find textarea and paste HTML
        const textarea = page.locator('textarea').last();
        if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          await textarea.click();
          await textarea.press('Control+a');
          await textarea.fill(signatureHtml);
          console.log('   Pasted signature HTML');
          await page.waitForTimeout(1000);

          // Click Save in source modal
          const saveSourceBtn = page.locator('button:has-text("Save")').first();
          if (await saveSourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveSourceBtn.click();
            console.log('   Saved source code');
            await page.waitForTimeout(1500);
          }
        }
      } else {
        console.log('   Source code button not found');
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-05-after-signature.png', fullPage: true });

    // ========== SAVE PROFILE ==========
    console.log('\nStep 11: Saving profile...');

    // Look for Save/Next/Update button
    const saveBtn = page.locator('button:has-text("Next"), button:has-text("Save"), button:has-text("Update")').last();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   Clicked Save/Next');
      await page.waitForTimeout(3000);
    }

    // Continue clicking Next if multi-step
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button:has-text("Next")').last();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        console.log('   Clicked Next step ' + (i + 1));
        await page.waitForTimeout(1500);
      } else {
        break;
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-06-after-save.png', fullPage: true });

    // ========== SEND TEST EMAIL ==========
    console.log('\n===========================================');
    console.log('Step 12: SENDING TEST EMAIL');
    console.log('===========================================\n');

    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(5000);

    // Wait for contacts table
    await page.waitForSelector('table', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Click on first contact
    const firstContact = page.locator('tbody tr').first();
    if (await firstContact.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstContact.click();
      console.log('   Clicked on first contact');
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-07-contact.png', fullPage: true });

    // Type email body
    const emailBody = page.locator('[contenteditable="true"]').first();
    if (await emailBody.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailBody.click();
      await emailBody.type('Signature test v2 - ' + new Date().toLocaleTimeString() + '\n\nSignature should appear below this line.');
      console.log('   Typed email body');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-08-composed.png', fullPage: true });

    // Click Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   CLICKED SEND!');
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-09-sent.png', fullPage: true });

    // Save final page state for debugging
    const finalHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-final-state.html', finalHtml);

    console.log('\n===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('Screenshots saved to screenshots/v2-*.png');
    console.log('Browser stays open for 3 minutes');
    console.log('===========================================\n');

    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/v2-error.png' });

    const errorHtml = await page.content().catch(() => '');
    if (errorHtml) {
      fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-v2-error.html', errorHtml);
    }

    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
