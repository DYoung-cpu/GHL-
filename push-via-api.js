/**
 * Push Snapshot via GHL API
 * The UI push isn't working, so let's try the API
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Known IDs
const SNAPSHOT_ID = 'cbBbH0NDDkg9Rq10dXV2';
const MISSION_CONTROL_LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/api-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Push Snapshot via GHL API');
  console.log('='.repeat(50));
  console.log('');
  console.log(`Snapshot ID: ${SNAPSHOT_ID}`);
  console.log(`Target Location: ${MISSION_CONTROL_LOCATION_ID}`);
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

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

    // === SWITCH TO AGENCY VIEW ===
    console.log('📍 Step 2: Switching to Agency View...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const agencyView = page.locator('text=Switch to Agency View');
      if (await agencyView.isVisible({ timeout: 3000 }).catch(() => false)) {
        await agencyView.click();
        await page.waitForTimeout(4000);
      }
    }

    await ss(page, 'logged-in');

    // === GET AUTH TOKEN FROM BROWSER ===
    console.log('📍 Step 3: Extracting auth token...');

    // Navigate to a page that will have API calls
    await page.goto('https://app.gohighlevel.com/v2/settings/company');
    await page.waitForTimeout(3000);

    // Try to extract the token from localStorage or cookies
    const token = await page.evaluate(() => {
      // Try localStorage
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('token') || key.includes('auth')) {
          const value = localStorage.getItem(key);
          if (value && value.length > 50) {
            return { source: 'localStorage', key, value: value.substring(0, 100) + '...' };
          }
        }
      }

      // Check for specific GHL storage
      const ghlToken = localStorage.getItem('hl_auth_token') ||
                       localStorage.getItem('token') ||
                       localStorage.getItem('accessToken');
      if (ghlToken) {
        return { source: 'ghl', value: ghlToken };
      }

      return null;
    });

    console.log('   Token info:', token);

    // === TRY DIRECT API PUSH ===
    console.log('📍 Step 4: Attempting API push...');

    // Navigate to the snapshot push URL directly
    const pushUrl = `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_LOCATION_ID}/settings/snapshot/${SNAPSHOT_ID}/push`;
    console.log(`   Navigating to: ${pushUrl}`);

    await page.goto(pushUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('   Direct URL navigation failed, trying alternate approach');
    });
    await page.waitForTimeout(3000);
    await ss(page, 'push-url-attempt');

    // === TRY ALTERNATE: Go to Mission Control and apply snapshot ===
    console.log('📍 Step 5: Trying from sub-account side...');

    // Navigate to Mission Control location
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_LOCATION_ID}/settings/company`, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await ss(page, 'mission-control-settings');

    // Look for Snapshot or Import option
    const snapshotSetting = page.locator('text=Snapshots, text=Import Snapshot, text=Apply Snapshot');
    if (await snapshotSetting.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await snapshotSetting.first().click();
      await page.waitForTimeout(2000);
      await ss(page, 'snapshot-setting');
    }

    // === CHECK CURRENT CONTENT IN MISSION CONTROL ===
    console.log('📍 Step 6: Checking Mission Control content...');

    // Go to workflows in Mission Control
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_LOCATION_ID}/workflows`, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await ss(page, 'mc-workflows');

    // Count workflows
    const workflowCount = await page.locator('[class*="workflow"], tr').count();
    console.log(`   Found ${workflowCount} workflow elements`);

    // Go to tags
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_LOCATION_ID}/settings/tags`, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'mc-tags');

    // Go to custom fields
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_LOCATION_ID}/settings/custom_fields`, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'mc-custom-fields');

    // === BACK TO AGENCY TO TRY PUSH VIA NETWORK REQUEST ===
    console.log('📍 Step 7: Attempting push via network interception...');

    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('snapshot') && request.method() === 'POST') {
        console.log('   Snapshot API call:', request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('snapshot')) {
        console.log('   Snapshot response:', response.status(), response.url());
      }
    });

    // Go back to snapshots
    await page.goto('https://app.gohighlevel.com/v2/location/settings/snapshots', {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await ss(page, 'back-to-snapshots');

    // Find and click on Mortgage Playbook row's refresh button
    const mortgageRow = page.locator('tr:has-text("Mortgage Playbook")').first();
    if (await mortgageRow.isVisible({ timeout: 5000 })) {
      console.log('   Found Mortgage Playbook row');

      // Get row bounding box
      const rowBox = await mortgageRow.boundingBox();

      // Click refresh icon (second icon from left)
      const refreshX = rowBox.x + rowBox.width - 70;
      const refreshY = rowBox.y + rowBox.height / 2;

      console.log(`   Clicking refresh at (${refreshX}, ${refreshY})`);
      await page.mouse.click(refreshX, refreshY);
      await page.waitForTimeout(5000);
      await ss(page, 'refresh-clicked');
    }

    // === FINAL STATE ===
    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  Screenshots saved to ./screenshots/api-*.png');
    console.log('  Check Mission Control to verify content');
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
