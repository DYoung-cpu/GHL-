const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V14
// Use precise coordinates from screenshot analysis
// David's row pencil icon is at approximately x=1171, y=356

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V14');
  console.log('='.repeat(50));
  console.log('Using precise coordinate clicking\n');

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
    await screenshot(page, 'sig14-01-my-staff');

    // ===== WAIT FOR TABLE TO FULLY LOAD =====
    console.log('📍 Step 4: Waiting for staff table...');

    // Wait for the table structure to appear
    await page.waitForTimeout(3000);

    // Use evaluate to check DOM without visibility requirement
    const davidFound = await page.evaluate(() => {
      return document.body.innerText.includes('David Young');
    });
    console.log(`   David Young in DOM: ${davidFound}`);

    // ===== CLICK PENCIL ICON BY COORDINATES =====
    console.log('📍 Step 5: Clicking pencil icon...');

    // From screenshot sig13-01-my-staff.png:
    // - David's row is at approximately y=356 (second data row)
    // - Pencil icon (first icon in Action column) is at approximately x=1171
    // But viewport is 1400x900, so let's use relative position

    // Find "David Young" text position to get the Y coordinate
    const davidPos = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        { acceptNode: (node) => node.textContent.includes('David Young') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
      );
      const node = walker.nextNode();
      if (node && node.parentElement) {
        const rect = node.parentElement.getBoundingClientRect();
        return { x: rect.x, y: rect.y + rect.height / 2, width: rect.width, height: rect.height };
      }
      return null;
    });

    console.log(`   David position: ${JSON.stringify(davidPos)}`);

    if (davidPos) {
      // Click at the pencil icon position (Action column)
      // The Action column with pencil is around x=1171 based on screenshot
      const pencilX = 1171;
      const pencilY = davidPos.y;

      console.log(`   Clicking at (${pencilX}, ${pencilY})...`);
      await page.mouse.click(pencilX, pencilY);
      await page.waitForTimeout(3000);
      await screenshot(page, 'sig14-02-after-click1');

      // Check if edit form opened
      let formOpened = await page.evaluate(() => document.body.innerText.includes('User Info'));
      console.log(`   User Info visible: ${formOpened}`);

      if (!formOpened) {
        // Try slightly different X positions
        for (const x of [1165, 1175, 1180, 1155]) {
          console.log(`   Trying x=${x}...`);
          await page.mouse.click(x, pencilY);
          await page.waitForTimeout(2000);
          formOpened = await page.evaluate(() => document.body.innerText.includes('User Info'));
          if (formOpened) {
            console.log(`   ✓ Form opened at x=${x}`);
            break;
          }
        }
      }

      await screenshot(page, 'sig14-03-after-clicks');
    }

    // ===== CHECK FOR EDIT FORM =====
    const hasUserInfo = await page.evaluate(() => document.body.innerText.includes('User Info'));
    console.log(`\n📍 Step 6: Edit form check - User Info: ${hasUserInfo}`);

    if (hasUserInfo) {
      console.log('✅ Edit form opened!\n');

      // ===== CLICK USER INFO TAB =====
      console.log('📍 Step 7: Clicking User Info tab...');
      await page.evaluate(() => {
        const links = document.querySelectorAll('a, button, div[role="tab"], span');
        for (const el of links) {
          if (el.textContent.trim() === 'User Info') {
            el.click();
            return true;
          }
        }
        return false;
      });
      await page.waitForTimeout(2000);

      // ===== SCROLL TO SIGNATURE =====
      console.log('📍 Step 8: Scrolling to Signature section...');

      for (let i = 0; i < 30; i++) {
        const sigFound = await page.evaluate(() => document.body.innerText.includes('Enable signature'));
        if (sigFound) {
          console.log('   ✓ Found Signature section');
          break;
        }
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(200);
      }

      await screenshot(page, 'sig14-04-signature-area');

      // ===== ENABLE TOGGLE =====
      console.log('📍 Step 9: Enabling signature toggle...');

      const toggleClicked = await page.evaluate(() => {
        const switches = document.querySelectorAll('[role="switch"]');
        for (const sw of switches) {
          // Find the one near "Enable signature" text
          const parent = sw.closest('div');
          if (parent && parent.innerText.includes('Enable signature')) {
            if (sw.getAttribute('aria-checked') !== 'true') {
              sw.click();
              return 'clicked';
            }
            return 'already enabled';
          }
        }
        // Click first switch if we can't find the right one
        if (switches.length > 0) {
          switches[0].click();
          return 'clicked first switch';
        }
        return 'no switch found';
      });
      console.log(`   Toggle: ${toggleClicked}`);
      await page.waitForTimeout(1000);

      // ===== FIND AND CLICK HTML SOURCE BUTTON =====
      console.log('📍 Step 10: Looking for HTML source button (</>)...');

      const sourceClicked = await page.evaluate(() => {
        // Look for </> button in Quill toolbar
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || btn.innerHTML;
          if (text.includes('</>') || text.includes('&lt;/&gt;')) {
            btn.click();
            return 'clicked </> button';
          }
        }
        // Look for source/code class
        const sourceBtn = document.querySelector('.ql-html, .ql-source, button[title*="source"], button[title*="HTML"]');
        if (sourceBtn) {
          sourceBtn.click();
          return 'clicked source class button';
        }
        return 'not found';
      });
      console.log(`   Source button: ${sourceClicked}`);
      await page.waitForTimeout(1000);
      await screenshot(page, 'sig14-05-source-mode');

      // ===== PASTE HTML =====
      console.log('📍 Step 11: Pasting HTML signature...');

      // Try to find textarea (source mode) or contenteditable (rich editor)
      const pasted = await page.evaluate((html) => {
        // First try textarea (HTML source mode)
        const textarea = document.querySelector('textarea');
        if (textarea && textarea.offsetParent !== null) {
          textarea.value = html;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return 'pasted in textarea';
        }

        // Try contenteditable editor
        const editor = document.querySelector('.ql-editor, [contenteditable="true"]');
        if (editor) {
          editor.innerHTML = html;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          return 'set innerHTML on editor';
        }

        return 'no editor found';
      }, SIGNATURE_HTML);

      console.log(`   Paste result: ${pasted}`);
      await page.waitForTimeout(1000);
      await screenshot(page, 'sig14-06-pasted');

      // ===== CLOSE SOURCE MODE =====
      if (sourceClicked.includes('clicked')) {
        console.log('📍 Step 12: Closing source mode...');
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent || btn.innerHTML;
            if (text.includes('</>') || text.includes('&lt;/&gt;')) {
              btn.click();
              return true;
            }
          }
        });
        await page.waitForTimeout(1000);
      }

      // ===== SAVE =====
      console.log('📍 Step 13: Saving...');

      const saved = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text === 'save' || text === 'next' || text === 'update') {
            btn.click();
            return `clicked ${text}`;
          }
        }
        return 'no save button found';
      });
      console.log(`   Save: ${saved}`);
      await page.waitForTimeout(3000);
      await screenshot(page, 'sig14-07-saved');

      console.log('\n✅ Signature configuration attempted!');
    } else {
      console.log('\n⚠️ Edit form did not open.');
      console.log('   The browser will stay open for manual completion.');
      console.log('\n   MANUAL STEPS:');
      console.log('   1. Click the pencil ✏️ icon next to David Young');
      console.log('   2. Click "User Info" tab');
      console.log('   3. Scroll down to "Signature" section');
      console.log('   4. Enable the toggle');
      console.log('   5. Click the </> button in the editor toolbar');
      console.log('   6. Paste this HTML:\n');
      console.log('   -------');
      console.log('   ' + SIGNATURE_HTML.substring(0, 200) + '...');
      console.log('   -------\n');
      console.log('   7. Click </> again to apply');
      console.log('   8. Click Next/Save');
    }

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE - Browser open 2 minutes');
    console.log('='.repeat(50));
    console.log('\nYou can manually verify/complete the signature setup.\n');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig14-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
