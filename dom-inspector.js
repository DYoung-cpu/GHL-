const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('DOM INSPECTOR - Finding Signature Elements');
  console.log('===========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
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

    // ========== GO TO MY STAFF SETTINGS ==========
    console.log('Step 3: Navigating to My Staff...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/settings/my-staff', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/dom-01-my-staff.png', fullPage: true });
    console.log('   On My Staff page!\n');

    // ========== ANALYZE THE PAGE ==========
    console.log('Step 4: Analyzing page elements...\n');

    // Find all table rows
    const tableAnalysis = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const rowData = [];
      rows.forEach((row, i) => {
        rowData.push({
          index: i,
          text: row.innerText.substring(0, 100),
          hasEmail: row.innerText.includes('@')
        });
      });
      return rowData;
    });

    console.log('Table rows found: ' + tableAnalysis.length);
    tableAnalysis.filter(r => r.hasEmail).forEach(r => {
      console.log('   Row ' + r.index + ': ' + r.text.replace(/\n/g, ' | ').substring(0, 80));
    });

    // ========== CLICK EDIT ON DAVID YOUNG ==========
    console.log('\nStep 5: Opening edit for David Young...');

    // Find the row with david@lendwisemtg.com
    const davidRow = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.innerText.includes('david@lendwisemtg.com')) {
          const rect = row.getBoundingClientRect();
          return { found: true, y: rect.y, height: rect.height, text: row.innerText.substring(0, 50) };
        }
      }
      return { found: false };
    });

    console.log('   David row found: ' + davidRow.found);
    if (davidRow.found) {
      console.log('   Row Y position: ' + davidRow.y);

      // Look for edit/pencil icons or actions column
      const actionButtons = await page.evaluate(() => {
        const btns = [];
        // Find SVG icons that could be edit buttons
        const svgs = document.querySelectorAll('svg');
        svgs.forEach((svg, i) => {
          const rect = svg.getBoundingClientRect();
          if (rect.x > 1000 && rect.y > 100 && rect.y < 500) {
            btns.push({
              index: i,
              x: rect.x,
              y: rect.y,
              class: svg.getAttribute('class'),
              dataIcon: svg.getAttribute('data-icon')
            });
          }
        });
        return btns;
      });

      console.log('\n   Action buttons found (x > 1000): ' + actionButtons.length);
      actionButtons.forEach(b => {
        console.log('     SVG at (' + Math.round(b.x) + ', ' + Math.round(b.y) + ') icon=' + b.dataIcon);
      });

      // Click the pencil/edit icon in David's row
      // Find button nearest to David's row Y position
      const targetY = davidRow.y + davidRow.height / 2;
      let closestBtn = null;
      let minDist = Infinity;
      for (const btn of actionButtons) {
        const dist = Math.abs(btn.y - targetY);
        if (dist < minDist) {
          minDist = dist;
          closestBtn = btn;
        }
      }

      if (closestBtn) {
        console.log('\n   Clicking edit at (' + Math.round(closestBtn.x) + ', ' + Math.round(closestBtn.y) + ')');
        await page.mouse.click(closestBtn.x + 5, closestBtn.y + 5);
      } else {
        // Fallback: try clicking at x=1175 (right side actions area)
        console.log('\n   Fallback: clicking at (1175, ' + targetY + ')');
        await page.mouse.click(1175, targetY);
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/dom-02-edit-clicked.png', fullPage: true });

    // ========== ANALYZE THE MODAL/DRAWER ==========
    console.log('\nStep 6: Analyzing edit modal/drawer...\n');

    // Find all tabs/sections in modal
    const modalTabs = await page.evaluate(() => {
      const tabs = [];
      // Look for tab-like elements
      const candidates = document.querySelectorAll('[role="tab"], .n-tabs-tab, button, a');
      candidates.forEach(el => {
        const text = el.innerText.trim();
        if (text && text.length < 30 && !text.includes('\n')) {
          const rect = el.getBoundingClientRect();
          if (rect.x > 800 && rect.width > 0) { // In the drawer area
            tabs.push({ text, x: Math.round(rect.x), y: Math.round(rect.y) });
          }
        }
      });
      return tabs;
    });

    console.log('Tabs/Buttons in modal area:');
    [...new Set(modalTabs.map(t => t.text))].slice(0, 20).forEach(t => {
      console.log('   - ' + t);
    });

    // Look for "User Info" specifically
    const userInfoTab = page.locator('text=User Info').first();
    if (await userInfoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n   Found "User Info" tab - clicking...');
      await userInfoTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/dom-03-user-info.png', fullPage: true });

    // ========== SCROLL DOWN AND FIND SIGNATURE ==========
    console.log('\nStep 7: Looking for signature settings...\n');

    // Scroll any scrollable containers
    await page.evaluate(() => {
      const scrollables = document.querySelectorAll('.overflow-auto, .overflow-y-auto, [class*="scroll"], .n-drawer-body-content-wrapper');
      scrollables.forEach(el => {
        el.scrollTop = el.scrollHeight;
      });
    });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/dom-04-scrolled.png', fullPage: true });

    // Find ALL text containing "signature" (case insensitive)
    const signatureElements = await page.evaluate(() => {
      const elements = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.toLowerCase().includes('signature')) {
          const parent = walker.currentNode.parentElement;
          if (parent) {
            const rect = parent.getBoundingClientRect();
            elements.push({
              text: walker.currentNode.textContent.trim().substring(0, 60),
              tag: parent.tagName,
              class: parent.className,
              x: Math.round(rect.x),
              y: Math.round(rect.y)
            });
          }
        }
      }
      return elements;
    });

    console.log('Elements containing "signature":');
    signatureElements.forEach(el => {
      console.log('   "' + el.text + '" <' + el.tag + '> at (' + el.x + ', ' + el.y + ')');
    });

    // Find toggle/switch elements
    const toggleElements = await page.evaluate(() => {
      const toggles = [];
      const switches = document.querySelectorAll('[role="switch"], input[type="checkbox"], .n-switch, button[class*="switch"]');
      switches.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.x > 800) { // In drawer area
          toggles.push({
            tag: el.tagName,
            type: el.type || '',
            checked: el.checked || el.getAttribute('aria-checked'),
            class: el.className.substring(0, 50),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            nearText: el.parentElement?.innerText?.substring(0, 40) || ''
          });
        }
      });
      return toggles;
    });

    console.log('\nToggle/Switch elements in drawer:');
    toggleElements.forEach(t => {
      console.log('   <' + t.tag + '> checked=' + t.checked + ' at (' + t.x + ', ' + t.y + ') near: "' + t.nearText.replace(/\n/g, ' ').substring(0, 30) + '"');
    });

    // Find content editable areas (for signature HTML)
    const editors = await page.evaluate(() => {
      const eds = [];
      const editables = document.querySelectorAll('[contenteditable="true"], .tiptap, .ProseMirror, textarea');
      editables.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.x > 800) {
          eds.push({
            tag: el.tagName,
            class: el.className.substring(0, 50),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            contentLength: (el.innerHTML || el.value || '').length
          });
        }
      });
      return eds;
    });

    console.log('\nEditable areas in drawer:');
    editors.forEach(e => {
      console.log('   <' + e.tag + '> at (' + e.x + ', ' + e.y + ') content=' + e.contentLength + ' chars');
    });

    // Save full HTML for manual inspection
    const fullHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-full-page.html', fullHtml);
    console.log('\n   Saved full page HTML to debug-full-page.html');

    // ========== LOOKING FOR SPECIFIC GHL SIGNATURE PATTERN ==========
    console.log('\nStep 8: Looking for GHL-specific signature controls...\n');

    // In GHL, the signature toggle might be in a specific structure
    const ghlControls = await page.evaluate(() => {
      const controls = [];
      // Look for labels followed by switches/toggles
      const labels = document.querySelectorAll('label, span');
      labels.forEach(label => {
        const text = label.innerText.toLowerCase();
        if (text.includes('enable') || text.includes('signature')) {
          const rect = label.getBoundingClientRect();
          if (rect.x > 700) {
            // Look for nearby toggle
            const parent = label.closest('div');
            const toggle = parent?.querySelector('[role="switch"], input[type="checkbox"], .n-switch');
            controls.push({
              labelText: label.innerText.substring(0, 50),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              hasToggle: !!toggle,
              toggleChecked: toggle?.checked || toggle?.getAttribute('aria-checked')
            });
          }
        }
      });
      return controls;
    });

    console.log('GHL controls with "enable" or "signature":');
    ghlControls.forEach(c => {
      console.log('   "' + c.labelText.replace(/\n/g, ' ') + '" at (' + c.x + ', ' + c.y + ') toggle=' + c.hasToggle + ' checked=' + c.toggleChecked);
    });

    console.log('\n===========================================');
    console.log('INSPECTION COMPLETE');
    console.log('Check screenshots in /screenshots/dom-*.png');
    console.log('Check debug-full-page.html for full DOM');
    console.log('Browser stays open for 3 minutes');
    console.log('===========================================\n');

    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/dom-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
