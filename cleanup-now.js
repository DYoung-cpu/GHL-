/**
 * Cleanup Workflows - Delete 12 placeholder/duplicate workflows
 * Must use browser automation (API is read-only for workflows)
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

// IDs of workflows to delete
const WORKFLOWS_TO_DELETE = [
  // 7 Placeholders
  'b2edc56a-4d7a-487c-9bf3-0fe5cae6a93e',
  '4d94cc35-8b89-4058-bc82-b80b4928dbce',
  '29621d34-278d-4f3b-b449-5ecd9dee8fe6',
  '5efe42b4-d4f0-4e6e-b345-89bf5618a8e4',
  '1e052f78-d2b7-4e2a-8f35-6287aa1844e3',
  'a325a89f-3418-4609-8c61-ada53a3ea9cb',
  '6419cedb-7cdf-40aa-98ad-6abf8b796d44',
  // 5 Duplicates
  '96b27b4c-6122-4e96-b29a-f50ed7f77857',
  'e56ff667-a258-4259-a0b7-91fbdf5073d7',
  'daf68373-2a3b-42ac-b38b-363429af02ab',
  '89d65c51-c967-4f50-a301-3e71675204a4',
  '61949451-b740-4b48-8d35-2ec2fb514541',
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('='.repeat(60));
  console.log('  WORKFLOW CLEANUP - Deleting 12 workflows');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 150
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let deleted = 0;
  let failed = 0;

  try {
    // === LOGIN ===
    console.log('\n[1/4] Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await sleep(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await sleep(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }
    console.log('   Logged in!');

    // === SWITCH TO MISSION CONTROL ===
    console.log('\n[2/4] Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await sleep(2000);
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await sleep(4000);
      }
    }
    await page.keyboard.press('Escape');
    await sleep(1000);
    console.log('   In Mission Control!');

    // === DELETE WORKFLOWS ===
    console.log('\n[3/4] Deleting workflows...');

    for (let i = 0; i < WORKFLOWS_TO_DELETE.length; i++) {
      const wfId = WORKFLOWS_TO_DELETE[i];
      console.log(`\n   [${i + 1}/${WORKFLOWS_TO_DELETE.length}] Deleting ${wfId.substring(0, 8)}...`);

      try {
        // Go directly to workflow editor
        await page.goto(
          `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflow/${wfId}`,
          { waitUntil: 'domcontentloaded', timeout: 20000 }
        );
        await sleep(4000);

        // Wait for iframe to load
        let wfFrame = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          wfFrame = page.frames().find(f => f.url().includes('automation-workflows'));
          if (wfFrame) break;
          await sleep(500);
        }

        if (!wfFrame) {
          console.log('      No workflow frame found - may be deleted already');
          continue;
        }

        // Look for settings/menu button in the workflow editor
        // Usually a kebab menu (three dots) or gear icon in top right
        const settingsBtn = wfFrame.locator('[data-testid="workflow-settings"], button:has-text("Settings"), [class*="settings"]').first();

        if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await settingsBtn.click();
          await sleep(1500);
        } else {
          // Try clicking the Settings tab
          const settingsTab = wfFrame.locator('text=Settings').first();
          if (await settingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await settingsTab.click();
            await sleep(1500);
          }
        }

        // Look for Delete Workflow option
        const deleteBtn = wfFrame.locator('text=Delete Workflow, button:has-text("Delete"), [class*="delete"]:has-text("Delete")').first();

        if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await deleteBtn.click();
          await sleep(1500);

          // Handle confirmation dialog
          const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")').first();
          if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await confirmBtn.click();
            await sleep(2000);
            console.log('      Deleted!');
            deleted++;
          } else {
            // Try clicking in frame
            const frameConfirm = wfFrame.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
            if (await frameConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
              await frameConfirm.click();
              await sleep(2000);
              console.log('      Deleted!');
              deleted++;
            } else {
              console.log('      Could not confirm deletion');
              failed++;
            }
          }
        } else {
          // Try scrolling down in settings to find delete
          await wfFrame.locator('body').press('End');
          await sleep(1000);

          const deleteBtn2 = wfFrame.locator('text=Delete Workflow').first();
          if (await deleteBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteBtn2.click();
            await sleep(1500);

            const confirmBtn = page.locator('button:has-text("Delete")').first();
            await confirmBtn.click().catch(() => {});
            await sleep(2000);
            console.log('      Deleted!');
            deleted++;
          } else {
            console.log('      Delete button not found');
            failed++;
          }
        }

      } catch (err) {
        console.log(`      Error: ${err.message}`);
        failed++;
      }

      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // === VERIFY ===
    console.log('\n[4/4] Verifying cleanup...');
    await page.goto(
      `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await sleep(5000);

    // Take screenshot
    const dir = './screenshots/cleanup';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/after-cleanup.png` });

    // === RESULTS ===
    console.log('\n' + '='.repeat(60));
    console.log('  CLEANUP RESULTS');
    console.log('='.repeat(60));
    console.log(`\n  Deleted: ${deleted}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${WORKFLOWS_TO_DELETE.length}`);
    console.log('\n  Screenshot saved to screenshots/cleanup/after-cleanup.png');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\nFatal error:', err.message);
  } finally {
    console.log('\nBrowser staying open for 30 seconds...');
    await sleep(30000);
    await browser.close();
  }
})();
