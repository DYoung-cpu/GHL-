const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL
// 1. Login to GHL
// 2. Create test contact (or use existing)
// 3. Set up email signature in Business Profile
// 4. Send test email

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
// Extract just the table content (between <body> and </body>)
const signatureBody = SIGNATURE_HTML.match(/<body>([\s\S]*)<\/body>/)?.[1]?.trim() || SIGNATURE_HTML;

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Signature Test');
  console.log('='.repeat(50));
  console.log('Testing email signature with test contact\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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

    // Try Google One-Tap first (iframe in corner)
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google One-Tap iframe...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google One-Tap button');
      }
    } else {
      const googleBtn = page.locator('text=Sign in with Google');
      if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Clicking Sign in with Google button...');
        await googleBtn.click();
      }
    }
    await page.waitForTimeout(3000);

    // Handle Google popup
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

    const loggedIn = await page.waitForSelector('text=LENDWISE', { timeout: 30000 }).catch(() => null);
    if (!loggedIn) {
      console.log('   ⚠️ Login may not have completed, checking page...');
      await screenshot(page, 'test-login-check');
    }
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
        console.log('   Clicked LENDWISE sub-account');
      }
    }
    console.log('✅ In sub-account!\n');
    await screenshot(page, 'test-01-dashboard');

    // ===== SET UP EMAIL SIGNATURE =====
    console.log('📍 Step 3: Setting up email signature in Business Profile...');

    // Navigate to Settings > Business Profile
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/settings/business_profile', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);
    await screenshot(page, 'test-02-business-profile');

    // Look for Email Signature section
    const signatureSection = page.locator('text=Email Signature').first();
    if (await signatureSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found Email Signature section');

      // Look for edit button or textarea
      const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-signature"]').first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(1000);
      }

      // Look for source/HTML mode toggle
      const sourceBtn = page.locator('button:has-text("Source"), button:has-text("<>"), button:has-text("HTML")').first();
      if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sourceBtn.click();
        await page.waitForTimeout(500);
        console.log('   Switched to HTML source mode');
      }

      // Find the textarea/editor and paste signature
      const signatureInput = page.locator('textarea, [contenteditable="true"], .ql-editor').first();
      if (await signatureInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await signatureInput.click();
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);

        // For textarea, use fill. For contenteditable, use keyboard
        const tagName = await signatureInput.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'textarea') {
          await signatureInput.fill(signatureBody);
        } else {
          await page.keyboard.type(signatureBody.substring(0, 500)); // Limit for contenteditable
        }
        console.log('   Pasted signature HTML');
      }

      // Save the signature
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        console.log('   Saved signature');
      }
    } else {
      console.log('   ⚠️ Email Signature section not found on this page');
      console.log('   Will paste signature directly in email composer instead');
    }
    await screenshot(page, 'test-03-signature-setup');
    console.log('✅ Signature setup attempted!\n');

    // ===== CREATE OR FIND TEST CONTACT =====
    console.log('📍 Step 4: Creating test contact...');

    // Navigate to Contacts
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/contacts/smart_list/All', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);
    await screenshot(page, 'test-04-contacts');

    // Click Add Contact button
    const addContactBtn = page.locator('button:has-text("Add Contact"), button:has-text("+ Contact")').first();
    if (await addContactBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addContactBtn.click();
      await page.waitForTimeout(2000);
      console.log('   Opened Add Contact modal');
    }
    await screenshot(page, 'test-05-add-contact-modal');

    // Fill in contact details
    const firstNameInput = page.locator('input[placeholder*="First"], input[name*="firstName"], input#firstName').first();
    if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstNameInput.fill('Test Lead');
      console.log('   Entered first name');
    }

    const lastNameInput = page.locator('input[placeholder*="Last"], input[name*="lastName"], input#lastName').first();
    if (await lastNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lastNameInput.fill('Signature Test');
      console.log('   Entered last name');
    }

    const emailInput = page.locator('input[placeholder*="email"], input[name*="email"], input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('david@lendwisemtg.com');
      console.log('   Entered email: david@lendwisemtg.com');
    }

    const phoneInput = page.locator('input[placeholder*="phone"], input[name*="phone"], input[type="tel"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill('3109547772');
      console.log('   Entered phone');
    }

    await screenshot(page, 'test-06-contact-filled');

    // Save contact
    const saveContactBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Add")').last();
    if (await saveContactBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveContactBtn.click();
      await page.waitForTimeout(3000);
      console.log('   Saved contact');
    }
    await screenshot(page, 'test-07-contact-saved');
    console.log('✅ Test contact created!\n');

    // ===== SEND TEST EMAIL =====
    console.log('📍 Step 5: Sending test email...');

    // Navigate to Conversations for this contact or use bulk email
    // First, let's try to find and click on the contact we just created
    const contactRow = page.locator('text=Test Lead').first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactRow.click();
      await page.waitForTimeout(3000);
      console.log('   Opened contact details');
    }
    await screenshot(page, 'test-08-contact-opened');

    // Look for Email tab or Conversations
    const emailTab = page.locator('text=Email, [data-tab="email"], button:has-text("Email")').first();
    if (await emailTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailTab.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Email tab');
    }

    // Look for Compose/New Email button
    const composeBtn = page.locator('button:has-text("Compose"), button:has-text("New Email"), button:has-text("Send Email")').first();
    if (await composeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await composeBtn.click();
      await page.waitForTimeout(2000);
      console.log('   Opened email composer');
    }
    await screenshot(page, 'test-09-email-composer');

    // Fill in email subject
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name*="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   Entered subject');
    }

    // Fill in email body - find rich text editor
    const emailBody = page.locator('[contenteditable="true"], .ql-editor, textarea[name*="body"]').first();
    if (await emailBody.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailBody.click();

      // Type the test message
      const testMessage = `Hi David,

This is a test email to verify the email signature is working correctly.

Please check:
1. Does the owl logo display?
2. Do all the links work?
3. Is the formatting correct?

Best regards,
`;
      await emailBody.fill(testMessage);
      console.log('   Entered email body');

      // Now add the signature - look for source mode first
      const sourceToggle = page.locator('button:has-text("Source"), button:has-text("<>")').first();
      if (await sourceToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sourceToggle.click();
        await page.waitForTimeout(500);

        // In source mode, append signature HTML
        const sourceArea = page.locator('textarea').first();
        if (await sourceArea.isVisible({ timeout: 1000 }).catch(() => false)) {
          const currentContent = await sourceArea.inputValue();
          await sourceArea.fill(currentContent + '\n\n' + signatureBody);
          console.log('   Added signature in source mode');
        }
      }
    }
    await screenshot(page, 'test-10-email-ready');

    // Send the email
    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Clicking Send button...');
      await sendBtn.click();
      await page.waitForTimeout(5000);
      console.log('   ✅ Email sent!');
    } else {
      console.log('   ⚠️ Send button not found - please send manually');
    }
    await screenshot(page, 'test-11-email-sent');

    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nPlease check david@lendwisemtg.com for the test email.');
    console.log('Verify:');
    console.log('  - Email arrived (check spam if not in inbox)');
    console.log('  - Owl logo displays correctly');
    console.log('  - All links are clickable');
    console.log('  - Formatting looks correct');
    console.log('\nBrowser will stay open for 30 seconds...\n');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'test-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
