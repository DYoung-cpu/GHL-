const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('===========================================');
  console.log('INSPECTING GHL AND SENDING TEST EMAIL');
  console.log('===========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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

    // ========== GO TO CONTACTS AND OPEN ONE ==========
    console.log('Step 3: Going to Contacts...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(5000);

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Dump contacts page HTML for inspection
    const contactsHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-contacts-page.html', contactsHtml);
    console.log('   Saved contacts page HTML to debug-contacts-page.html');

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/contacts-inspect.png' });

    // Click on first contact row
    console.log('Step 4: Clicking on contact...');

    // Find all rows with email addresses
    const rows = await page.$$('tr');
    console.log('   Found ' + rows.length + ' table rows');

    // Look for a clickable row with contact info
    const contactLink = page.locator('a[href*="/contact/"]').first();
    if (await contactLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found contact link, clicking...');
      await contactLink.click();
      await page.waitForTimeout(3000);
    } else {
      // Try clicking on a cell in the table
      const nameCell = page.locator('td >> text=Test').first();
      if (await nameCell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameCell.click();
        await page.waitForTimeout(3000);
      } else {
        // Click on first data row
        const dataRow = page.locator('tbody tr').first();
        if (await dataRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          await dataRow.click();
          await page.waitForTimeout(3000);
        }
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/contact-detail-inspect.png' });

    // Dump contact detail page HTML
    const contactDetailHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-contact-detail.html', contactDetailHtml);
    console.log('   Saved contact detail HTML to debug-contact-detail.html\n');

    // ========== FIND EMAIL COMPOSER ELEMENTS ==========
    console.log('Step 5: Finding email composer elements...');

    // Look for all buttons and inputs
    const buttons = await page.$$('button');
    console.log('   Found ' + buttons.length + ' buttons');

    // Find buttons with specific text
    const sendButtons = await page.$$('button:has-text("Send")');
    console.log('   Found ' + sendButtons.length + ' Send buttons');

    // Find email-related elements
    const emailIcons = await page.$$('svg[data-icon="envelope"]');
    console.log('   Found ' + emailIcons.length + ' envelope icons');

    // Find input fields
    const inputs = await page.$$('input');
    console.log('   Found ' + inputs.length + ' input fields');

    // Find contenteditable areas
    const editors = await page.$$('[contenteditable="true"]');
    console.log('   Found ' + editors.length + ' contenteditable areas');

    // Get element details
    console.log('\n   Analyzing elements...');

    // Check for subject input
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[name*="subject" i]').first();
    const hasSubject = await subjectInput.isVisible().catch(() => false);
    console.log('   Subject input visible: ' + hasSubject);

    // Check for email body
    const bodyEditor = page.locator('[contenteditable="true"]').first();
    const hasBody = await bodyEditor.isVisible().catch(() => false);
    console.log('   Body editor visible: ' + hasBody);

    // ========== TRY TO COMPOSE EMAIL ==========
    console.log('\nStep 6: Attempting to compose email...');

    // Click Email icon/tab if visible
    const emailTab = page.locator('button:has(svg[data-icon="envelope"]), [data-testid*="email"], div:has-text("Email")').first();
    if (await emailTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailTab.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked email tab');
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-composer-inspect.png' });

    // Dump current page state
    const composerHtml = await page.content();
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-email-composer.html', composerHtml);
    console.log('   Saved email composer HTML to debug-email-composer.html');

    // Now try to fill in email
    // Subject
    const subject = page.locator('input[placeholder*="Subject" i]').first();
    if (await subject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subject.fill('Signature Test - ' + new Date().toLocaleTimeString());
      console.log('   Filled subject');
    } else {
      console.log('   Subject field not found');
    }

    // Body
    const body = page.locator('[contenteditable="true"], .tiptap, .ProseMirror').first();
    if (await body.isVisible({ timeout: 3000 }).catch(() => false)) {
      await body.click();
      await body.type('Testing signature - sent via automation.');
      console.log('   Typed body');
    } else {
      console.log('   Body editor not found');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-filled-inspect.png' });

    // ========== FIND AND CLICK SEND ==========
    console.log('\nStep 7: Looking for Send button...');

    // Get all button text for debugging
    const allButtonTexts = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      return Array.from(btns).map(btn => ({
        text: btn.innerText,
        class: btn.className,
        id: btn.id,
        visible: btn.offsetParent !== null
      }));
    });

    console.log('   Visible buttons:');
    allButtonTexts.filter(b => b.visible && b.text).slice(0, 10).forEach(b => {
      console.log('     - "' + b.text.substring(0, 30) + '"');
    });

    // Try to click Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found Send button, clicking...');
      await sendBtn.click();
      await page.waitForTimeout(3000);
      console.log('   EMAIL SENT!');
    } else {
      console.log('   Send button not visible');

      // Try alternative - look for any send-like button
      const altSend = page.locator('[data-testid*="send"], button[type="submit"]').first();
      if (await altSend.isVisible({ timeout: 2000 }).catch(() => false)) {
        await altSend.click();
        console.log('   Clicked alternative send button');
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/after-send-inspect.png' });

    console.log('\n===========================================');
    console.log('DONE! Check the debug HTML files for selectors.');
    console.log('Browser stays open for 3 minutes.');
    console.log('===========================================\n');

    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/inspect-error.png' });

    // Still save HTML for debugging
    try {
      const errorHtml = await page.content();
      fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/debug-error-page.html', errorHtml);
    } catch (e) {}

    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
