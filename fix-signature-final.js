const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('FIX SIGNATURE FINAL - Proper Vue App Wait');
  console.log('===========================================\n');

  const signatureHtml = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/signature-for-ghl.html', 'utf8');
  console.log('Loaded signature HTML (' + signatureHtml.length + ' chars)\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  // Helper: wait for Vue app to be mounted by checking for actual content
  async function waitForAppLoaded() {
    console.log('   Waiting for Vue app to mount...');
    // Wait for the app to have actual text content (not just scripts)
    await page.waitForFunction(() => {
      const body = document.body;
      // Check if Vue has mounted (look for common GHL elements)
      const hasContent = body.innerText.length > 100;
      const hasVueApp = document.querySelector('#app') || document.querySelector('[data-v-app]');
      const hasSidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('nav');
      return hasContent || hasVueApp || hasSidebar;
    }, { timeout: 60000 }).catch(() => console.log('   App mount check timed out'));
    await page.waitForTimeout(3000);
  }

  try {
    // ========== LOGIN ==========
    console.log('Step 1: Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Wait for login page to load
    await waitForAppLoaded();

    // Look for Google sign-in
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google sign-in iframe');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google button');
      }
    } else {
      // Try direct login form
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('david@lendwisemtg.com');
        console.log('   Entered email in form');
      }
    }
    await page.waitForTimeout(4000);

    // Handle Google popup
    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Found Google login popup');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(4000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 20000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(15000);
    }

    // Wait for redirect after login
    await waitForAppLoaded();
    console.log('   Logged in!\n');

    // ========== SWITCH SUB-ACCOUNT ==========
    console.log('Step 2: Checking for sub-account switch...');
    await page.waitForTimeout(5000);

    // Wait for any page content
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('   Page preview: ' + pageText.substring(0, 100).replace(/\n/g, ' '));

    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('   Found account switcher');
      await switcher.click();
      await page.waitForTimeout(3000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 8000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(10000);
      }
    }
    console.log('   Account switch complete!\n');

    // ========== GO TO MY STAFF ==========
    console.log('Step 3: Navigating to My Staff settings...');

    // First wait to make sure we're in the app
    await waitForAppLoaded();

    // Take screenshot before navigation
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-01-before-nav.png' });

    // Navigate to My Staff
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/settings/my-staff', {
      waitUntil: 'domcontentloaded'
    });

    // Wait longer for the page to fully render
    console.log('   Waiting for My Staff page content...');
    await page.waitForTimeout(8000);
    await waitForAppLoaded();

    // Additional wait for table specifically
    await page.waitForSelector('table, [class*="table"], [class*="grid"]', { timeout: 30000 }).catch(() => {
      console.log('   No table found directly, checking for other content...');
    });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-02-my-staff.png' });

    // ========== FIND AND CLICK ON DAVID'S ROW ==========
    console.log('\nStep 4: Looking for David Young...');

    // Check what's on the page now
    const pageContent = await page.evaluate(() => {
      return {
        text: document.body.innerText.substring(0, 1500),
        tables: document.querySelectorAll('table').length,
        rows: document.querySelectorAll('tr').length,
        hasDavid: document.body.innerText.includes('david@lendwisemtg.com'),
        hasLendwise: document.body.innerText.includes('LENDWISE')
      };
    });

    console.log('   Tables found: ' + pageContent.tables);
    console.log('   Table rows: ' + pageContent.rows);
    console.log('   Contains David email: ' + pageContent.hasDavid);
    console.log('   Contains LENDWISE: ' + pageContent.hasLendwise);
    console.log('   Page text sample: ' + pageContent.text.substring(0, 200).replace(/\n/g, ' '));

    // If David's email is found, locate and click edit
    if (pageContent.hasDavid) {
      console.log('\n   Found David! Looking for edit button...');

      // Find the row with david's email and get its position
      const davidInfo = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.includes('david@lendwisemtg.com')) {
            // Find the containing row/parent
            let parent = walker.currentNode.parentElement;
            while (parent && parent.tagName !== 'TR' && parent.tagName !== 'BODY') {
              parent = parent.parentElement;
            }
            const rect = parent?.getBoundingClientRect() || walker.currentNode.parentElement.getBoundingClientRect();
            return {
              found: true,
              y: rect.y + rect.height / 2,
              rowTag: parent?.tagName,
              height: rect.height
            };
          }
        }
        return { found: false };
      });

      if (davidInfo.found) {
        console.log('   David row at Y=' + davidInfo.y);

        // Find pencil/edit icons on the right side
        const editButtons = await page.evaluate((targetY) => {
          const btns = [];
          // Look for any clickable elements on the right side of the page
          const elements = document.querySelectorAll('button, a, svg, [role="button"], [class*="action"], [class*="edit"]');
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            // Looking for elements on the right side (x > 1000) near David's row
            if (rect.x > 1000 && Math.abs(rect.y - targetY) < 30) {
              btns.push({
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                tag: el.tagName,
                class: el.className?.substring?.(0, 30) || ''
              });
            }
          });
          return btns;
        }, davidInfo.y);

        console.log('   Found ' + editButtons.length + ' action buttons near David');

        if (editButtons.length > 0) {
          // Click the first action button
          const btn = editButtons[0];
          console.log('   Clicking action button at (' + btn.x + ', ' + btn.y + ')');
          await page.mouse.click(btn.x, btn.y);
        } else {
          // Fallback: click at approximate position (1100-1150 is typically actions column)
          console.log('   Using fallback click at (1120, ' + davidInfo.y + ')');
          await page.mouse.click(1120, davidInfo.y);
        }
        await page.waitForTimeout(4000);
      }
    } else {
      console.log('   David not found on page, trying alternative navigation...');
      // Click on sidebar Settings if visible
      const settingsLink = page.locator('text=Settings').first();
      if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsLink.click();
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-03-after-edit-click.png' });

    // ========== CHECK FOR MODAL/DRAWER ==========
    console.log('\nStep 5: Looking for edit modal...');

    const modalInfo = await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="drawer"]');
      const results = [];
      modals.forEach(m => {
        const rect = m.getBoundingClientRect();
        if (rect.width > 200) {
          results.push({
            class: m.className.substring(0, 50),
            width: rect.width,
            text: m.innerText.substring(0, 100)
          });
        }
      });
      return results;
    });

    console.log('   Modals/Drawers found: ' + modalInfo.length);
    modalInfo.forEach(m => console.log('     - ' + m.class + ' (' + m.width + 'px): ' + m.text.substring(0, 50).replace(/\n/g, ' ')));

    // ========== NAVIGATE TO USER INFO TAB ==========
    console.log('\nStep 6: Looking for User Info tab...');

    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found User Info tab, clicking...');
      await userInfoTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-04-user-info.png' });

    // ========== SCROLL TO SIGNATURE AND ENABLE ==========
    console.log('\nStep 7: Looking for signature settings...');

    // Scroll down in any scrollable container
    await page.evaluate(() => {
      const containers = document.querySelectorAll('[class*="overflow"], [class*="scroll"], [class*="drawer-body"]');
      containers.forEach(c => {
        if (c.scrollHeight > c.clientHeight) {
          c.scrollTop = c.scrollHeight;
        }
      });
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-05-scrolled.png' });

    // Look for signature toggle
    const sigCheck = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasEnableSignature: text.includes('enable signature'),
        hasSignatureText: text.includes('signature'),
        toggleCount: document.querySelectorAll('[role="switch"], input[type="checkbox"]').length
      };
    });

    console.log('   "Enable signature" text found: ' + sigCheck.hasEnableSignature);
    console.log('   "signature" text found: ' + sigCheck.hasSignatureText);
    console.log('   Toggle elements: ' + sigCheck.toggleCount);

    // Try to click on signature toggle
    const enableSigText = page.locator('text=Enable signature').first();
    if (await enableSigText.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found "Enable signature", clicking area...');
      await enableSigText.click();
      await page.waitForTimeout(1000);

      // Also try clicking to the right (where toggle usually is)
      const box = await enableSigText.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width + 50, box.y + box.height / 2);
        console.log('   Clicked toggle area');
      }
    }

    // ========== HANDLE SIGNATURE EDITOR ==========
    console.log('\nStep 8: Looking for signature editor...');

    // Look for source code button
    const sourceBtn = page.locator('button:has-text("</>")').first();
    if (await sourceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sourceBtn.click();
      console.log('   Clicked source code button');
      await page.waitForTimeout(1500);

      // Find and fill textarea
      const textarea = page.locator('textarea').last();
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textarea.click();
        await textarea.press('Control+a');
        await textarea.fill(signatureHtml);
        console.log('   Pasted signature HTML');

        // Save source code
        const saveBtn = page.locator('button:has-text("Save")').first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          console.log('   Saved source');
        }
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-06-signature.png' });

    // ========== SAVE PROFILE ==========
    console.log('\nStep 9: Saving profile...');

    const saveBtn = page.locator('button:has-text("Next"), button:has-text("Save"), button:has-text("Update")').last();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   Clicked Save');
      await page.waitForTimeout(3000);
    }

    // Click through any remaining steps
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button:has-text("Next")').last();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        console.log('   Clicked Next');
        await page.waitForTimeout(1500);
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-07-saved.png' });

    // ========== SEND TEST EMAIL ==========
    console.log('\n===========================================');
    console.log('Step 10: SENDING TEST EMAIL');
    console.log('===========================================\n');

    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(8000);
    await waitForAppLoaded();

    // Wait for contacts to load
    await page.waitForSelector('table, [class*="contact"]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-08-contacts.png' });

    // Click first contact
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      console.log('   Clicked first contact');
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-09-contact-detail.png' });

    // Type email
    const emailBody = page.locator('[contenteditable="true"]').first();
    if (await emailBody.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailBody.click();
      await emailBody.type('Signature test FINAL - ' + new Date().toLocaleTimeString());
      console.log('   Typed email');
    }

    await page.waitForTimeout(2000);

    // Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   EMAIL SENT!');
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-10-sent.png' });

    // Save final HTML for debugging
    const finalHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-final.html', finalHtml);

    console.log('\n===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('Browser stays open for 3 minutes');
    console.log('===========================================\n');

    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/final-error.png' });

    const html = await page.content().catch(() => '');
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-final-error.html', html);

    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
