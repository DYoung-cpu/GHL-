/**
 * Verify Snapshot Transfer to Mission Control
 * Check workflows, custom fields, tags, templates, etc.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/verify-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(60));
  console.log('  Verify Snapshot Transfer to Mission Control');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // === LOGIN ===
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
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

    console.log('✅ Logged in!\n');

    // === SWITCH TO MISSION CONTROL ===
    console.log('📍 Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await page.waitForTimeout(4000);
      }
    }

    // Dismiss any dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('✅ In Mission Control\n');

    // === CHECK WORKFLOWS ===
    console.log('📍 Checking Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/list`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'workflows');

    // Count workflows
    const workflowRows = await page.locator('tr').count();
    console.log(`   Found ${workflowRows} workflow rows`);

    // List workflow names
    const workflowNames = await page.locator('td:first-child, [class*="name"]').allTextContents();
    console.log('   Workflows:');
    workflowNames.slice(0, 20).forEach(name => {
      if (name.trim() && name.length > 2) console.log(`   - ${name.trim()}`);
    });

    // === CHECK CUSTOM FIELDS ===
    console.log('\n📍 Checking Custom Fields...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/custom_fields`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'custom-fields');

    const fieldCount = await page.locator('tr, [class*="field-item"]').count();
    console.log(`   Found ${fieldCount} custom field elements`);

    // === CHECK TAGS ===
    console.log('\n📍 Checking Tags...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/tags`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'tags');

    const tagCount = await page.locator('tr').count();
    console.log(`   Found ${tagCount} tag rows`);

    // === CHECK PIPELINES ===
    console.log('\n📍 Checking Pipelines...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/opportunities/list`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'pipelines');

    // === CHECK CALENDARS ===
    console.log('\n📍 Checking Calendars...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/calendars`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'calendars');

    // === CHECK EMAIL TEMPLATES ===
    console.log('\n📍 Checking Email Templates...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/marketing/emails`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'email-templates');

    // === CHECK FORMS ===
    console.log('\n📍 Checking Forms...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/funnels-websites/forms`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await ss(page, 'forms');

    // === SUMMARY ===
    console.log('\n' + '='.repeat(60));
    console.log('  TRANSFER VERIFICATION COMPLETE');
    console.log('  Screenshots saved to ./screenshots/verify-*.png');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
