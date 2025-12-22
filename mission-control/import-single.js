/**
 * Import single missing template: MC: Loan Status 06 - Clear to Close
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const template = {
  name: 'MC: Loan Status 06 - Clear to Close',
  file: 'emails/loan-status/06-clear-to-close.html'
};

(async () => {
  console.log('Importing missing template: ' + template.name);

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Login
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }
    await page.waitForTimeout(5000);
    console.log('✅ Logged in!');

    // Switch account
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }

    // Navigate to snippets via direct URL
    console.log('📍 Navigating to Snippets...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/marketing/email/templates?tab=snippets', { timeout: 60000 });
    await page.waitForTimeout(8000);

    // Take screenshot of current state
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'mc-single-debug.png'), fullPage: true });
    console.log('   📸 single-debug.png');

    // Import template
    const filePath = path.join(__dirname, template.file);
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Wait for page to fully load and find button
    console.log('📍 Looking for New Snippet button...');
    const addBtn = page.locator('button:has-text("New Snippet"), #add-snippet-button').first();
    await addBtn.waitFor({ state: 'visible', timeout: 30000 });
    await addBtn.click();
    await page.waitForTimeout(800);
    await page.locator('text=Add Email Snippet').click();
    await page.waitForTimeout(1500);

    const nameInput = page.locator('input[placeholder="Enter Snippet Name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill(template.name);
    await page.waitForTimeout(300);

    const subjectInput = page.locator('input[placeholder="Enter Subject"]');
    await subjectInput.fill(template.name);
    await page.waitForTimeout(300);

    const editor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await editor.fill(htmlContent);
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Save")').last().click();
    await page.waitForTimeout(2500);

    console.log('✅ ' + template.name + ' imported!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('Closing browser...');
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
