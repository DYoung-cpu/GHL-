/**
 * GHL Audit Script
 * Logs in and checks what actually exists in the account
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `./screenshots/audit-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}`);
  return path;
}

(async () => {
  console.log('🔍 GHL AUDIT');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('\n📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await screenshot(page, '01-login-page');

    // Try Google One-Tap (iframe)
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google One-Tap iframe...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google One-Tap');
      }
    } else {
      // Fallback to Sign in with Google button
      const googleBtn = page.locator('text=Sign in with Google');
      if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
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

      // Email
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      // Password
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch (e) {
        console.log('   Password field not found, may already be logged in');
      }

      await page.waitForTimeout(8000);
    }

    // Check if logged in
    await screenshot(page, '02-after-login');
    console.log('✅ Login attempted\n');

    // ===== SWITCH SUB-ACCOUNT =====
    console.log('📍 Step 2: Checking sub-account...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
        console.log('   Switched to LENDWISE sub-account');
      }
    } else {
      console.log('   Already in correct account or no switcher shown');
    }
    await screenshot(page, '03-dashboard');
    console.log('✅ In sub-account\n');

    // ===== AUDIT WORKFLOWS =====
    console.log('📍 Step 3: Auditing Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '04-workflows');

    // Try to count workflows
    const workflowCards = await page.$$('[class*="workflow-card"], [class*="WorkflowCard"], tr[class*="workflow"]');
    const workflowRows = await page.$$('table tbody tr');

    // Check for empty state
    const emptyState = await page.locator('text=Start with a Template, text=If This Happens').isVisible({ timeout: 2000 }).catch(() => false);

    if (emptyState) {
      console.log('   ⚠️  WORKFLOWS: 0 (empty state detected)');
    } else {
      console.log(`   Found ${workflowCards.length || workflowRows.length || '?'} workflow elements`);
    }
    console.log('');

    // ===== AUDIT SNIPPETS =====
    console.log('📍 Step 4: Auditing Snippets (Marketing > Snippets)...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/marketing/snippets`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '05-snippets');

    // Try to get snippet count
    const snippetCount = await page.locator('text=/\\d+ snippet/i').textContent().catch(() => null);
    if (snippetCount) {
      console.log(`   SNIPPETS: ${snippetCount}`);
    } else {
      const snippetRows = await page.$$('table tbody tr, [class*="snippet-row"]');
      console.log(`   Found ${snippetRows.length} snippet rows`);
    }
    console.log('');

    // ===== AUDIT PIPELINE =====
    console.log('📍 Step 5: Auditing Pipeline...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/opportunities/list`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '06-pipeline');

    // Check pipeline name
    const pipelineName = await page.locator('[class*="pipeline-name"], [class*="PipelineName"], select option:checked').textContent().catch(() => 'Unknown');
    console.log(`   Pipeline: ${pipelineName}`);
    console.log('');

    // ===== AUDIT CUSTOM FIELDS =====
    console.log('📍 Step 6: Auditing Custom Fields...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/settings/custom-fields`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '07-custom-fields');
    console.log('   Screenshot saved');
    console.log('');

    // ===== AUDIT TAGS =====
    console.log('📍 Step 7: Auditing Tags...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/settings/tags`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '08-tags');

    const tagElements = await page.$$('[class*="tag-item"], [class*="TagItem"], table tbody tr');
    console.log(`   Found ${tagElements.length} tag elements`);
    console.log('');

    // ===== AUDIT CALENDARS =====
    console.log('📍 Step 8: Auditing Calendars...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/calendars/list`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '09-calendars');
    console.log('   Screenshot saved');
    console.log('');

    // ===== SUMMARY =====
    console.log('='.repeat(50));
    console.log('📋 AUDIT COMPLETE');
    console.log('='.repeat(50));
    console.log('\nScreenshots saved to ./screenshots/audit-*.png');
    console.log('Review screenshots to verify actual state.\n');

    console.log('Browser staying open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
