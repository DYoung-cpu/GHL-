/**
 * Automated Workflow Builder for GHL
 * Logs in automatically and builds workflow actions
 */

const { chromium } = require('playwright');
const fs = require('fs');

const GHL_URL = 'https://app.gohighlevel.com';
const WORKFLOW_URL = 'https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/workflow/folder';

// Credentials
const EMAIL = 'david@lendwisemtg.com';
const PASSWORD = 'Fafa2185!';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function automateWorkflow() {
  console.log('='.repeat(60));
  console.log('GHL WORKFLOW AUTOMATION');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Go to GHL
    console.log('\n1. Navigating to GHL...');
    await page.goto(GHL_URL);
    await delay(2000);

    // Check if we need to log in
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('login') || currentUrl.includes('oauth')) {
      console.log('\n2. Logging in with Google...');

      // Look for Google sign-in button
      const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google"), [data-provider="google"]').first();
      if (await googleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Found Google button, clicking...');
        await googleBtn.click();
        await delay(3000);
      }

      // Handle Google OAuth flow
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Entering email...');
        await emailInput.fill(EMAIL);
        await page.locator('button:has-text("Next"), #identifierNext').first().click();
        await delay(3000);
      }

      // Enter password
      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('   Entering password...');
        await passwordInput.fill(PASSWORD);
        await page.locator('button:has-text("Next"), #passwordNext').first().click();
        await delay(5000);
      }
    }

    // Wait for dashboard to load
    console.log('\n3. Waiting for dashboard...');
    await delay(5000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/auto-login.png' });
    console.log('   Screenshot: auto-login.png');

    // Check if we need to select sub-account
    const switchBtn = page.locator('text=Click here to switch, text=LENDWISE').first();
    if (await switchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Selecting LENDWISE sub-account...');
      await switchBtn.click();
      await delay(2000);

      const lendwiseOption = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwiseOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lendwiseOption.click();
        await delay(3000);
      }
    }

    // Navigate to Workflows
    console.log('\n4. Navigating to Workflows...');
    await page.goto(WORKFLOW_URL);
    await delay(3000);

    // Take screenshot of workflows page
    await page.screenshot({ path: 'screenshots/workflows-page.png' });
    console.log('   Screenshot: workflows-page.png');

    // Save the session for future use
    console.log('\n5. Saving session...');
    await context.storageState({ path: 'auth.json' });
    console.log('   Session saved to auth.json');

    // Find and click on Appointment Reminder Sequence
    console.log('\n6. Looking for workflows...');

    // List all visible workflow names
    const workflowCards = await page.locator('[class*="workflow"], [class*="card"]').all();
    console.log(`   Found ${workflowCards.length} potential workflow cards`);

    // Look for specific workflow
    const appointmentWorkflow = page.locator('text=Appointment Reminder Sequence').first();
    if (await appointmentWorkflow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found "Appointment Reminder Sequence"!');
      await appointmentWorkflow.click();
      await delay(3000);
    } else {
      // Try to find any workflow
      console.log('   Looking for any workflow link...');
      const anyWorkflow = page.locator('a[href*="workflow"]').first();
      if (await anyWorkflow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyWorkflow.click();
        await delay(3000);
      }
    }

    // Take screenshot of workflow builder
    await page.screenshot({ path: 'screenshots/workflow-builder-auto.png' });
    console.log('   Screenshot: workflow-builder-auto.png');

    // Now analyze the workflow builder
    console.log('\n7. Analyzing workflow builder...');
    const currentBuilderUrl = page.url();
    console.log('   URL:', currentBuilderUrl);

    // Look for workflow elements
    const triggerBlock = await page.locator('text=Trigger').first();
    const hasWorkflowBuilder = await triggerBlock.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasWorkflowBuilder) {
      console.log('   Found workflow builder elements');

      // Look for the "+" button to add actions
      console.log('\n8. Looking for Add Action button...');

      // Common patterns for add action in GHL
      const addSelectors = [
        'button:has(svg[class*="plus"])',
        '[class*="add-action"]',
        '[class*="add-node"]',
        'button[aria-label*="add" i]',
        '[data-testid*="add"]',
        '.react-flow__node button',
        'text=Add Action'
      ];

      for (const selector of addSelectors) {
        const el = await page.locator(selector).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`   Found element with: ${selector}`);
        }
      }

      // Save the HTML for analysis
      const html = await page.content();
      fs.writeFileSync('workflow-builder-html.html', html);
      console.log('   Saved HTML to workflow-builder-html.html');
    }

    console.log('\n' + '='.repeat(60));
    console.log('AUTOMATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nBrowser will stay open. Check the screenshots folder.');
    console.log('Press Ctrl+C to close when done inspecting.');

    // Keep browser open for inspection
    await delay(300000); // 5 minutes

  } catch (error) {
    console.error('\nError:', error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

automateWorkflow();
