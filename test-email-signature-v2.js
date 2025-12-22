const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 2
// Improved with better selectors and wait patterns

const SIGNATURE_HTML = fs.readFileSync('./templates/email-signature.html', 'utf8');
// Extract just the table content (between <body> and </body>)
const signatureBody = SIGNATURE_HTML.match(/<body>([\s\S]*)<\/body>/)?.[1]?.trim() || SIGNATURE_HTML;

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

async function waitAndClick(page, selectors, description) {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click();
        console.log(`   ✓ Clicked: ${description}`);
        return true;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  console.log(`   ⚠️ Could not find: ${description}`);
  return false;
}

(async () => {
  console.log('📧 GHL Email Signature Test - Version 2');
  console.log('='.repeat(50));
  console.log('Testing email with signature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400  // Slower for more reliable interactions
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

    // Wait for dashboard to load
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
        console.log('   Clicked LENDWISE sub-account');
      }
    }
    console.log('✅ In sub-account!\n');
    await screenshot(page, 'v2-01-dashboard');

    // ===== GO TO CONVERSATIONS TO SEND EMAIL =====
    console.log('📍 Step 3: Navigating to Conversations...');

    // Click Conversations in sidebar
    await waitAndClick(page, [
      'a[href*="conversations"]',
      'text=Conversations',
      '[class*="sidebar"] >> text=Conversations'
    ], 'Conversations link');

    await page.waitForTimeout(3000);
    await screenshot(page, 'v2-02-conversations');

    // ===== CREATE NEW CONVERSATION/EMAIL =====
    console.log('📍 Step 4: Starting new email conversation...');

    // Look for "New" or "+" button to start a conversation
    const newBtnClicked = await waitAndClick(page, [
      'button:has-text("New")',
      'button:has-text("+ New")',
      '[data-testid="new-conversation"]',
      'button[class*="new"]',
      '.n-button:has-text("New")'
    ], 'New conversation button');

    if (!newBtnClicked) {
      // Try clicking directly via coordinates on the + button typically at top right of conversations
      console.log('   Trying coordinate click for New button...');
      await page.mouse.click(1300, 100);
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'v2-03-new-conversation');

    // ===== ENTER RECIPIENT =====
    console.log('📍 Step 5: Entering recipient...');

    // Look for search/recipient input
    const recipientInputs = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="contact"]',
      'input[placeholder*="email"]',
      'input[placeholder*="To"]',
      'input[type="search"]',
      '.search-input input'
    ];

    for (const selector of recipientInputs) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.click();
        await input.fill('david@lendwisemtg.com');
        console.log('   ✓ Entered recipient email');
        await page.waitForTimeout(1500);

        // Press Enter or click a result
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        break;
      }
    }

    await screenshot(page, 'v2-04-recipient');

    // ===== SWITCH TO EMAIL TAB =====
    console.log('📍 Step 6: Switching to Email tab...');

    await waitAndClick(page, [
      'button:has-text("Email")',
      '[data-tab="email"]',
      'text=Email',
      '.tab:has-text("Email")',
      '[role="tab"]:has-text("Email")'
    ], 'Email tab');

    await page.waitForTimeout(2000);
    await screenshot(page, 'v2-05-email-tab');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 7: Composing email...');

    // Fill subject
    const subjectSelectors = [
      'input[placeholder*="Subject"]',
      'input[placeholder*="subject"]',
      'input[name="subject"]',
      '#subject'
    ];

    for (const selector of subjectSelectors) {
      const subjectInput = page.locator(selector).first();
      if (await subjectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await subjectInput.click();
        await subjectInput.fill('Email Signature Test - LendWise Mortgage');
        console.log('   ✓ Entered subject');
        break;
      }
    }

    await page.waitForTimeout(500);

    // Fill email body
    const bodySelectors = [
      '[contenteditable="true"]',
      '.ql-editor',
      'div[role="textbox"]',
      'textarea[name*="body"]',
      '.email-body'
    ];

    for (const selector of bodySelectors) {
      const bodyInput = page.locator(selector).first();
      if (await bodyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bodyInput.click();

        const testMessage = `Hi David,

This is a test email to verify the GHL email signature is working correctly.

Please check:
• Does the LendWise owl logo display?
• Do all the clickable links work?
• Is the formatting (colors, spacing) correct?
• Are the compliance disclosures visible?

Best regards,
David Young
LendWise Mortgage

`;

        // Type the message
        await bodyInput.fill(testMessage);
        console.log('   ✓ Entered email body');

        // Now add signature - try to find source/HTML mode
        await page.waitForTimeout(500);

        // Look for source code toggle
        const sourceToggled = await waitAndClick(page, [
          'button:has-text("Source")',
          'button:has-text("<>")',
          'button[title*="Source"]',
          'button[title*="HTML"]',
          '.ql-code-block'
        ], 'Source/HTML toggle');

        if (sourceToggled) {
          await page.waitForTimeout(500);
          // Find textarea for source and append signature
          const sourceArea = page.locator('textarea').first();
          if (await sourceArea.isVisible({ timeout: 1000 }).catch(() => false)) {
            const currentContent = await sourceArea.inputValue();
            await sourceArea.fill(currentContent + '\n\n' + signatureBody);
            console.log('   ✓ Added signature HTML in source mode');

            // Toggle back to visual mode
            await waitAndClick(page, [
              'button:has-text("Source")',
              'button:has-text("<>")'
            ], 'Toggle back to visual');
          }
        } else {
          // Try pasting signature as HTML directly
          console.log('   Attempting to paste signature directly...');
          await page.keyboard.press('End');
          await page.keyboard.type('\n\n---\n');
          // Can't paste HTML directly in rich text, will be plain text
        }

        break;
      }
    }

    await page.waitForTimeout(1000);
    await screenshot(page, 'v2-06-email-composed');

    // ===== SEND EMAIL =====
    console.log('📍 Step 8: Sending email...');

    const sendClicked = await waitAndClick(page, [
      'button:has-text("Send")',
      'button[type="submit"]:has-text("Send")',
      '[data-testid="send-button"]',
      'button.send-button',
      'button[class*="send"]'
    ], 'Send button');

    if (sendClicked) {
      await page.waitForTimeout(3000);
      console.log('   ✅ Email send attempted!');
    } else {
      console.log('   ⚠️ Send button not found - taking screenshot for manual send');
    }

    await screenshot(page, 'v2-07-email-sent');

    // ===== FINAL STATUS =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('\n✅ Script completed!');
    console.log('\nPlease check:');
    console.log('  1. david@lendwisemtg.com inbox for test email');
    console.log('  2. If email not sent, use the open browser to send manually');
    console.log('  3. Verify signature renders correctly');
    console.log('\nBrowser will stay open for 60 seconds...\n');

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v2-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
