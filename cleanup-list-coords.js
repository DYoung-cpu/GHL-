/**
 * Cleanup from list using coordinates - most reliable approach
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('CLEANUP - Delete from list with coordinates');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const dir = './screenshots/cleanup';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    // LOGIN
    console.log('\nLogging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'load', timeout: 30000 });
    await sleep(3000);

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
      await sleep(10000);
    }
    console.log('Logged in');

    // SWITCH TO MISSION CONTROL
    console.log('Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await sleep(2000);
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await sleep(5000);
      }
    }
    await page.keyboard.press('Escape');
    await sleep(1000);
    console.log('In Mission Control');

    // GO TO WORKFLOWS
    console.log('\nNavigating to workflows...');
    await page.click('text=Automation');
    await sleep(5000);
    await page.screenshot({ path: `${dir}/automation-page.png` });

    // Click Workflows tab if needed
    const wfTab = page.locator('text=Workflows').first();
    if (await wfTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wfTab.click();
      await sleep(3000);
    }

    await page.screenshot({ path: `${dir}/workflows-list.png` });
    console.log('On workflows page');

    // Instructions for manual process
    console.log('\n' + '='.repeat(50));
    console.log('MANUAL DELETION REQUIRED');
    console.log('='.repeat(50));
    console.log(`
The browser is now on the Workflows page.

Please manually delete these workflows:

PLACEHOLDERS (search "New Workflow"):
1. New Workflow : 1765435815211
2. New Workflow : 1765635484587
3. New Workflow : 1765641817788
4. New Workflow : 1765643036246
5. New Workflow : 1765643457688
6. New Workflow : 1765643778107
7. New Workflow : 1765643868809

DUPLICATES (keep 1 of each):
8. New Lead Nurture Sequence (delete 1 of 2)
9. Pre-Qualification Process Workflow (delete 1 of 2)
10. Stale Lead Re-engagement (delete 2 of 3)
11. Underwriting Status Updates (delete 1 of 2)

HOW:
- Click the 3-dot menu on each row
- Click Delete
- Confirm

Browser will stay open for 5 minutes.
`);
    console.log('='.repeat(50));

    await sleep(300000); // 5 minutes

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: `${dir}/error.png` });
  } finally {
    await browser.close();
  }
})();
