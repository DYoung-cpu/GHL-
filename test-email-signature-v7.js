const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 7
// Using precise selectors from screenshots

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
const signatureBody = SIGNATURE_HTML.match(/<body>([\s\S]*)<\/body>/)?.[1]?.trim() || SIGNATURE_HTML;

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Signature Test - Version 7');
  console.log('='.repeat(50));
  console.log('Using precise coordinate clicks\n');

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

    // ===== GO TO CONTACTS =====
    console.log('📍 Step 3: Navigating to Contacts...');
    await page.click('text=Contacts');
    await page.waitForTimeout(5000);
    await screenshot(page, 'v7-01-contacts');

    // ===== CLICK + BUTTON TO ADD CONTACT =====
    console.log('📍 Step 4: Clicking Add Contact (+) button...');

    // The + button is the first icon in the toolbar row
    // From screenshot, it's at approximately x=254, y=194
    // But let's try finding it by its properties first

    // Method 1: Try locator
    const plusBtn = page.locator('button').filter({ has: page.locator('svg[data-icon="plus"]') }).first();
    if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await plusBtn.click();
      console.log('   ✓ Clicked + button via locator');
    } else {
      // Method 2: Click by coordinate (first icon in toolbar)
      console.log('   Clicking + by coordinates...');
      await page.mouse.click(254, 194);
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'v7-02-add-clicked');

    // ===== FILL CONTACT FORM IN MODAL =====
    console.log('📍 Step 5: Filling contact form...');

    // Look for the modal/drawer with form fields
    // GHL uses modals for adding contacts

    // Wait for modal
    await page.waitForSelector('input', { timeout: 5000 }).catch(() => null);

    // First Name
    const firstNameInput = page.locator('input').filter({ has: page.locator('[placeholder*="First" i]') }).first();
    let firstNameField = page.locator('input[placeholder*="First" i], input[name*="firstName" i]').first();

    if (await firstNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstNameField.fill('Test');
      console.log('   ✓ First name: Test');
    } else {
      // Try finding by label
      const labelFirst = page.locator('label:has-text("First")').first();
      if (await labelFirst.isVisible({ timeout: 1000 }).catch(() => false)) {
        const input = page.locator('input').nth(0);
        await input.fill('Test');
        console.log('   ✓ First name via label');
      }
    }

    // Last Name
    const lastNameField = page.locator('input[placeholder*="Last" i], input[name*="lastName" i]').first();
    if (await lastNameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lastNameField.fill('Signature');
      console.log('   ✓ Last name: Signature');
    }

    // Email
    const emailField = page.locator('input[type="email"], input[placeholder*="Email" i], input[name*="email" i]').first();
    if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailField.fill('david@lendwisemtg.com');
      console.log('   ✓ Email: david@lendwisemtg.com');
    }

    // Phone
    const phoneField = page.locator('input[type="tel"], input[placeholder*="Phone" i], input[name*="phone" i]').first();
    if (await phoneField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneField.fill('3109547772');
      console.log('   ✓ Phone: 3109547772');
    }

    await screenshot(page, 'v7-03-form-filled');

    // Save contact
    console.log('📍 Step 6: Saving contact...');
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      console.log('   ✓ Clicked Save');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v7-04-saved');

    // ===== SELECT CONTACT AND SEND EMAIL =====
    console.log('📍 Step 7: Finding and selecting contact...');

    // After saving, search for the contact
    const quickSearch = page.locator('input[placeholder*="Quick search" i]').first();
    if (await quickSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickSearch.click();
      await quickSearch.fill('Test Signature');
      console.log('   ✓ Searching...');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v7-05-search');

    // Click on the contact row if it appears
    const contactRow = page.locator('tr, [role="row"]').filter({ hasText: 'Test' }).first();
    if (await contactRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      // First, click the checkbox to select the contact
      const checkbox = contactRow.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await checkbox.click();
        console.log('   ✓ Selected contact checkbox');
      } else {
        await contactRow.click();
        console.log('   ✓ Clicked contact row');
      }
      await page.waitForTimeout(1000);
    }

    await screenshot(page, 'v7-06-selected');

    // ===== CLICK EMAIL ICON IN TOOLBAR =====
    console.log('📍 Step 8: Clicking Email icon...');

    // The envelope icon is in the toolbar - approximately 5th icon
    // From screenshot: it's around x=462, y=194
    const envelopeBtn = page.locator('button').filter({ has: page.locator('svg[data-icon="envelope"]') }).first();
    if (await envelopeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await envelopeBtn.click();
      console.log('   ✓ Clicked envelope via locator');
    } else {
      console.log('   Clicking envelope by coordinates...');
      await page.mouse.click(462, 194);
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'v7-07-email-clicked');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 9: Composing email...');

    // Look for email compose modal/panel
    // Subject field
    const subjectField = page.locator('input[placeholder*="Subject" i], input[name*="subject" i]').first();
    if (await subjectField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectField.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Subject entered');
    }

    // Body editor
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, div[role="textbox"], textarea').first();
    if (await bodyEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyEditor.click();

      const testMessage = `Hi,

This is a test email to verify the email signature works correctly in GHL.

Please verify:
- LendWise owl logo displays
- All links work (phone, email, calendar)
- Apply Now button functions
- Social media icons work
- Compliance text is visible

Best regards,
David Young
LendWise Mortgage`;

      await bodyEditor.fill(testMessage);
      console.log('   ✓ Body entered');
    }

    await screenshot(page, 'v7-08-composed');

    // ===== SEND EMAIL =====
    console.log('📍 Step 10: Sending email...');

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Email sent!');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠️ Send button not found');
    }

    await screenshot(page, 'v7-09-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck inbox: david@lendwisemtg.com');
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v7-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
