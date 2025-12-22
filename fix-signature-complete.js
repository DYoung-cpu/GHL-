const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🔧 Fixing and enabling signature...');

  // Read the correct signature HTML
  const signatureHtml = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/signature-for-ghl.html', 'utf8');
  console.log('📄 Loaded signature HTML (' + signatureHtml.length + ' chars)');

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
    // Login
    console.log('\n📍 Step 1: Logging in...');
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
    console.log('✅ Logged in!');

    // Switch to sub-account
    console.log('\n📍 Step 2: Switching to Lendwise...');
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

    // Navigate to Settings → My Staff
    console.log('\n📍 Step 3: Going to Settings → My Staff...');
    await page.click('text=Settings');
    await page.waitForTimeout(2000);

    const myStaff = page.locator('a:has-text("My Staff")');
    await myStaff.click();
    await page.waitForTimeout(3000);

    // Click edit on David Young
    console.log('\n📍 Step 4: Opening David Young profile...');
    const davidRow = page.locator('tr:has-text("David Young")');
    const editBtn = davidRow.locator('svg').first();
    await editBtn.click();
    await page.waitForTimeout(3000);

    // Scroll to find signature section
    console.log('\n📍 Step 5: Finding signature section...');

    // Look for "User Info" section and expand if needed
    const userInfo = page.locator('text=User Info').first();
    if (await userInfo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInfo.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down to signature
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal') || document.body;
      modal.scrollTop = modal.scrollHeight;
    });
    await page.waitForTimeout(1000);

    // Enable signature toggle if not already
    console.log('\n📍 Step 6: Enabling signature toggle...');
    const signatureToggle = page.locator('text=Enable signature on all outgoing messages').locator('..').locator('input[type="checkbox"], [role="switch"]');

    // Try to find and click the toggle
    const toggleContainer = page.locator('label:has-text("Enable signature"), div:has-text("Enable signature on all outgoing")').first();
    if (await toggleContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check if already enabled
      const isChecked = await page.evaluate(() => {
        const toggle = document.querySelector('input[type="checkbox"]');
        return toggle ? toggle.checked : false;
      });

      if (!isChecked) {
        await toggleContainer.click();
        console.log('   ✓ Toggled signature ON');
      } else {
        console.log('   ✓ Signature already enabled');
      }
    }
    await page.waitForTimeout(1000);

    // Find signature editor
    console.log('\n📍 Step 7: Finding signature editor...');

    // Look for the signature text area or rich text editor
    const signatureLabel = page.locator('text=Signature').first();
    await signatureLabel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Click source code button
    console.log('\n📍 Step 8: Clicking source code button...');
    const sourceBtn = page.locator('button:has(svg), [title*="source"], [aria-label*="source"], button >> text=</>').first();

    // Try multiple selectors for source code button
    const possibleSourceBtns = [
      page.locator('[data-testid="source-code"]'),
      page.locator('button:has-text("</>")'),
      page.locator('[title="Source code"]'),
      page.locator('svg[data-icon="code"]').locator('..'),
    ];

    for (const btn of possibleSourceBtns) {
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        console.log('   ✓ Clicked source code button');
        break;
      }
    }
    await page.waitForTimeout(1500);

    // Paste HTML in source code modal
    console.log('\n📍 Step 9: Pasting signature HTML...');

    // Find textarea in source code modal
    const sourceTextarea = page.locator('textarea, [contenteditable="true"]').last();
    if (await sourceTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sourceTextarea.click();
      await sourceTextarea.press('Control+a');
      await sourceTextarea.fill(signatureHtml);
      console.log('   ✓ Pasted signature HTML');
    }
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-pasted.png' });

    // Click Save in source code modal
    console.log('\n📍 Step 10: Saving source code...');
    const saveSourceBtn = page.locator('button:has-text("Save")').first();
    if (await saveSourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveSourceBtn.click();
      console.log('   ✓ Saved source code');
    }
    await page.waitForTimeout(2000);

    // Click Next/Save to save user profile
    console.log('\n📍 Step 11: Saving user profile...');
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save")').last();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      console.log('   ✓ Clicked Next/Save');
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/signature-saved.png' });

    console.log('\n✅ Signature should now be saved and enabled!');
    console.log('\n========================================');
    console.log('Now sending test email...');
    console.log('========================================\n');

    // Navigate to Contacts to send test email
    await page.click('text=Contacts');
    await page.waitForTimeout(3000);

    // Search for test contact
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('david@lendwisemtg.com');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Click on contact
    const contactRow = page.locator('tr:has-text("david@lendwisemtg.com"), tr:has-text("Test Signature")').first();
    if (await contactRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contactRow.click();
      await page.waitForTimeout(3000);
    }

    // Click email tab/compose
    const emailTab = page.locator('text=Email').first();
    if (await emailTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailTab.click();
      await page.waitForTimeout(2000);
    }

    // Fill subject
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.fill('Signature Test - ' + new Date().toLocaleTimeString());
    }

    // Type message
    const bodyInput = page.locator('[contenteditable="true"]').first();
    if (await bodyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyInput.click();
      await bodyInput.type('This is a test email to verify the signature appears correctly.');
    }

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/test-email-with-signature.png' });
    console.log('📸 Screenshot: test-email-with-signature.png');

    // Click Send
    console.log('\n📍 Sending email...');
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('✅ Email sent! Check your inbox at david@lendwisemtg.com');
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/email-sent.png' });

    console.log('\n========================================');
    console.log('Done! Check david@lendwisemtg.com for the test email.');
    console.log('Browser stays open for 2 minutes.');
    console.log('========================================\n');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/fix-signature-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
