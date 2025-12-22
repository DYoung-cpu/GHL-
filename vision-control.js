/**
 * Vision Control - Browser stays running, watches for commands
 * Commands written to /tmp/ghl-cmd.txt, results in /tmp/ghl-screenshot.png
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';
const CMD_FILE = '/tmp/ghl-cmd.txt';
const SCREENSHOT_PATH = '/tmp/ghl-screenshot.png';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('Starting Vision Control...');

  // Clear old command file
  if (fs.existsSync(CMD_FILE)) fs.unlinkSync(CMD_FILE);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
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

  // Switch to Mission Control
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
  console.log('In Mission Control');

  // Go to workflows
  await page.click('text=Automation');
  await sleep(5000);

  // Take initial screenshot
  await page.screenshot({ path: SCREENSHOT_PATH });
  console.log('Ready! Screenshot saved.');
  console.log('Watching for commands in ' + CMD_FILE);
  console.log('Commands: click X Y | type TEXT | key KEYNAME | screenshot | quit');

  // Command loop - watch file for commands
  while (true) {
    await sleep(500);

    if (fs.existsSync(CMD_FILE)) {
      const cmd = fs.readFileSync(CMD_FILE, 'utf8').trim();
      fs.unlinkSync(CMD_FILE);

      if (!cmd) continue;

      console.log('> ' + cmd);
      const parts = cmd.split(' ');
      const action = parts[0].toLowerCase();

      try {
        if (action === 'click' && parts.length >= 3) {
          const x = parseInt(parts[1]);
          const y = parseInt(parts[2]);
          await page.mouse.click(x, y);
          await sleep(1500);
          await page.screenshot({ path: SCREENSHOT_PATH });
          console.log('Clicked (' + x + ', ' + y + ')');
        }
        else if (action === 'type' && parts.length >= 2) {
          const text = parts.slice(1).join(' ');
          await page.keyboard.type(text);
          await sleep(500);
          await page.screenshot({ path: SCREENSHOT_PATH });
          console.log('Typed: ' + text);
        }
        else if (action === 'key' && parts.length >= 2) {
          await page.keyboard.press(parts[1]);
          await sleep(1000);
          await page.screenshot({ path: SCREENSHOT_PATH });
          console.log('Pressed: ' + parts[1]);
        }
        else if (action === 'screenshot' || action === 'ss') {
          await page.screenshot({ path: SCREENSHOT_PATH });
          console.log('Screenshot taken');
        }
        else if (action === 'quit' || action === 'exit') {
          console.log('Closing...');
          break;
        }
        else {
          console.log('Unknown command: ' + cmd);
        }
      } catch (err) {
        console.log('Error: ' + err.message);
        await page.screenshot({ path: SCREENSHOT_PATH });
      }
    }
  }

  await browser.close();
  console.log('Done');
})();
