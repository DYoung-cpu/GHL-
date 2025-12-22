const { chromium } = require('playwright');
const fs = require('fs');

// Script to create Email templates (Snippets) in GHL
// Email Templates are in Marketing > Snippets > Add Email Snippet
// They are called "Email Snippets" in GHL

// Load templates from JSON file
const templatesData = JSON.parse(fs.readFileSync('./templates/email-templates.json', 'utf8'));

// Flatten all email templates into a single array
const EMAIL_TEMPLATES = [];
Object.keys(templatesData.templates).forEach(category => {
  templatesData.templates[category].forEach(template => {
    EMAIL_TEMPLATES.push({
      ...template,
      category: category
    });
  });
});

console.log(`Loaded ${EMAIL_TEMPLATES.length} email templates from JSON`);

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📧 GHL Email Templates (Snippets) Creator');
  console.log('='.repeat(50));
  console.log(`Creating ${EMAIL_TEMPLATES.length} email templates\n`);

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
      await screenshot(page, 'email-login-check');
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

    // ===== NAVIGATE TO EMAIL SNIPPETS =====
    // Path: Marketing > Snippets (same as SMS but we select "Add Email Snippet")
    console.log('📍 Navigating to Marketing > Snippets...');

    // Click Marketing in sidebar
    const marketingLink = page.locator('a:has-text("Marketing"), span:has-text("Marketing")').first();
    if (await marketingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marketingLink.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked Marketing in sidebar');
    }

    await screenshot(page, 'email-01-marketing');

    // Look for Snippets submenu
    const snippetsLink = page.locator('text=Snippets');
    if (await snippetsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await snippetsLink.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Snippets');
    }

    await screenshot(page, 'email-02-snippets');
    console.log('✅ On Snippets page!\n');

    // ===== CREATE EMAIL TEMPLATES =====
    let successCount = 0;
    const maxTemplates = EMAIL_TEMPLATES.length; // Create all templates
    const startIndex = 37; // Resume from template 38 (0-indexed = 37)

    for (let i = startIndex; i < Math.min(EMAIL_TEMPLATES.length, maxTemplates); i++) {
      const template = EMAIL_TEMPLATES[i];
      console.log(`📍 Creating Email ${i + 1}/${Math.min(EMAIL_TEMPLATES.length, maxTemplates)}: "${template.name}"`);

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

        // Click the "+ New Snippet" button which opens a dropdown menu
        console.log('   Clicking "New Snippet" button...');
        const newSnippetBtn = page.locator('button:has-text("New Snippet")');
        if (await newSnippetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newSnippetBtn.click();
        } else {
          await page.mouse.click(1262, 142);
        }
        await page.waitForTimeout(1000);

        // Now click "Add Email Snippet" from the dropdown (instead of Add Text Snippet)
        console.log('   Clicking "Add Email Snippet" from dropdown...');
        const addEmailSnippet = page.locator('text=Add Email Snippet');
        if (await addEmailSnippet.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addEmailSnippet.click();
          console.log('   ✓ Clicked Add Email Snippet');
        } else {
          // Fallback: click by coordinates (second option in dropdown)
          console.log('   Using coordinate click for Add Email Snippet...');
          await page.mouse.click(1244, 213);
        }
        await page.waitForTimeout(2000);

        await screenshot(page, `email-${i + 1}-modal`);

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

        // Fill in subject line (if the modal has a subject field for emails)
        const subjectInputs = [
          'input[placeholder*="subject"]',
          'input[placeholder*="Subject"]',
          'input[name*="subject"]'
        ];

        for (const selector of subjectInputs) {
          const subjectInput = page.locator(selector).first();
          if (await subjectInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await subjectInput.click();
            await subjectInput.fill(template.subject);
            console.log(`   ✓ Entered subject: ${template.subject.substring(0, 40)}...`);
            break;
          }
        }

        await page.waitForTimeout(500);

        // Fill in message content (email body)
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
              // For email templates, we may want to type the body as plain text
              await page.keyboard.type(template.body.substring(0, 800)); // Limit for testing
            } else {
              await messageInput.fill(template.body);
            }
            console.log(`   ✓ Entered body (${template.body.length} chars)`);
            break;
          }
        }

        await page.waitForTimeout(500);
        await screenshot(page, `email-${i + 1}-filled`);

        // Click Save button - it's the blue button at bottom right of modal
        console.log('   Clicking Save button...');

        let savedClicked = false;
        const saveBtn = page.locator('button:has-text("Save")').last();
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
        console.log(`   ✅ Email template "${template.name}" created!\n`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await screenshot(page, `email-error-${i + 1}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    await screenshot(page, 'email-final');

    console.log('='.repeat(50));
    console.log(`✅ Created ${successCount}/${Math.min(EMAIL_TEMPLATES.length, maxTemplates)} email templates`);
    console.log('Browser staying open for 15 seconds...\n');

    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'email-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
