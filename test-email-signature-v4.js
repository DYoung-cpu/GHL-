const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 4
// Approach: Contacts page -> Find/Create contact -> Open profile -> Send email

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const signatureBody = SIGNATURE_HTML.match(/<body>([\s\S]*)<\/body>/)?.[1]?.trim() || SIGNATURE_HTML;

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Signature Test - Version 4');
  console.log('='.repeat(50));
  console.log('Approach: Contacts -> Find contact -> Send email\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600
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

    // ===== GO TO CONTACTS =====
    console.log('📍 Step 3: Navigating to Contacts...');
    await page.click('text=Contacts');
    await page.waitForTimeout(3000);
    await screenshot(page, 'v4-01-contacts');

    // ===== SEARCH FOR EXISTING CONTACT =====
    console.log('📍 Step 4: Searching for contact david@lendwisemtg.com...');

    // Find the Quick search input
    const quickSearch = page.locator('input[placeholder*="Quick search"]').first();
    if (await quickSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickSearch.click();
      await quickSearch.fill('david@lendwisemtg.com');
      await page.waitForTimeout(2000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    await screenshot(page, 'v4-02-search');

    // ===== CHECK IF CONTACT EXISTS OR CREATE NEW =====
    console.log('📍 Step 5: Looking for contact or creating new...');

    // Look for a contact row to click
    const contactRow = page.locator('tr').filter({ hasText: 'david' }).first();
    let contactFound = false;

    if (await contactRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contactRow.click();
      console.log('   ✓ Found and clicked existing contact');
      contactFound = true;
    } else {
      // Need to create new contact - click the + button
      console.log('   Contact not found, creating new...');

      // Look for Add Contact button (usually a + icon in the toolbar)
      const addBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      const plusIcon = page.locator('[data-icon="plus"], [class*="add"], button:has-text("+")').first();

      // Try clicking the first toolbar button (usually +)
      await page.mouse.click(133, 99); // The + button location from screenshot
      await page.waitForTimeout(2000);
      await screenshot(page, 'v4-03-add-clicked');

      // Fill in contact form if modal appeared
      const emailInput = page.locator('input[name="email"], input[placeholder*="Email"]').first();
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Fill contact form
        const nameInput = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test');
        }

        const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();
        if (await lastNameInput.isVisible()) {
          await lastNameInput.fill('Contact');
        }

        await emailInput.fill('david@lendwisemtg.com');

        const phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]').first();
        if (await phoneInput.isVisible()) {
          await phoneInput.fill('3109547772');
        }

        // Save contact
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          console.log('   ✓ Created new contact');
          contactFound = true;
        }
        await page.waitForTimeout(3000);
      }
    }

    await screenshot(page, 'v4-04-contact-selected');

    // ===== OPEN CONTACT DETAILS/ACTIONS =====
    console.log('📍 Step 6: Opening contact actions...');

    // After clicking a contact, we should see their details panel or a modal
    // Look for an Email action/button
    await page.waitForTimeout(2000);

    // Try to find email icon or action in the contact panel
    const emailActions = [
      'button:has-text("Email")',
      '[data-action="email"]',
      'svg[data-icon="envelope"]',
      'a[href*="email"]',
      '.action-email',
      'button[title*="Email"]'
    ];

    for (const selector of emailActions) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        console.log('   ✓ Clicked Email action');
        break;
      }
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'v4-05-email-action');

    // ===== TRY DIFFERENT APPROACH - BULK ACTIONS EMAIL =====
    console.log('📍 Step 7: Trying bulk action email...');

    // Select the contact checkbox first
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.click();
      console.log('   ✓ Selected contact');
      await page.waitForTimeout(1000);
    }

    // Look for email icon in the bulk actions toolbar (envelope icon)
    // From the screenshot, the envelope icon is in the toolbar row
    const envelopeIcon = page.locator('svg[data-icon="envelope"], [title*="Email"], button:has(svg[data-icon="envelope"])').first();
    if (await envelopeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await envelopeIcon.click();
      console.log('   ✓ Clicked envelope/email icon');
      await page.waitForTimeout(2000);
    } else {
      // Try coordinate click on envelope icon (approximately position from toolbar)
      console.log('   Trying coordinate click for envelope icon...');
      await page.mouse.click(228, 99); // Envelope icon location estimate
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v4-06-bulk-email');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 8: Composing email...');

    // Look for email compose modal/panel
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name*="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.click();
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Entered subject');
    }

    await page.waitForTimeout(500);

    // Look for email body editor
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, textarea[name*="body"]').first();
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
LendWise Mortgage

---

`;
      await bodyEditor.fill(testMessage);
      console.log('   ✓ Entered email body');
    }

    await page.waitForTimeout(500);
    await screenshot(page, 'v4-07-email-composed');

    // ===== ADD SIGNATURE =====
    console.log('📍 Step 9: Adding signature...');

    // Try to find source/HTML toggle
    const sourceBtn = page.locator('button:has-text("Source"), button:has-text("<>"), [title*="Source"], [title*="HTML"]').first();
    if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sourceBtn.click();
      await page.waitForTimeout(500);

      const sourceArea = page.locator('textarea').first();
      if (await sourceArea.isVisible({ timeout: 1000 }).catch(() => false)) {
        const current = await sourceArea.inputValue();
        await sourceArea.fill(current + '\n\n' + signatureBody);
        console.log('   ✓ Added signature HTML');
        await sourceBtn.click(); // Toggle back
      }
    } else {
      console.log('   ⚠️ Source mode not available');
    }

    await screenshot(page, 'v4-08-with-signature');

    // ===== SEND EMAIL =====
    console.log('📍 Step 10: Sending email...');

    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Clicked Send button');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠️ Send button not found');
    }

    await screenshot(page, 'v4-09-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck your inbox at david@lendwisemtg.com');
    console.log('\nBrowser staying open for 60 seconds for manual review...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v4-error');
    console.log('\nBrowser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
