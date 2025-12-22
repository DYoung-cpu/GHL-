const { chromium } = require('playwright');
const fs = require('fs');

// Script to test email signature in GHL - Version 3
// Correct workflow: Search contact -> Select -> Email tab -> Compose -> Send

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
  console.log('📧 GHL Email Signature Test - Version 3');
  console.log('='.repeat(50));
  console.log('Workflow: Search contact -> Select -> Email -> Send\n');

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

    // ===== GO TO CONVERSATIONS =====
    console.log('📍 Step 3: Navigating to Conversations...');
    await page.click('text=Conversations');
    await page.waitForTimeout(3000);
    await screenshot(page, 'v3-01-conversations');

    // ===== SEARCH FOR CONTACT =====
    console.log('📍 Step 4: Searching for contact...');

    // Click the search input in conversations
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await page.waitForTimeout(500);
      await searchInput.fill('david@lendwisemtg.com');
      console.log('   ✓ Typed search query');
      await page.waitForTimeout(2000);

      // Press Enter to search
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    await screenshot(page, 'v3-02-search');

    // ===== CREATE CONTACT IF NOT FOUND - USE THE COMPOSE ICON =====
    console.log('📍 Step 5: Looking for compose/new message icon...');

    // There's typically a compose icon (pen/paper) near the search
    // Let's look for it or click the icon that looks like a compose button
    const composeIcons = [
      'svg[data-icon="pen-to-square"]',
      'button[title*="compose"]',
      'button[title*="Compose"]',
      '[class*="compose"]',
      'svg[class*="compose"]',
      'a[href*="compose"]'
    ];

    let foundCompose = false;
    for (const selector of composeIcons) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        console.log('   ✓ Clicked compose icon');
        foundCompose = true;
        break;
      }
    }

    if (!foundCompose) {
      // Try clicking by coordinates - the icon is typically near the filter icons
      // Looking at screenshot, there's an icon at approximately x=523, y=163
      console.log('   Trying coordinate click for compose icon...');
      await page.mouse.click(523, 163);  // The pen-to-square icon
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'v3-03-compose-clicked');

    // ===== CHECK IF MODAL OPENED FOR NEW CONVERSATION =====
    console.log('📍 Step 6: Looking for new message modal/panel...');

    // Check for modal or input to enter recipient
    const recipientInputs = [
      'input[placeholder*="Enter"]',
      'input[placeholder*="recipient"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="contact"]',
      'input[placeholder*="To"]'
    ];

    for (const selector of recipientInputs) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.click();
        await input.fill('david@lendwisemtg.com');
        console.log('   ✓ Entered recipient');
        await page.waitForTimeout(1500);

        // Wait for dropdown result and click it
        const resultOption = page.locator('text=david@lendwisemtg.com').first();
        if (await resultOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await resultOption.click();
          console.log('   ✓ Selected contact from dropdown');
        } else {
          await page.keyboard.press('Enter');
        }
        break;
      }
    }
    await page.waitForTimeout(2000);
    await screenshot(page, 'v3-04-recipient-selected');

    // ===== CLICK EMAIL TAB =====
    console.log('📍 Step 7: Clicking Email tab...');

    // In GHL conversation view, there are tabs for SMS, Email, etc.
    // The Email tab might be an icon (envelope) or text
    const emailTabSelectors = [
      'svg[data-icon="envelope"]',
      '[data-tab="email"]',
      'button[title*="Email"]',
      'button:has(svg[data-icon="envelope"])',
      '[role="tab"]:has-text("Email")',
      'text=Email'
    ];

    for (const selector of emailTabSelectors) {
      const tab = page.locator(selector).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log('   ✓ Clicked Email tab');
        break;
      }
    }
    await page.waitForTimeout(2000);
    await screenshot(page, 'v3-05-email-tab');

    // ===== COMPOSE EMAIL =====
    console.log('📍 Step 8: Composing email...');

    // Look for subject input
    const subjectInput = page.locator('input[placeholder*="Subject"], input[name*="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.click();
      await subjectInput.fill('Email Signature Test - LendWise Mortgage');
      console.log('   ✓ Entered subject');
    }

    await page.waitForTimeout(500);

    // Look for email body editor
    const bodyEditor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
    if (await bodyEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyEditor.click();

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

---

`;
      await bodyEditor.fill(testMessage);
      console.log('   ✓ Entered email body');
    }

    await page.waitForTimeout(500);
    await screenshot(page, 'v3-06-email-body');

    // ===== TRY TO ADD SIGNATURE VIA SOURCE MODE =====
    console.log('📍 Step 9: Adding signature...');

    // Look for source/HTML toggle button
    const sourceBtn = page.locator('button:has-text("Source"), button:has-text("<>"), button[title*="source"], button[title*="HTML"]').first();
    if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sourceBtn.click();
      await page.waitForTimeout(500);

      const sourceArea = page.locator('textarea').first();
      if (await sourceArea.isVisible({ timeout: 1000 }).catch(() => false)) {
        const current = await sourceArea.inputValue();
        await sourceArea.fill(current + '\n\n' + signatureBody);
        console.log('   ✓ Added signature HTML');

        // Toggle back
        await sourceBtn.click();
      }
    } else {
      console.log('   ⚠️ Source mode not available, signature will need to be added manually');
    }

    await screenshot(page, 'v3-07-with-signature');

    // ===== SEND EMAIL =====
    console.log('📍 Step 10: Sending email...');

    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      console.log('   ✓ Clicked Send button');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠️ Send button not found');
    }

    await screenshot(page, 'v3-08-sent');

    // ===== DONE =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\nCheck your inbox at david@lendwisemtg.com');
    console.log('\nBrowser staying open for 90 seconds for manual review...\n');

    await page.waitForTimeout(90000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'v3-error');
    console.log('\nBrowser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
