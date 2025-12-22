const { chromium } = require('playwright');

(async () => {
  console.log('===========================================');
  console.log('SENDING TEST EMAIL TO VERIFY SIGNATURE');
  console.log('===========================================\n');

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

    // ========== GO TO CONTACTS ==========
    console.log('Step 3: Going to Contacts...');

    // Use direct URL navigation instead of clicking
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/contacts-page.png' });
    console.log('   On Contacts page!\n');

    // ========== FIND TEST CONTACT ==========
    console.log('Step 4: Searching for test contact...');

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill('david@lendwisemtg.com');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Click on the contact row
    const contactRow = page.locator('text=david@lendwisemtg.com').first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactRow.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/contact-detail.png' });
    console.log('   Contact opened!\n');

    // ========== COMPOSE EMAIL ==========
    console.log('Step 5: Composing email...');

    // Look for email icon or Email tab
    const emailIcon = page.locator('[data-testid="email-icon"], svg[data-icon="envelope"], button:has-text("Email")').first();
    if (await emailIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailIcon.click();
      await page.waitForTimeout(2000);
    }

    // Fill subject
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[name="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.fill('Signature Test - ' + new Date().toLocaleTimeString());
      console.log('   Subject filled');
    }

    // Fill body - click in editor first
    const bodyEditor = page.locator('[contenteditable="true"], .tiptap, .ProseMirror').first();
    if (await bodyEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bodyEditor.click();
      await page.waitForTimeout(500);
      await bodyEditor.type('This is a test email to verify the signature appears correctly. The signature should include the LendWise logo, contact information, and compliance disclosures.');
      console.log('   Body filled');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-composed.png' });
    console.log('   Screenshot: email-composed.png\n');

    // Check if signature preview is visible in the email
    const emailPreview = await page.locator('.email-preview, [class*="preview"], [contenteditable="true"]').first().textContent().catch(() => '');
    if (emailPreview && emailPreview.includes('LendWise')) {
      console.log('   *** SIGNATURE DETECTED IN EMAIL PREVIEW! ***');
    } else {
      console.log('   (Signature may appear after sending or in preview pane)');
    }

    // ========== SEND EMAIL ==========
    console.log('\nStep 6: Sending email...');

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   EMAIL SENT!');
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-sent-test.png' });

    console.log('\n===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('===========================================');
    console.log('Browser stays open for 2 minutes.\n');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/test-email-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
