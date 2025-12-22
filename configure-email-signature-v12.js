const { chromium } = require('playwright');
const fs = require('fs');

// Configure Email Signature in GHL - V12
// Use simple locator chain to find pencil icon near David's name

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🔧 GHL Email Signature Configuration - V12');
  console.log('='.repeat(50));
  console.log('Simple locator chain approach\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000  // Slow down for visibility
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
    await screenshot(page, 'sig12-01-my-staff');

    // ===== ANALYZE PAGE STRUCTURE =====
    console.log('📍 Step 4: Analyzing page structure...');

    // Log the HTML structure around David's name
    const davidText = page.locator('text=David Young');
    const davidCount = await davidText.count();
    console.log(`   "David Young" count: ${davidCount}`);

    // Get the parent element structure
    const parentInfo = await page.evaluate(() => {
      const el = document.evaluate(
        "//*[contains(text(), 'David Young')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;

      if (!el) return 'David Young not found via XPath';

      // Go up to find the row-like container
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const svgs = parent.querySelectorAll('svg');
        if (svgs.length > 0) {
          return {
            tag: parent.tagName,
            classes: parent.className,
            svgCount: svgs.length,
            depth: depth
          };
        }
        parent = parent.parentElement;
        depth++;
      }
      return 'No SVGs found in parent chain';
    });

    console.log(`   Parent info: ${JSON.stringify(parentInfo)}`);

    // ===== FIND AND CLICK PENCIL ICON =====
    console.log('📍 Step 5: Clicking pencil icon...');

    // Method 1: XPath to find SVG near David Young
    const pencilClicked = await page.evaluate(() => {
      // Find the element containing David Young
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            if (node.textContent.includes('David Young')) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let textNode = walker.nextNode();
      if (!textNode) return 'David Young text not found';

      // Go up the DOM tree to find SVGs
      let parent = textNode.parentElement;
      for (let i = 0; i < 10; i++) {
        if (!parent) break;

        // Look for SVGs at this level and in siblings
        const svgs = parent.querySelectorAll('svg');
        if (svgs.length > 0) {
          // Click the first SVG (pencil icon)
          svgs[0].click();
          return `Clicked SVG at depth ${i}, total SVGs: ${svgs.length}`;
        }

        // Check siblings too
        const siblings = parent.parentElement?.children;
        if (siblings) {
          for (const sibling of siblings) {
            const sibSvgs = sibling.querySelectorAll('svg');
            if (sibSvgs.length > 0) {
              sibSvgs[0].click();
              return `Clicked sibling SVG at depth ${i}`;
            }
          }
        }

        parent = parent.parentElement;
      }
      return 'No SVGs found';
    });

    console.log(`   Click result: ${pencilClicked}`);
    await page.waitForTimeout(5000);
    await screenshot(page, 'sig12-02-after-click');

    // ===== CHECK FOR EDIT FORM =====
    console.log('📍 Step 6: Checking for edit form...');

    const hasEditForm = await page.locator('text=User Info').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   User Info visible: ${hasEditForm}`);

    if (!hasEditForm) {
      // Try clicking all SVGs and see which one works
      console.log('   Trying to click all visible SVGs...');

      const allSvgs = await page.locator('svg').all();
      console.log(`   Total SVGs on page: ${allSvgs.length}`);

      // The pencil icons are likely after AGENCY-ADMIN text
      // Find the second row's first SVG
      const agencyAdminAll = await page.locator('text=AGENCY-ADMIN').all();
      console.log(`   AGENCY-ADMIN count: ${agencyAdminAll.length}`);

      if (agencyAdminAll.length >= 2) {
        // Get position of second AGENCY-ADMIN (David's row)
        const davidAgency = agencyAdminAll[1];
        const box = await davidAgency.boundingBox();
        if (box) {
          // Click to the right of AGENCY-ADMIN (where pencil icon is)
          // From screenshot: Action column is about 100px to the right
          console.log(`   AGENCY-ADMIN at (${box.x}, ${box.y}), clicking right...`);
          await page.mouse.click(box.x + 150, box.y + 10);
          console.log('   ✓ Clicked right of AGENCY-ADMIN');
        }
      }

      await page.waitForTimeout(5000);
      await screenshot(page, 'sig12-03-retry');
    }

    // Final check
    const hasUserInfo = await page.locator('text=User Info').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`   Final User Info check: ${hasUserInfo}`);

    await screenshot(page, 'sig12-04-final');

    // ===== IF EDIT FORM OPENED, FILL SIGNATURE =====
    if (hasUserInfo || await page.locator('text=Signature').isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📍 Step 7: Edit form found! Filling signature...');

      // Click User Info tab
      await page.locator('text=User Info').first().click().catch(() => {});
      await page.waitForTimeout(2000);

      // Scroll to Signature
      for (let i = 0; i < 20; i++) {
        if (await page.locator('text=Signature').isVisible({ timeout: 200 }).catch(() => false)) {
          break;
        }
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(150);
      }

      // Enable toggle if exists
      const toggle = page.locator('text=Enable signature').locator('..').locator('[role="switch"]');
      if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toggle.click();
      }

      // Fill editor
      const editor = page.locator('.ql-editor, [contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editor.click();
        await editor.fill(SIGNATURE_HTML);
        console.log('   ✓ Filled signature');
      }

      // Save
      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
      }

      await screenshot(page, 'sig12-05-filled');
    }

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 COMPLETE');
    console.log('='.repeat(50));
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sig12-error');
    console.log('\nBrowser open 45 seconds...');
    await page.waitForTimeout(45000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
