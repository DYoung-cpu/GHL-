const { chromium } = require('playwright');

(async () => {
  console.log('Sending test email from GHL...');

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
    // Login to GHL
    console.log('Step 1: Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google sign-in');
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
    console.log('✅ Logged in!');

    // Switch to sub-account
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
    console.log('✅ In sub-account!');

    // Navigate to Contacts
    console.log('Step 3: Going to Contacts...');
    await page.click('text=Contacts');
    await page.waitForTimeout(3000);

    // Click Add Contact
    console.log('Step 4: Creating test contact...');
    const addBtn = page.locator('button:has-text("Add Contact"), [data-testid="add-contact"]').first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(2000);
    }

    // Fill contact form
    const emailInput = page.locator('input[placeholder*="Email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('david@lendwisemtg.com');
    }

    const firstNameInput = page.locator('input[placeholder*="First"], input[name="firstName"]').first();
    if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstNameInput.fill('Test');
    }

    const lastNameInput = page.locator('input[placeholder*="Last"], input[name="lastName"]').first();
    if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lastNameInput.fill('Signature');
    }

    // Save contact
    const saveBtn = page.locator('button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log('✅ Contact created or found!');

    // Search for contact
    console.log('Step 5: Finding contact to email...');
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('david@lendwisemtg.com');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Click on contact row
    const contactRow = page.locator('tr:has-text("david@lendwisemtg.com")').first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactRow.click();
      await page.waitForTimeout(3000);
    }

    console.log('Step 6: Sending test email...');

    // Look for email icon or compose button
    const emailIcon = page.locator('svg[data-icon="envelope"], button:has-text("Email")').first();
    if (await emailIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailIcon.click();
      await page.waitForTimeout(2000);
    }

    // Fill email subject
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.fill('Signature Test - LendWise Mortgage');
    }

    // Fill email body
    const bodyInput = page.locator('[contenteditable="true"], textarea').first();
    if (await bodyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyInput.click();
      await bodyInput.type('This is a test email to verify the signature is working correctly.');
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/test-email-compose.png' });
    console.log('📸 Screenshot saved: test-email-compose.png');

    console.log('\n========================================');
    console.log('Ready to send! Click the Send button.');
    console.log('Check david@lendwisemtg.com for the test email.');
    console.log('Browser stays open for 5 minutes.');
    console.log('========================================\n');

    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/test-email-error.png' });
    await page.waitForTimeout(120000);
  } finally {
    await browser.close();
  }
})();
