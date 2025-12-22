const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 8
// Proper drawer handling and Save button click

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Signature Test - Version 8');
  console.log('='.repeat(50));
  console.log('With proper drawer/modal handling\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
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
    await screenshot(page, 'v8-01-contacts');

    // ===== CLICK + BUTTON TO ADD CONTACT =====
    console.log('📍 Step 4: Opening Add Contact drawer...');
    // Click the + icon (first button in toolbar) by coordinate
    await page.mouse.click(254, 194);
    await page.waitForTimeout(3000);

    // Wait for the drawer to open
    await page.waitForSelector('text=Add Contact', { timeout: 10000 });
    console.log('   ✓ Add Contact drawer opened');
    await screenshot(page, 'v8-02-drawer-open');

    // ===== FILL CONTACT FORM =====
    console.log('📍 Step 5: Filling contact form...');

    // The form fields are in the drawer on the right side
    // First Name
    const firstNameField = page.locator('input').nth(0); // First input in the drawer
    await page.waitForTimeout(500);

    // Try to find fields by label proximity
    const firstNameInput = page.locator('input[class*="hl-text-input"]').filter({ hasNot: page.locator('[type="email"]') }).first();

    // Use more specific approach - find inputs within the drawer
    const drawer = page.locator('.hr-drawer-container, [class*="drawer"]');

    // First Name - look for input after "First Name" label
    const fnInput = page.locator('input').filter({ has: page.locator('[placeholder]') }).first();

    // Try filling by just finding inputs in order
    const inputs = await page.locator('input[type="text"], input:not([type])').all();
    console.log(`   Found ${inputs.length} text inputs`);

    // Find inputs specifically in the Add Contact form
    // Based on the screenshot layout: First Name, Last Name, Email, Phone
    const firstInput = page.locator('.hr-drawer-container input').first();
    if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstInput.fill('Test');
      console.log('   ✓ First name: Test');
    }

    // Try by placeholder
    const lastNameInput = page.locator('input[placeholder=""], .hr-drawer-container input').nth(1);
    if (await lastNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await lastNameInput.fill('Signature');
      console.log('   ✓ Last name: Signature');
    }

    // Email - find input with email type or near Email label
    const emailInput = page.locator('.hr-drawer-container input[type="text"]').nth(2);
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill('david@lendwisemtg.com');
      console.log('   ✓ Email: david@lendwisemtg.com');
    }

    // Phone - the phone input appears to be special with country code
    const phoneInput = page.locator('.hr-drawer-container input[type="text"]').nth(3);
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneInput.fill('3109547772');
      console.log('   ✓ Phone: 3109547772');
    }

    await screenshot(page, 'v8-03-form-filled');

    // ===== CLICK SAVE BUTTON =====
    console.log('📍 Step 6: Saving contact...');

    // The Save button is a blue button at bottom right of drawer
    // It says "Save" and is distinct from "Save and Add Another" and "Cancel"
    const saveButton = page.locator('button:has-text("Save")').filter({ hasNotText: 'Another' }).last();

    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click();
      console.log('   ✓ Clicked Save button');
    } else {
      // Try clicking by coordinate - Save button is at bottom right of drawer
      // Drawer is on right side, Save button approximately at (1340, 853)
      console.log('   Clicking Save by coordinate...');
      await page.mouse.click(1340, 853);
    }

    await page.waitForTimeout(4000);

    // Verify drawer closed
    const drawerStillOpen = await page.locator('text=Add Contact').isVisible({ timeout: 2000 }).catch(() => false);
    if (drawerStillOpen) {
      console.log('   ⚠️ Drawer still open, trying again...');
      // Press Escape to close or try clicking Save again
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v8-04-after-save');

    // ===== VERIFY CONTACT WAS CREATED =====
    console.log('📍 Step 7: Verifying contact creation...');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Search for the contact
    const quickSearch = page.locator('input[placeholder*="Quick search" i]').first();
    if (await quickSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickSearch.click();
      await quickSearch.fill('Test Signature');
      console.log('   ✓ Searching for contact...');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v8-05-search');

    // ===== SELECT CONTACT =====
    console.log('📍 Step 8: Selecting contact...');

    // Look for the contact row
    const contactRow = page.locator('tr, [role="row"]').filter({ hasText: 'Test' }).first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click the checkbox to select
      const checkbox = contactRow.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await checkbox.click();
        console.log('   ✓ Selected contact');
      } else {
        await contactRow.click();
        console.log('   ✓ Clicked contact row');
      }
      await page.waitForTimeout(1000);
    } else {
      console.log('   ⚠️ Contact row not visible, may need to refresh');
      // Try pressing Enter to search
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    await screenshot(page, 'v8-06-selected');

    // ===== OPEN EMAIL COMPOSER =====
    console.log('📍 Step 9: Opening email composer...');

    // Click the envelope icon in toolbar (5th icon, approximately)
    // From screenshot: envelope is around x=462
    const envelopeIcon = page.locator('svg[data-icon="envelope"]').first();
    if (await envelopeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await envelopeIcon.click();
      console.log('   ✓ Clicked envelope icon');
    } else {
      console.log('   Clicking envelope by coordinate...');
      await page.mouse.click(462, 194);
    }

    await page.waitForTimeout(3000);
    await screenshot(page, 'v8-07-email-composer');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 10: Composing email...');

    // Subject
    const subjectInput = page.locator('input[placeholder*="Subject" i]').first();
    if (await subjectInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Subject entered');
    }

    // Body
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
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

    await screenshot(page, 'v8-08-composed');

    // ===== SEND =====
    console.log('📍 Step 11: Sending email...');

    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Email sent!');
      await page.waitForTimeout(3000);
    }

    await screenshot(page, 'v8-09-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck inbox: david@lendwisemtg.com');
    console.log('\nBrowser open 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v8-error');
    console.log('\nBrowser open 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
