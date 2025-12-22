const { chromium } = require('playwright');
const fs = require('fs');

// Script to create SMS templates (Snippets) in GHL
// SMS Templates are in Marketing > Templates OR Conversations > Templates
// They are called "Snippets" in GHL

// Load templates from JSON file
const templatesData = JSON.parse(fs.readFileSync('./templates/sms-templates.json', 'utf8'));

// Flatten all SMS templates into a single array
const SMS_TEMPLATES = [];
Object.keys(templatesData.templates).forEach(category => {
  templatesData.templates[category].forEach(template => {
    SMS_TEMPLATES.push({
      ...template,
      category: category
    });
  });
});

console.log(`Loaded ${SMS_TEMPLATES.length} SMS templates from JSON`);

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📱 GHL SMS Templates (Snippets) Creator');
  console.log('='.repeat(50));
  console.log(`Creating ${SMS_TEMPLATES.length} SMS templates\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('📍 Logging into GHL...');
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
      await screenshot(page, 'sms-login-check');
    }
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise Mortgage...');
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

    // ===== NAVIGATE TO SMS TEMPLATES (SNIPPETS) =====
    // Path: Marketing > Templates > SMS Templates
    console.log('📍 Navigating to Marketing > Templates...');

    // Click Marketing in sidebar
    const marketingLink = page.locator('a:has-text("Marketing"), span:has-text("Marketing")').first();
    if (await marketingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marketingLink.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked Marketing in sidebar');
    }

    await screenshot(page, 'sms-01-marketing');

    // Look for Email Marketing or Templates submenu
    const templatesMenuItems = [
      'Templates',
      'Email Marketing',
      'emails'
    ];

    for (const menuItem of templatesMenuItems) {
      const menuLink = page.locator(`a:has-text("${menuItem}"), span:has-text("${menuItem}")`).first();
      if (await menuLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuLink.click();
        await page.waitForTimeout(2000);
        console.log(`   Clicked ${menuItem}`);
        break;
      }
    }

    await screenshot(page, 'sms-02-email-marketing');

    // Now look for Templates tab/button
    const templatesTab = page.locator('text=Templates').first();
    if (await templatesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templatesTab.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Templates tab');
    }

    await screenshot(page, 'sms-03-templates-page');

    // Look for SMS Templates option or tab
    const smsTemplateOptions = [
      'SMS Templates',
      'SMS',
      'Text',
      'Snippets'
    ];

    for (const option of smsTemplateOptions) {
      const smsLink = page.locator(`text=${option}`).first();
      if (await smsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await smsLink.click();
        await page.waitForTimeout(2000);
        console.log(`   Clicked ${option}`);
        break;
      }
    }

    await screenshot(page, 'sms-04-sms-templates');
    console.log('✅ On SMS Templates page!\n');

    // ===== CREATE SMS TEMPLATES =====
    let successCount = 0;
    const maxTemplates = SMS_TEMPLATES.length; // Create all 40 templates

    for (let i = 0; i < Math.min(SMS_TEMPLATES.length, maxTemplates); i++) {
      const template = SMS_TEMPLATES[i];
      console.log(`📍 Creating SMS ${i + 1}/${Math.min(SMS_TEMPLATES.length, maxTemplates)}: "${template.name}"`);

      try {
        // Wait for any modals to close first
        await page.waitForTimeout(1000);

        // Dismiss any open modals by pressing Escape
        const modalMask = page.locator('.hr-modal-mask');
        if (await modalMask.isVisible({ timeout: 500 }).catch(() => false)) {
          console.log('   Closing existing modal...');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }

        // Click the blue "+ New Snippet" button which opens a dropdown menu
        // Then select "Add Text Snippet" from the dropdown
        // Based on screenshot sms-04-sms-templates.png:
        // - "+ New Snippet" blue button is at approximately (1262, 142)
        // - "Add Text Snippet" dropdown option appears below at approximately (1244, 185)

        console.log('   Clicking "New Snippet" button...');
        const newSnippetBtn = page.locator('button:has-text("New Snippet")');
        if (await newSnippetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newSnippetBtn.click();
        } else {
          await page.mouse.click(1262, 142);
        }
        await page.waitForTimeout(1000);

        // Now click "Add Text Snippet" from the dropdown
        console.log('   Clicking "Add Text Snippet" from dropdown...');
        const addTextSnippet = page.locator('text=Add Text Snippet');
        if (await addTextSnippet.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addTextSnippet.click();
          console.log('   ✓ Clicked Add Text Snippet');
        } else {
          // Fallback: click by coordinates (based on dropdown position in screenshot)
          console.log('   Using coordinate click for Add Text Snippet...');
          await page.mouse.click(1244, 185);
        }
        await page.waitForTimeout(2000);

        await screenshot(page, `sms-${i + 1}-modal`);

        // Fill in template name
        const nameInputSelectors = [
          'input[placeholder*="name"]',
          'input[placeholder*="Name"]',
          'input[name*="name"]',
          'input[id*="name"]',
          'input[type="text"]'
        ];

        for (const selector of nameInputSelectors) {
          const nameInput = page.locator(selector).first();
          if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nameInput.click();
            await nameInput.fill(template.name);
            console.log(`   ✓ Entered name: ${template.name}`);
            break;
          }
        }

        await page.waitForTimeout(500);

        // Fill in message content
        const messageInputSelectors = [
          'textarea',
          '[contenteditable="true"]',
          'div[role="textbox"]',
          '.message-input',
          '#message'
        ];

        for (const selector of messageInputSelectors) {
          const messageInput = page.locator(selector).first();
          if (await messageInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await messageInput.click();
            // Check if it's contenteditable
            const isContentEditable = await messageInput.getAttribute('contenteditable');
            if (isContentEditable === 'true') {
              await page.keyboard.type(template.message);
            } else {
              await messageInput.fill(template.message);
            }
            console.log(`   ✓ Entered message (${template.message.length} chars)`);
            break;
          }
        }

        await page.waitForTimeout(500);
        await screenshot(page, `sms-${i + 1}-filled`);

        // Click Save button - it's the blue button at bottom right of modal
        // Based on screenshot, Save button is at approximately (1016, 710)
        console.log('   Clicking Save button...');

        let savedClicked = false;
        const saveBtn = page.locator('button:has-text("Save")').last(); // Use last() to get the modal Save, not any other
        if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveBtn.click();
          savedClicked = true;
          console.log(`   ✓ Clicked Save button`);
        }

        if (!savedClicked) {
          // Fallback: coordinate-based click
          console.log('   Using coordinate click for Save...');
          await page.mouse.click(1016, 710);
        }

        await page.waitForTimeout(2500); // Wait for save to complete

        // Check for success toast or modal
        const successIndicators = [
          'text=Success',
          'text=Created',
          'text=Saved',
          '.toast-success'
        ];

        for (const selector of successIndicators) {
          if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('   ✓ Success indicator found');
            break;
          }
        }

        successCount++;
        console.log(`   ✅ SMS template "${template.name}" created!\n`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await screenshot(page, `sms-error-${i + 1}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    await screenshot(page, 'sms-final');

    console.log('='.repeat(50));
    console.log(`✅ Created ${successCount}/${Math.min(SMS_TEMPLATES.length, maxTemplates)} SMS templates`);
    console.log('Browser staying open for 15 seconds...\n');

    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'sms-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
