/**
 * GHL Control - Single-action controller for vision-guided automation
 *
 * Usage:
 *   node ghl-control.js launch          - Launch browser, login, go to workflows
 *   node ghl-control.js screenshot      - Take screenshot
 *   node ghl-control.js click X Y       - Click at coordinates
 *   node ghl-control.js type "text"     - Type text
 *   node ghl-control.js key Enter       - Press key
 *   node ghl-control.js close           - Close browser
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';
const STATE_FILE = '/tmp/ghl-browser-state.json';
const SCREENSHOT_PATH = '/tmp/ghl-screenshot.png';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getBrowser() {
  // Connect to existing browser via CDP or launch new one
  let browser, context, page;

  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      browser = await chromium.connectOverCDP(state.wsEndpoint);
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        context = contexts[0];
        const pages = context.pages();
        if (pages.length > 0) {
          page = pages[0];
          return { browser, context, page, isNew: false };
        }
      }
    } catch (e) {
      // Connection failed, will launch new
    }
  }

  return null;
}

async function launchBrowser() {
  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222']
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();

  // Save connection info
  const wsEndpoint = browser.wsEndpoint ? browser.wsEndpoint() : `ws://localhost:9222`;
  fs.writeFileSync(STATE_FILE, JSON.stringify({ wsEndpoint }));

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

  // Switch to Mission Control
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

  // Go to workflows
  console.log('Navigating to workflows...');
  await page.click('text=Automation');
  await sleep(5000);

  // Take initial screenshot
  await page.screenshot({ path: SCREENSHOT_PATH });
  console.log(`Screenshot saved to ${SCREENSHOT_PATH}`);
  console.log('Browser ready. Use other commands to control.');

  // Keep browser open
  return { browser, context, page };
}

async function takeScreenshot() {
  const state = await getBrowser();
  if (!state) {
    console.log('No browser running. Use: node ghl-control.js launch');
    return;
  }

  await state.page.screenshot({ path: SCREENSHOT_PATH });
  console.log(`Screenshot saved to ${SCREENSHOT_PATH}`);
}

async function clickAt(x, y) {
  const state = await getBrowser();
  if (!state) {
    console.log('No browser running. Use: node ghl-control.js launch');
    return;
  }

  console.log(`Clicking at (${x}, ${y})...`);
  await state.page.mouse.click(parseInt(x), parseInt(y));
  await sleep(1500);
  await state.page.screenshot({ path: SCREENSHOT_PATH });
  console.log(`Clicked. Screenshot saved to ${SCREENSHOT_PATH}`);
}

async function typeText(text) {
  const state = await getBrowser();
  if (!state) {
    console.log('No browser running. Use: node ghl-control.js launch');
    return;
  }

  console.log(`Typing: ${text}`);
  await state.page.keyboard.type(text);
  await sleep(500);
  await state.page.screenshot({ path: SCREENSHOT_PATH });
  console.log(`Typed. Screenshot saved to ${SCREENSHOT_PATH}`);
}

async function pressKey(key) {
  const state = await getBrowser();
  if (!state) {
    console.log('No browser running. Use: node ghl-control.js launch');
    return;
  }

  console.log(`Pressing key: ${key}`);
  await state.page.keyboard.press(key);
  await sleep(1000);
  await state.page.screenshot({ path: SCREENSHOT_PATH });
  console.log(`Pressed. Screenshot saved to ${SCREENSHOT_PATH}`);
}

async function closeBrowser() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const browser = await chromium.connectOverCDP(state.wsEndpoint);
      await browser.close();
    } catch (e) {}
    fs.unlinkSync(STATE_FILE);
  }
  console.log('Browser closed.');
}

// Main
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  try {
    switch (command) {
      case 'launch':
        const { browser } = await launchBrowser();
        // Keep process running
        await new Promise(() => {});
        break;
      case 'screenshot':
      case 'ss':
        await takeScreenshot();
        break;
      case 'click':
        await clickAt(args[1], args[2]);
        break;
      case 'type':
        await typeText(args[1]);
        break;
      case 'key':
        await pressKey(args[1]);
        break;
      case 'close':
        await closeBrowser();
        break;
      default:
        console.log('Commands: launch, screenshot, click X Y, type "text", key KeyName, close');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
