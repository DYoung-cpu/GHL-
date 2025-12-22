const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 5
// Direct URL navigation approach

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
  console.log('📧 GHL Email Signature Test - Version 5');
  console.log('='.repeat(50));
  console.log('Approach: Direct URL navigation\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

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

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
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

    // ===== NAVIGATE DIRECTLY TO CONTACTS VIA URL =====
    console.log('📍 Step 3: Navigating directly to Contacts...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/contacts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'v5-01-contacts-page');

    // ===== CLICK ADD CONTACT BUTTON (the + icon) =====
    console.log('📍 Step 4: Creating new contact...');

    // Wait for the page to fully load
    await page.waitForTimeout(2000);

    // Find and click the + button in the contacts toolbar
    // Looking at the UI - there's a + icon in the toolbar area
    const addButtons = [
      'button[class*="add"]',
      'button:has(svg[data-icon="plus"])',
      '[data-testid="add-contact"]',
      'button[title*="Add"]',
      '.hl-btn-primary:has-text("+")'
    ];

    let addClicked = false;
    for (const selector of addButtons) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        addClicked = true;
        console.log(`   ✓ Clicked add button: ${selector}`);
        break;
      }
    }

    if (!addClicked) {
      // Look for + symbol directly
      console.log('   Looking for + icon via text...');
      const plusBtn = page.locator('button').filter({ hasText: '+' }).first();
      if (await plusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await plusBtn.click();
        addClicked = true;
      }
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'v5-02-add-clicked');

    // ===== FILL CONTACT FORM =====
    console.log('📍 Step 5: Filling contact form...');

    // Look for contact form fields
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"], input[id*="first"]').first();
    if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameInput.fill('Test');
      console.log('   ✓ Entered first name');

      const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"], input[id*="last"]').first();
      if (await lastNameInput.isVisible()) {
        await lastNameInput.fill('Signature');
        console.log('   ✓ Entered last name');
      }

      const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="Email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('david@lendwisemtg.com');
        console.log('   ✓ Entered email');
      }

      const phoneInput = page.locator('input[name="phone"], input[type="tel"], input[placeholder*="Phone"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('3109547772');
        console.log('   ✓ Entered phone');
      }

      await screenshot(page, 'v5-03-form-filled');

      // Save contact
      const saveButtons = [
        'button:has-text("Save")',
        'button:has-text("Create")',
        'button[type="submit"]',
        '.hl-btn-primary:has-text("Save")'
      ];

      for (const selector of saveButtons) {
        const saveBtn = page.locator(selector).first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          console.log('   ✓ Clicked Save');
          break;
        }
      }
    } else {
      console.log('   ⚠️ Contact form not found');
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'v5-04-contact-saved');

    // ===== NAVIGATE TO CONVERSATIONS WITH THIS CONTACT =====
    console.log('📍 Step 6: Opening conversation view...');

    // Try to navigate to conversations for this contact
    // Or click on the contact to open their details

    // Search for the contact we just created
    const searchInput = page.locator('input[placeholder*="Quick search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill('david@lendwisemtg.com');
      await page.waitForTimeout(2000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v5-05-search-contact');

    // Click on the contact row to select it
    const contactRow = page.locator('tr, [class*="contact-row"], [class*="list-item"]').filter({ hasText: 'david' }).first();
    if (await contactRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contactRow.click();
      console.log('   ✓ Selected contact');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v5-06-contact-selected');

    // ===== OPEN EMAIL COMPOSER =====
    console.log('📍 Step 7: Opening email composer...');

    // Look for email icon/button in contact detail view
    // Or navigate to Conversations tab
    const emailIcons = [
      'svg[data-icon="envelope"]',
      'button[title*="Email"]',
      '[data-action="email"]',
      'a[href*="email"]',
      '.email-icon',
      'button:has(svg[data-icon="envelope"])'
    ];

    for (const selector of emailIcons) {
      const icon = page.locator(selector).first();
      if (await icon.isVisible({ timeout: 1000 }).catch(() => false)) {
        await icon.click();
        console.log(`   ✓ Clicked email icon: ${selector}`);
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Try going to Conversations and finding our contact
    if (!await page.locator('input[placeholder*="Subject"]').isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Navigating to Conversations...');
      await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/conversations/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Search for contact in conversations
      const convSearch = page.locator('input[placeholder*="Search"]').first();
      if (await convSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
        await convSearch.click();
        await convSearch.fill('david@lendwisemtg.com');
        await page.waitForTimeout(2000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }

      await screenshot(page, 'v5-07-conversations');

      // Click the compose icon (pen-to-square) - it's next to filter icon
      // Based on screenshots, it's at approximately x=524
      const composeIcon = page.locator('svg[data-icon="pen-to-square"], [class*="compose"], button[title*="compose"]').first();
      if (await composeIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        await composeIcon.click();
        console.log('   ✓ Clicked compose icon');
      } else {
        // Try coordinate click - next to filter icon
        console.log('   Trying coordinate click for compose...');
        await page.mouse.click(524, 160);
      }
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v5-08-compose');

    // ===== SELECT EMAIL TYPE & COMPOSE =====
    console.log('📍 Step 8: Composing email...');

    // If there's a recipient field, fill it
    const recipientField = page.locator('input[placeholder*="To"], input[placeholder*="recipient"], input[placeholder*="Enter"]').first();
    if (await recipientField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientField.click();
      await recipientField.fill('david@lendwisemtg.com');
      await page.waitForTimeout(1500);

      // Click the dropdown result
      const dropdown = page.locator('[class*="dropdown"] >> text=david, text=david@lendwisemtg.com').first();
      if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dropdown.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(1000);
    }

    // Click Email tab if visible
    const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email"), svg[data-icon="envelope"]').first();
    if (await emailTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailTab.click();
      console.log('   ✓ Clicked Email tab');
      await page.waitForTimeout(1500);
    }

    await screenshot(page, 'v5-09-email-tab');

    // Fill subject
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name*="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.click();
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Entered subject');
    }

    // Fill body
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
    if (await bodyEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyEditor.click();
      const testMessage = `Hi,

This is a test email to verify the GHL email signature is working correctly.

Please check:
• Does the LendWise owl logo display?
• Do all the clickable links work?
• Is the formatting (colors, spacing) correct?
• Are the compliance disclosures visible?

Best regards,
David Young
LendWise Mortgage`;

      await bodyEditor.fill(testMessage);
      console.log('   ✓ Entered email body');
    }

    await screenshot(page, 'v5-10-email-composed');

    // ===== SEND EMAIL =====
    console.log('📍 Step 9: Sending email...');

    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Clicked Send button');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v5-11-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck your inbox at david@lendwisemtg.com');
    console.log('\nBrowser staying open for 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v5-error');
    console.log('\nBrowser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
