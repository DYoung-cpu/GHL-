/**
 * Cleanup v2 - Navigate through list first, then to workflow
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

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

(async () => {
  console.log('CLEANUP v2 - Via workflow list');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const dir = './screenshots/cleanup';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

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

    // GO TO WORKFLOW LIST FIRST - let it fully load
    console.log('\nGoing to workflow list...');
    await page.goto(
      `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    await sleep(8000);
    await page.screenshot({ path: `${dir}/list-loaded.png` });
    console.log('List loaded');

    // Check frames now
    let frames = page.frames();
    console.log(`Found ${frames.length} frames on list page`);
    frames.forEach((f, i) => console.log(`  [${i}] ${f.url().substring(0, 60)}...`));

    // Now try to delete each workflow
    for (let i = 0; i < TO_DELETE.length; i++) {
      const wfId = TO_DELETE[i];
      console.log(`\n[${i+1}/${TO_DELETE.length}] Processing ${wfId.substring(0,8)}...`);

      try {
        // Click on the workflow from the list (using the page click, not direct nav)
        // First search for it
        const searchBox = page.locator('input[placeholder*="Search"]').first();
        if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
          await searchBox.click();
          await searchBox.fill('');
          await sleep(500);
        }

        // Navigate by clicking Automation sidebar then directly to workflow
        await page.click('text=Automation');
        await sleep(2000);

        // Now navigate to the specific workflow
        const wfUrl = `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflow/${wfId}`;
        await page.goto(wfUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await sleep(8000);

        await page.screenshot({ path: `${dir}/wf-${i+1}.png` });

        // Check frames
        frames = page.frames();
        console.log(`  ${frames.length} frames found`);

        const wfFrame = frames.find(f => f.url().includes('automation-workflow'));
        if (wfFrame) {
          console.log('  Workflow frame found!');

          // Click Settings
          const settingsTab = wfFrame.locator('button:has-text("Settings"), text=Settings').first();
          if (await settingsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await settingsTab.click();
            await sleep(2000);

            // Scroll to bottom of settings
            await page.keyboard.press('End');
            await sleep(1000);

            // Find Delete
            const deleteBtn = wfFrame.locator('button:has-text("Delete Workflow"), text=Delete Workflow').first();
            if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await deleteBtn.click();
              await sleep(1500);

              // Confirm
              const confirmBtn = page.locator('button:has-text("Delete")').last();
              await confirmBtn.click().catch(() => {});
              await sleep(2000);

              console.log('  DELETED!');
              deleted++;
            }
          }
        } else {
          console.log('  No workflow frame - checking main page');

          // Maybe it's rendering in the main page without iframe now
          const settingsTab = page.locator('button:has-text("Settings"), [class*="tab"]:has-text("Settings")').first();
          if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('  Found Settings on main page');
            await settingsTab.click();
            await sleep(2000);

            const deleteBtn = page.locator('button:has-text("Delete"), text=Delete Workflow').first();
            if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await deleteBtn.click();
              await sleep(1500);

              const confirmBtn = page.locator('button:has-text("Delete")').last();
              await confirmBtn.click().catch(() => {});
              await sleep(2000);

              console.log('  DELETED!');
              deleted++;
            }
          }
        }
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`DELETED: ${deleted} / ${TO_DELETE.length}`);
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('\nBrowser staying open for manual cleanup...');
    await sleep(120000);
    await browser.close();
  }
})();
