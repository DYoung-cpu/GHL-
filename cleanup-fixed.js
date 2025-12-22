/**
 * Cleanup - FIXED with proper frame locators
 * Uses the working pattern from project memory
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

// Workflow IDs to delete
const TO_DELETE = [
  'b2edc56a-4d7a-487c-9bf3-0fe5cae6a93e',
  '4d94cc35-8b89-4058-bc82-b80b4928dbce',
  '29621d34-278d-4f3b-b449-5ecd9dee8fe6',
  '5efe42b4-d4f0-4e6e-b345-89bf5618a8e4',
  '1e052f78-d2b7-4e2a-8f35-6287aa1844e3',
  'a325a89f-3418-4609-8c61-ada53a3ea9cb',
  '6419cedb-7cdf-40aa-98ad-6abf8b796d44',
  '96b27b4c-6122-4e96-b29a-f50ed7f77857',
  'e56ff667-a258-4259-a0b7-91fbdf5073d7',
  'daf68373-2a3b-42ac-b38b-363429af02ab',
  '89d65c51-c967-4f50-a301-3e71675204a4',
  '61949451-b740-4b48-8d35-2ec2fb514541',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getWfFrame(page) {
  return page.frames().find(f => f.url().includes('automation-workflows'));
}

(async () => {
  console.log('CLEANUP - Using proper frame locators');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let deleted = 0;

  try {
    // LOGIN
    console.log('\nLogging in...');
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
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await sleep(8000);
    }

    // SWITCH TO MISSION CONTROL
    console.log('Switching to Mission Control...');
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

    // DELETE EACH WORKFLOW
    for (let i = 0; i < TO_DELETE.length; i++) {
      const wfId = TO_DELETE[i];
      console.log(`\n[${i+1}/${TO_DELETE.length}] Deleting ${wfId.substring(0,8)}...`);

      try {
        // Navigate to workflow editor
        await page.goto(
          `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflow/${wfId}`,
          { waitUntil: 'domcontentloaded', timeout: 20000 }
        );
        await sleep(5000);

        // GET THE IFRAME - this is the key
        const wfFrame = getWfFrame(page);
        if (!wfFrame) {
          console.log('   Frame not found - workflow may not exist');
          continue;
        }

        // Click Settings tab using FRAME locator
        const settingsTab = wfFrame.locator('text=Settings').first();
        if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await settingsTab.click();
          await sleep(2000);

          // Scroll down in settings panel to find Delete
          await wfFrame.locator('.n-scrollbar-content, [class*="settings"]').first().evaluate(el => {
            el.scrollTop = el.scrollHeight;
          }).catch(() => {});
          await sleep(1000);

          // Click Delete Workflow using FRAME locator
          const deleteBtn = wfFrame.locator('text=Delete Workflow').first();
          if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await deleteBtn.click();
            await sleep(1500);

            // Confirm - could be in frame or page
            let confirmed = false;

            // Try frame first
            const frameConfirm = wfFrame.locator('button:has-text("Delete")').first();
            if (await frameConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
              await frameConfirm.click();
              confirmed = true;
            }

            // Try page
            if (!confirmed) {
              const pageConfirm = page.locator('button:has-text("Delete")').first();
              if (await pageConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
                await pageConfirm.click();
                confirmed = true;
              }
            }

            if (confirmed) {
              await sleep(2000);
              console.log('   DELETED');
              deleted++;
            } else {
              console.log('   Could not confirm');
            }
          } else {
            console.log('   Delete button not found in Settings');
          }
        } else {
          console.log('   Settings tab not found');
        }

      } catch (err) {
        console.log(`   Error: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`DELETED: ${deleted} / ${TO_DELETE.length}`);
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('\nBrowser open for 30s...');
    await sleep(30000);
    await browser.close();
  }
})();
