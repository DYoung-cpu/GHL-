/**
 * Cleanup with debugging - capture what's happening
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';
const TEST_ID = 'b2edc56a-4d7a-487c-9bf3-0fe5cae6a93e'; // First placeholder

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('DEBUG CLEANUP');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const dir = './screenshots/debug';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    // LOGIN
    console.log('Logging in...');
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

    // GO TO WORKFLOW
    console.log(`\nNavigating to workflow ${TEST_ID}...`);
    const url = `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflow/${TEST_ID}`;
    console.log(`URL: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait and capture screenshots at intervals
    for (let i = 1; i <= 10; i++) {
      await sleep(2000);
      await page.screenshot({ path: `${dir}/wait-${i}.png` });
      console.log(`Screenshot ${i}/10 saved`);

      // Check for frames
      const frames = page.frames();
      console.log(`  Found ${frames.length} frames:`);
      frames.forEach((f, idx) => {
        const frameUrl = f.url();
        console.log(`    [${idx}] ${frameUrl.substring(0, 80)}...`);
      });

      // Check specifically for automation-workflows
      const wfFrame = frames.find(f => f.url().includes('automation-workflows'));
      if (wfFrame) {
        console.log('  >> Found workflow frame!');

        // Try to find Settings tab
        const settingsTab = wfFrame.locator('text=Settings');
        const settingsCount = await settingsTab.count();
        console.log(`  >> Settings tabs found: ${settingsCount}`);

        if (settingsCount > 0) {
          console.log('  >> Clicking Settings...');
          await settingsTab.first().click();
          await sleep(2000);
          await page.screenshot({ path: `${dir}/settings-open.png` });

          // Look for Delete
          const deleteBtn = wfFrame.locator('text=Delete Workflow, text=Delete');
          const deleteCount = await deleteBtn.count();
          console.log(`  >> Delete buttons found: ${deleteCount}`);

          if (deleteCount > 0) {
            console.log('  >> Clicking Delete...');
            await deleteBtn.first().click();
            await sleep(1500);
            await page.screenshot({ path: `${dir}/delete-confirm.png` });

            // Look for confirm button
            const confirmBtn = page.locator('button:has-text("Delete")');
            const confirmCount = await confirmBtn.count();
            console.log(`  >> Confirm buttons found: ${confirmCount}`);

            if (confirmCount > 0) {
              await confirmBtn.first().click();
              await sleep(2000);
              console.log('  >> DELETED!');
              await page.screenshot({ path: `${dir}/after-delete.png` });
            }
          }
          break;
        }
      }
    }

    console.log('\nFinal page URL:', page.url());
    await page.screenshot({ path: `${dir}/final.png` });

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: `${dir}/error.png` });
  } finally {
    console.log('\nScreenshots saved to screenshots/debug/');
    console.log('Browser staying open...');
    await sleep(60000);
    await browser.close();
  }
})();
