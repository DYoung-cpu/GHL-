const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 6
// Uses element waits instead of networkidle

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const signatureBody = SIGNATURE_HTML.match(/<body>([\s\S]*)<\/body>/)?.[1]?.trim() || SIGNATURE_HTML;

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Signature Test - Version 6');
  console.log('='.repeat(50));
  console.log('Using element waits instead of networkidle\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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
      console.log('   Found Google One-Tap iframe...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google One-Tap button');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering Google credentials...');
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

    // ===== NAVIGATE TO CONTACTS VIA SIDEBAR =====
    console.log('📍 Step 3: Clicking Contacts in sidebar...');

    // Wait for sidebar to be visible
    await page.waitForSelector('text=Contacts', { timeout: 10000 });
    await page.click('text=Contacts');
    console.log('   ✓ Clicked Contacts');

    // Wait for the contacts page to load by looking for specific elements
    await page.waitForTimeout(5000);

    // Wait for the contacts table or "All" tab to appear
    await page.waitForSelector('text=All, input[placeholder*="search" i], text=Smart Lists', { timeout: 15000 }).catch(() => null);

    await screenshot(page, 'v6-01-contacts-page');

    // ===== FIND OR CREATE CONTACT =====
    console.log('📍 Step 4: Looking for test contact...');

    // Wait for the search input to be available
    await page.waitForTimeout(2000);

    // Search for existing contact
    const quickSearch = page.locator('input[placeholder*="Quick search" i], input[placeholder*="search" i]').first();
    if (await quickSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickSearch.click();
      await quickSearch.fill('david@lendwisemtg.com');
      console.log('   ✓ Searching for contact...');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v6-02-search');

    // Check if we found the contact
    const contactResult = page.locator('tr, [class*="contact"], [class*="row"]').filter({ hasText: 'david' }).first();

    if (await contactResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✓ Found existing contact');
      await contactResult.click();
    } else {
      console.log('   Contact not found, will create new...');

      // Clear search first
      await quickSearch.clear();
      await page.waitForTimeout(1000);

      // Click + button to add contact
      // The + button is in the toolbar - look at position
      const addBtn = page.locator('button').filter({ has: page.locator('svg') }).first();

      // Try clicking the + icon - usually first toolbar button
      console.log('   Looking for Add button...');

      // Check multiple ways to find the add button
      const addSelectors = [
        'button[class*="add"]',
        '[data-testid="add"]',
        'button:has-text("+")',
        'svg[data-icon="plus"]',
        'button[title*="Add"]'
      ];

      let foundAdd = false;
      for (const sel of addSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          await el.click();
          foundAdd = true;
          console.log(`   ✓ Clicked: ${sel}`);
          break;
        }
      }

      if (!foundAdd) {
        // Try keyboard shortcut
        console.log('   Trying keyboard shortcut for new contact...');
        await page.keyboard.press('n');
        await page.waitForTimeout(1000);
      }

      await page.waitForTimeout(2000);
      await screenshot(page, 'v6-03-add-modal');

      // Fill contact form
      const firstNameInput = page.locator('input[name*="first" i], input[placeholder*="first" i]').first();
      if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstNameInput.fill('Test');
        console.log('   ✓ First name');

        const lastNameInput = page.locator('input[name*="last" i], input[placeholder*="last" i]').first();
        if (await lastNameInput.isVisible()) {
          await lastNameInput.fill('Signature');
          console.log('   ✓ Last name');
        }

        const emailInput = page.locator('input[name*="email" i], input[type="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill('david@lendwisemtg.com');
          console.log('   ✓ Email');
        }

        const phoneInput = page.locator('input[name*="phone" i], input[type="tel"]').first();
        if (await phoneInput.isVisible()) {
          await phoneInput.fill('3109547772');
          console.log('   ✓ Phone');
        }

        await screenshot(page, 'v6-04-form-filled');

        // Save
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').first();
        if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveBtn.click();
          console.log('   ✓ Saved contact');
        }

        await page.waitForTimeout(3000);
      }
    }

    await screenshot(page, 'v6-05-contact-ready');

    // ===== OPEN CONTACT AND SEND EMAIL =====
    console.log('📍 Step 5: Opening conversation/email...');

    // After a contact is selected or created, try to open email
    // Look for envelope icon in toolbar or contact actions
    const emailButtons = [
      'svg[data-icon="envelope"]',
      'button[title*="Email" i]',
      '[data-action="email"]',
      'button:has(svg[data-icon="envelope"])'
    ];

    for (const sel of emailButtons) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        console.log(`   ✓ Clicked email: ${sel}`);
        break;
      }
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'v6-06-email-clicked');

    // ===== TRY CONVERSATIONS APPROACH =====
    console.log('📍 Step 6: Trying Conversations approach...');

    // Navigate to Conversations
    await page.click('text=Conversations');
    await page.waitForTimeout(4000);

    await screenshot(page, 'v6-07-conversations');

    // In Conversations, look for the compose/new message icon
    // It's the pen-to-square icon next to the filter funnel
    console.log('   Looking for compose button...');

    // First search for the contact
    const convSearch = page.locator('input[placeholder*="Search" i]').first();
    if (await convSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await convSearch.click();
      await convSearch.fill('david@lendwisemtg.com');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v6-08-conv-search');

    // Click the compose icon - it should be near the search
    // Try finding it by various means
    const composeSelectors = [
      'svg[data-icon="pen-to-square"]',
      '[class*="compose"]',
      'button[title*="compose" i]',
      'button[title*="new" i]'
    ];

    let composerOpened = false;
    for (const sel of composeSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        composerOpened = true;
        console.log(`   ✓ Clicked compose: ${sel}`);
        break;
      }
    }

    if (!composerOpened) {
      // The compose icon is between Search and Filter
      // From the screenshots, the icons are at approximately:
      // - Filter icon: x~490
      // - Compose icon: x~524 (to the right of filter)
      console.log('   Trying coordinate click for compose icon...');

      // Wait and click the compose icon position
      await page.waitForTimeout(500);
      await page.mouse.click(524, 160);
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v6-09-compose-clicked');

    // ===== HANDLE NEW MESSAGE FLOW =====
    console.log('📍 Step 7: Setting up email...');

    // If a recipient input appeared, fill it
    const recipientInput = page.locator('input[placeholder*="Enter" i], input[placeholder*="To" i], input[placeholder*="recipient" i]').first();
    if (await recipientInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await recipientInput.click();
      await recipientInput.fill('david@lendwisemtg.com');
      console.log('   ✓ Entered recipient');
      await page.waitForTimeout(2000);

      // Select from dropdown if it appears
      const dropdownItem = page.locator('[class*="dropdown"], [class*="option"]').filter({ hasText: 'david' }).first();
      if (await dropdownItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dropdownItem.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(1500);
    }

    await screenshot(page, 'v6-10-recipient');

    // Click Email tab
    const emailTab = page.locator('[role="tab"]:has-text("Email"), button:has-text("Email"), text=Email').first();
    if (await emailTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailTab.click();
      console.log('   ✓ Clicked Email tab');
      await page.waitForTimeout(1500);
    }

    await screenshot(page, 'v6-11-email-tab');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 8: Composing email...');

    // Subject
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[name*="subject" i]').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.click();
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Subject entered');
    }

    // Body
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
    if (await bodyEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyEditor.click();

      const testMessage = `Hi,

This is a test email to verify the GHL email signature.

Please check:
- LendWise owl logo displays
- All links work (phone, email, calendar, apply)
- Formatting is correct (colors, spacing)
- Compliance disclosures visible

Best regards,
David Young
LendWise Mortgage`;

      await bodyEditor.fill(testMessage);
      console.log('   ✓ Body entered');
    }

    await screenshot(page, 'v6-12-email-composed');

    // ===== SEND =====
    console.log('📍 Step 9: Sending email...');

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Clicked Send!');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠️ Send button not found');
    }

    await screenshot(page, 'v6-13-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck inbox at david@lendwisemtg.com');
    console.log('\nBrowser open for 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v6-error');
    console.log('\nBrowser open for 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
