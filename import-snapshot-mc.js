/**
 * Import Snapshot INTO Mission Control
 * Instead of pushing from Agency, pull from Sub-Account side
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/import-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Import Snapshot INTO Mission Control');
  console.log('='.repeat(50));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // === LOGIN ===
    console.log('📍 Step 1: Logging into GHL...');
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

    // === SWITCH TO MISSION CONTROL SUB-ACCOUNT ===
    console.log('📍 Step 2: Switching to Mission Control sub-account...');

    // Click on the account switcher
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await ss(page, 'switcher-open');

      // Look for Mission Control in the dropdown
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found Mission Control in dropdown');
        await mcOption.click();
        await page.waitForTimeout(4000);
      } else {
        // Try searching for it
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill('Mission Control');
          await page.waitForTimeout(1500);

          const searchResult = page.locator('text=Mission Control - David Young').first();
          if (await searchResult.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchResult.click();
            await page.waitForTimeout(4000);
          }
        }
      }
    }

    await ss(page, 'in-mission-control');

    // Verify we're in Mission Control
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // === NAVIGATE TO SETTINGS ===
    console.log('📍 Step 3: Going to Settings...');

    await page.locator('text=Settings').first().click();
    await page.waitForTimeout(2000);
    await ss(page, 'settings-page');

    // === LOOK FOR SNAPSHOT SECTION ===
    console.log('📍 Step 4: Looking for Snapshot/Import option...');

    // Scroll down in settings sidebar to find Snapshot option
    const settingsSidebar = page.locator('[class*="sidebar"], [class*="settings-menu"]').first();

    // Look for various snapshot-related options
    const snapshotOptions = [
      'Snapshots',
      'Snapshot',
      'Import Snapshot',
      'Account Snapshot',
      'Linked Snapshots'
    ];

    let snapshotFound = false;
    for (const optionText of snapshotOptions) {
      const option = page.locator(`text=${optionText}`).first();
      if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log(`   Found: ${optionText}`);
        await option.click();
        await page.waitForTimeout(2000);
        await ss(page, 'snapshot-section');
        snapshotFound = true;
        break;
      }
    }

    if (!snapshotFound) {
      console.log('   Snapshot option not visible, scrolling sidebar...');

      // Try scrolling the sidebar
      await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"]');
        if (sidebar) sidebar.scrollTop = sidebar.scrollHeight;
      });
      await page.waitForTimeout(1000);
      await ss(page, 'after-scroll');

      // Check again after scrolling
      for (const optionText of snapshotOptions) {
        const option = page.locator(`text=${optionText}`).first();
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`   Found after scroll: ${optionText}`);
          await option.click();
          await page.waitForTimeout(2000);
          await ss(page, 'snapshot-after-scroll');
          snapshotFound = true;
          break;
        }
      }
    }

    // === IF SNAPSHOT SECTION FOUND, LOOK FOR LINKED/IMPORT OPTIONS ===
    if (snapshotFound) {
      console.log('📍 Step 5: Looking for import/apply options...');

      // Look for "Mortgage Playbook" or import button
      const playbookOption = page.locator('text=Mortgage Playbook');
      if (await playbookOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found Mortgage Playbook!');
        await playbookOption.click();
        await page.waitForTimeout(2000);
        await ss(page, 'playbook-found');

        // Look for Apply/Import/Sync button
        const applyBtns = ['Apply', 'Import', 'Sync', 'Update', 'Pull'];
        for (const btnText of applyBtns) {
          const btn = page.locator(`button:has-text("${btnText}")`).first();
          if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
            console.log(`   Found ${btnText} button`);
            await btn.click();
            await page.waitForTimeout(3000);
            await ss(page, `${btnText.toLowerCase()}-clicked`);
            break;
          }
        }
      }
    } else {
      // === TRY DIRECT NAVIGATION TO SNAPSHOT SETTINGS ===
      console.log('📍 Step 5: Trying direct navigation to snapshot settings...');

      const snapshotUrls = [
        `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/snapshots`,
        `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/snapshot`,
        `https://app.gohighlevel.com/location/${MISSION_CONTROL_ID}/settings/snapshots`
      ];

      for (const url of snapshotUrls) {
        console.log(`   Trying: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);

        // Check if page loaded something meaningful
        const bodyText = await page.locator('body').textContent();
        if (bodyText.includes('Snapshot') || bodyText.includes('Mortgage')) {
          console.log('   Page has snapshot content!');
          await ss(page, 'snapshot-page-found');
          break;
        }
      }
    }

    // === CHECK WHAT CONTENT EXISTS IN MISSION CONTROL ===
    console.log('📍 Step 6: Checking existing content in Mission Control...');

    // Go to Workflows
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/list`, {
      waitUntil: 'networkidle',
      timeout: 20000
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await ss(page, 'mc-automation');

    // Check workflow count
    const workflowRows = await page.locator('tr, [class*="workflow-row"], [class*="list-item"]').count();
    console.log(`   Found ${workflowRows} workflow elements`);

    // Go to Custom Fields
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/custom_fields`, {
      waitUntil: 'networkidle',
      timeout: 20000
    }).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'mc-fields');

    const fieldRows = await page.locator('tr, [class*="field-row"]').count();
    console.log(`   Found ${fieldRows} custom field elements`);

    // Go to Tags
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/tags`, {
      waitUntil: 'networkidle',
      timeout: 20000
    }).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'mc-tags');

    const tagRows = await page.locator('tr, [class*="tag-row"], [class*="tag-item"]').count();
    console.log(`   Found ${tagRows} tag elements`);

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/import-*.png');
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 2 minutes...');
    await page.waitForTimeout(120000);
    await browser.close();
  }
})();
