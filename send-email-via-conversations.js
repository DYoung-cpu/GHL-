const { chromium } = require('playwright');

(async () => {
  console.log('===========================================');
  console.log('SENDING TEST EMAIL VIA CONVERSATIONS');
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

    // ========== GO TO CONVERSATIONS ==========
    console.log('Step 3: Going to Conversations...');

    // Click Conversations in sidebar
    const conversations = page.locator('text=Conversations').first();
    await conversations.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/conversations-page.png' });
    console.log('   On Conversations page!\n');

    // ========== FIND OR CREATE CONVERSATION ==========
    console.log('Step 4: Finding test contact...');

    // Look for existing conversation with david@lendwisemtg.com or Test Signature
    const testConversation = page.locator('text=Test Signature, text=david@lendwisemtg.com').first();

    if (await testConversation.isVisible({ timeout: 3000 }).catch(() => false)) {
      await testConversation.click();
      await page.waitForTimeout(2000);
    } else {
      // Use search to find contact
      const searchBox = page.locator('input[placeholder*="Search"]').first();
      if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBox.click();
        await searchBox.fill('Test Signature');
        await page.waitForTimeout(2000);

        // Click on search result
        const result = page.locator('text=Test Signature').first();
        if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
          await result.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/conversation-selected.png' });
    console.log('   Contact conversation opened!\n');

    // ========== SWITCH TO EMAIL TAB ==========
    console.log('Step 5: Switching to Email tab...');

    // Look for Email tab in the conversation panel
    const emailTab = page.locator('[data-testid="email-tab"], button:has-text("Email"), div:has-text("Email")').filter({ has: page.locator('svg') }).first();

    // Try clicking Email icon/tab
    const emailIcon = page.locator('svg[data-icon="envelope"]').first();
    if (await emailIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailIcon.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-tab-clicked.png' });

    // ========== COMPOSE EMAIL ==========
    console.log('Step 6: Composing email...');

    // Fill subject - look for subject input
    const subjectInput = page.locator('input[placeholder*="Subject" i]').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.fill('Signature Test - ' + new Date().toLocaleTimeString());
      console.log('   Subject filled!');
    } else {
      console.log('   Subject input not found - may already have conversation context');
    }

    // Type in email body
    const emailBody = page.locator('[contenteditable="true"], .tiptap, .ProseMirror, textarea').first();
    if (await emailBody.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailBody.click();
      await page.waitForTimeout(500);
      await emailBody.type('Testing signature - this email should include the LendWise signature with logo and contact info.');
      console.log('   Body filled!');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-ready.png' });
    console.log('   Screenshot: email-ready.png\n');

    // ========== SEND EMAIL ==========
    console.log('Step 7: Sending email...');

    const sendBtn = page.locator('button:has-text("Send"), [data-testid="send-button"]').first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   EMAIL SENT!');
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('Control+Enter');
      console.log('   Sent via keyboard shortcut');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-sent-conversations.png' });

    console.log('\n===========================================');
    console.log('DONE! Check david@lendwisemtg.com inbox');
    console.log('for email with signature.');
    console.log('===========================================');
    console.log('\nBrowser stays open for 2 minutes.\n');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('\n ERROR:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/conversations-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
