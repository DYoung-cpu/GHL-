/**
 * LENDWISE Mission Control - Browser Import Script
 *
 * This script imports email templates to GHL via browser automation.
 * GHL doesn't have an API for snippets - must use UI.
 *
 * Run with: node mission-control/import-via-browser.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Templates to import
const emailTemplates = [
  // Loan Status Emails
  { name: 'MC: Loan Status 01 - Application Completed', file: 'emails/loan-status/01-application-completed.html' },
  { name: 'MC: Loan Status 02 - Sent to Processing', file: 'emails/loan-status/02-sent-to-processing.html' },
  { name: 'MC: Loan Status 03 - Submitted to Underwriting', file: 'emails/loan-status/03-submitted-to-underwriting.html' },
  { name: 'MC: Loan Status 04 - Conditional Approval', file: 'emails/loan-status/04-conditional-approval.html' },
  { name: 'MC: Loan Status 05 - Loan Approved', file: 'emails/loan-status/05-loan-approved.html' },
  { name: 'MC: Loan Status 06 - Clear to Close', file: 'emails/loan-status/06-clear-to-close.html' },
  { name: 'MC: Loan Status 07 - Final Docs Ready', file: 'emails/loan-status/07-final-docs-ready.html' },
  { name: 'MC: Loan Status 08 - Funded Congratulations', file: 'emails/loan-status/08-funded-congratulations.html' },

  // Purchase Nurture
  { name: 'MC: Purchase 01 - Welcome', file: 'emails/nurture-sequences/purchase-01-welcome.html' },
  { name: 'MC: Purchase 02 - Pre-Approval', file: 'emails/nurture-sequences/purchase-02-preapproval.html' },
  { name: 'MC: Purchase 03 - Market Tips', file: 'emails/nurture-sequences/purchase-03-market-tips.html' },
  { name: 'MC: Purchase 04 - Check-In', file: 'emails/nurture-sequences/purchase-04-checkin.html' },
  { name: 'MC: Purchase 05 - Still Here', file: 'emails/nurture-sequences/purchase-05-still-here.html' },

  // Refinance Nurture
  { name: 'MC: Refinance 01 - Welcome', file: 'emails/nurture-sequences/refi-01-welcome.html' },
  { name: 'MC: Refinance 02 - Rate Analysis', file: 'emails/nurture-sequences/refi-02-rate-analysis.html' },
  { name: 'MC: Refinance 03 - Cash-Out', file: 'emails/nurture-sequences/refi-03-cashout.html' },
  { name: 'MC: Refinance 04 - Check-In', file: 'emails/nurture-sequences/refi-04-checkin.html' },
  { name: 'MC: Refinance 05 - Still Here', file: 'emails/nurture-sequences/refi-05-still-here.html' }
];

async function screenshot(page, name) {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  const filepath = path.join(screenshotsDir, `mc-${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`   📸 ${name}.png`);
}

(async () => {
  console.log('========================================');
  console.log('  Mission Control - Browser Import');
  console.log('========================================\n');
  console.log(`Importing ${emailTemplates.length} email templates\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let success = 0;
  let failed = 0;

  try {
    // ===== LOGIN =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Google One-Tap login
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

    // Wait for dashboard
    await page.waitForTimeout(5000);
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO MISSION CONTROL ACCOUNT =====
    console.log('📍 Switching to Mission Control - David Young...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      // Select Mission Control - David Young sub-account
      const mcAccount = page.locator('text=Mission Control').first();
      if (await mcAccount.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcAccount.click();
      } else {
        // Fallback - try David Young
        await page.locator('text=David Young').first().click();
      }
      await page.waitForTimeout(3000);
    }
    console.log('✅ In Mission Control account\n');

    // ===== NAVIGATE TO SNIPPETS =====
    console.log('📍 Navigating to Marketing > Snippets...');

    // Click Marketing in sidebar
    await page.click('text=Marketing');
    await page.waitForTimeout(2000);

    // Click Snippets tab at top (visible after Marketing clicked)
    const snippetsTab = page.locator('text=Snippets').first();
    if (await snippetsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await snippetsTab.click();
      await page.waitForTimeout(2000);
    } else {
      // Direct URL as fallback
      console.log('   Using direct URL...');
      await page.goto('https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/marketing/email/templates?tab=snippets');
      await page.waitForTimeout(3000);
    }
    await screenshot(page, 'snippets-page');
    console.log('✅ On Snippets page\n');

    // ===== IMPORT TEMPLATES =====
    console.log('📍 Importing templates...\n');

    for (const template of emailTemplates) {
      const filePath = path.join(__dirname, template.file);

      if (!fs.existsSync(filePath)) {
        console.log(`  ✗ File not found: ${template.file}`);
        failed++;
        continue;
      }

      const htmlContent = fs.readFileSync(filePath, 'utf8');

      try {
        // Click "+ New Snippet" button (top right, blue button)
        const addBtn = page.locator('#add-snippet-button');
        await addBtn.click();
        await page.waitForTimeout(800);

        // Click "Add Email Snippet" from dropdown
        await page.locator('text=Add Email Snippet').click();
        await page.waitForTimeout(1500);

        // Enter snippet name - exact placeholder match
        const nameInput = page.locator('input[placeholder="Enter Snippet Name"]');
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill(template.name);
        await page.waitForTimeout(300);

        // Enter subject line
        const subjectInput = page.locator('input[placeholder="Enter Subject"]');
        await subjectInput.fill(template.name);
        await page.waitForTimeout(300);

        // Click the source code button (<>) in the toolbar to enter HTML mode
        const sourceBtn = page.locator('button[title*="Source"], button:has-text("<>"), .ql-code-block, [aria-label*="code"], [aria-label*="html"]').first();
        if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sourceBtn.click();
          await page.waitForTimeout(500);
        }

        // Find the editor area - it's contenteditable div
        const editor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
        await editor.click();
        await page.waitForTimeout(200);

        // Select all and paste HTML
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);
        await editor.fill(htmlContent);
        await page.waitForTimeout(500);

        // Click Save button
        const saveBtn = page.locator('button:has-text("Save")').last();
        await saveBtn.click();
        await page.waitForTimeout(2500);

        // Wait for modal to close
        await page.waitForSelector('.hr-modal-mask', { state: 'hidden', timeout: 5000 }).catch(() => {});

        console.log(`  ✓ ${template.name}`);
        success++;

      } catch (err) {
        console.log(`  ✗ ${template.name} - ${err.message}`);
        failed++;
        await screenshot(page, `error-${template.name.replace(/[^a-z0-9]/gi, '-')}`);

        // Force close any modal - try Cancel first, then Escape
        try {
          const cancelBtn = page.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await cancelBtn.click();
            await page.waitForTimeout(1000);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
          }
        } catch (e) {
          // Force page reload as last resort
          await page.goto('https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/marketing/email/templates?tab=snippets');
          await page.waitForTimeout(3000);
        }
      }
    }

    console.log('\n========================================');
    console.log(`  Import Complete!`);
    console.log(`  ✓ Success: ${success}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log('========================================\n');

    await screenshot(page, 'import-complete');

  } catch (err) {
    console.error('Fatal error:', err.message);
    await screenshot(page, 'fatal-error');
  } finally {
    console.log('Closing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
