/**
 * Cleanup from List View - Delete workflows by finding them in the list
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

// Names of workflows to delete
const NAMES_TO_DELETE = [
  'New Workflow : 1765435815211',
  'New Workflow : 1765635484587',
  'New Workflow : 1765641817788',
  'New Workflow : 1765643036246',
  'New Workflow : 1765643457688',
  'New Workflow : 1765643778107',
  'New Workflow : 1765643868809',
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('='.repeat(60));
  console.log('  WORKFLOW CLEANUP - From List View');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let deleted = 0;

  try {
    // === LOGIN ===
    console.log('\n[1/3] Logging into GHL...');
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
    console.log('\n[2/3] Switching to Mission Control...');
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

    // === GO TO WORKFLOWS LIST ===
    console.log('\n[3/3] Deleting placeholder workflows...');
    await page.goto(
      `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await sleep(6000);

    // Wait for iframe
    let wfFrame = null;
    for (let i = 0; i < 20; i++) {
      wfFrame = page.frames().find(f => f.url().includes('automation-workflows'));
      if (wfFrame) break;
      await sleep(500);
    }

    if (!wfFrame) {
      console.log('   ERROR: Could not find workflow frame');
      throw new Error('No workflow frame');
    }

    console.log('   Found workflow frame');

    // Take screenshot of list
    const dir = './screenshots/cleanup';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/list-before.png` });

    // Delete each placeholder workflow
    for (const name of NAMES_TO_DELETE) {
      console.log(`\n   Deleting: ${name}`);

      try {
        // Refresh the list page
        await page.goto(
          `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
          { waitUntil: 'domcontentloaded', timeout: 30000 }
        );
        await sleep(4000);

        // Re-find frame
        wfFrame = page.frames().find(f => f.url().includes('automation-workflows'));
        if (!wfFrame) continue;

        // Find the row with this name
        const row = wfFrame.locator(`tr:has-text("${name}")`).first();

        if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Hover to show actions
          await row.hover();
          await sleep(500);

          // Find and click the kebab/more menu (usually last button in row)
          const moreBtn = row.locator('button, [role="button"], svg').last();
          await moreBtn.click({ force: true });
          await sleep(1000);

          // Look for Delete in dropdown
          const deleteOption = wfFrame.locator('text=Delete').first();
          if (await deleteOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteOption.click();
            await sleep(1500);

            // Confirm deletion - check both page and frame
            let confirmed = false;

            // Try frame first
            const frameConfirm = wfFrame.locator('button:has-text("Delete"), button:has-text("Yes")').first();
            if (await frameConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
              await frameConfirm.click();
              confirmed = true;
            }

            // Try page level
            if (!confirmed) {
              const pageConfirm = page.locator('button:has-text("Delete"), button:has-text("Yes")').first();
              if (await pageConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
                await pageConfirm.click();
                confirmed = true;
              }
            }

            if (confirmed) {
              await sleep(2000);
              console.log('      DELETED!');
              deleted++;
            } else {
              console.log('      Could not confirm');
            }
          } else {
            console.log('      Delete option not found in menu');
          }
        } else {
          console.log('      Row not found (may already be deleted)');
        }

      } catch (err) {
        console.log(`      Error: ${err.message}`);
      }

      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // Final screenshot
    await page.goto(
      `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await sleep(4000);
    await page.screenshot({ path: `${dir}/list-after.png` });

    console.log('\n' + '='.repeat(60));
    console.log(`  DELETED: ${deleted} / ${NAMES_TO_DELETE.length}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\nError:', err.message);
  } finally {
    console.log('\nBrowser staying open for 60 seconds for manual cleanup...');
    console.log('You can manually delete remaining workflows if needed.');
    await sleep(60000);
    await browser.close();
  }
})();
