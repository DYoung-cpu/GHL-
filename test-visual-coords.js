const { chromium } = require('playwright');
const fs = require('fs');

// Coordinates estimated from screenshot visual inspection
const UI = {
  login: { googleButton: { x: 960, y: 564 } },
  switcher: { clickToSwitch: { x: 122, y: 93 }, missionControl: { x: 383, y: 300 } },
  workflows: {
    createWorkflow: { x: 1333, y: 107 },   // Blue button top right
    createFolder: { x: 1207, y: 107 },
    // Dropdown items (estimate - will verify)
    startFromScratch: { x: 1333, y: 157 },
    useRecipe: { x: 1333, y: 197 }
  }
};

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11, 8) + '] ' + msg);

async function googleLogin(context, page) {
  await page.mouse.click(UI.login.googleButton.x, UI.login.googleButton.y);
  await sleep(3000);

  let googlePage = null;
  for (let i = 0; i < 15; i++) {
    for (const p of context.pages()) {
      if (p.url().includes('accounts.google.com') && !p.url().includes('gsi/button')) {
        googlePage = p;
        break;
      }
    }
    if (googlePage) break;
    await sleep(1000);
  }
  if (!googlePage) return false;

  await googlePage.bringToFront();
  await sleep(2000);

  try {
    await googlePage.locator('input[type="email"]').fill(CONFIG.email);
    await googlePage.locator('#identifierNext button').click();
    await sleep(4000);
  } catch (e) {}

  try {
    await googlePage.locator('input[type="password"]').fill(CONFIG.password);
    await googlePage.locator('#passwordNext button').click();
    await sleep(5000);
  } catch (e) {}

  await sleep(3000);
  return true;
}

async function main() {
  log('=== TEST VISUAL COORDINATES ===');

  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    log('Go to GHL');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(5000);

    if ((await page.content()).includes('Sign into your account')) {
      log('Login required');
      await googleLogin(context, page);
    }

    await sleep(3000);
    const pages = context.pages();
    const activePage = pages[pages.length - 1];
    await activePage.bringToFront();

    if (activePage.url().includes('agency') || activePage.url().includes('launchpad')) {
      log('Switching sub-account');
      await activePage.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await activePage.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
    }

    log('Navigate to workflows');
    await activePage.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(8000);
    await activePage.screenshot({ path: 'screenshots/v01-workflows.png' });
    log('On workflows page');

    // Test: Click Create Workflow at (1333, 107)
    log('Clicking Create Workflow at (1333, 107)');
    await activePage.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
    await sleep(2000);
    await activePage.screenshot({ path: 'screenshots/v02-dropdown.png' });

    // Get dropdown position by scanning visible text
    const dropdownItems = await activePage.evaluate(() => {
      const items = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el.innerText || '').trim();
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.height < 60 && rect.y > 100 && rect.y < 300) {
          if (text === 'Start from Scratch' || text === 'Use Recipe' || text === 'Use a Template') {
            items.push({
              text: text,
              x: Math.round(rect.x + rect.width / 2),
              y: Math.round(rect.y + rect.height / 2)
            });
          }
        }
      });
      return items;
    });

    log('Dropdown items found:');
    dropdownItems.forEach(item => log('  "' + item.text + '" at (' + item.x + ', ' + item.y + ')'));

    // Click Start from Scratch
    const scratch = dropdownItems.find(i => i.text === 'Start from Scratch');
    if (scratch) {
      log('Clicking Start from Scratch at (' + scratch.x + ', ' + scratch.y + ')');
      await activePage.mouse.click(scratch.x, scratch.y);
      await sleep(4000);
      await activePage.screenshot({ path: 'screenshots/v03-editor.png' });
      log('=== WORKFLOW EDITOR OPENED ===');

      // Map editor elements
      const editorItems = await activePage.evaluate(() => {
        const items = [];
        document.querySelectorAll('*').forEach(el => {
          const text = (el.innerText || '').trim();
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && text.length > 1 && text.length < 30) {
            const keywords = ['Trigger', 'Add', 'Save', 'Test', 'Publish', 'Back', 'Settings'];
            if (keywords.some(k => text.includes(k))) {
              items.push({
                text: text,
                x: Math.round(rect.x + rect.width / 2),
                y: Math.round(rect.y + rect.height / 2)
              });
            }
          }
        });
        // Dedupe
        return items.filter((item, i, arr) =>
          arr.findIndex(x => x.text === item.text) === i
        );
      });

      log('\nEditor elements:');
      editorItems.forEach(item => log('  "' + item.text + '" at (' + item.x + ', ' + item.y + ')'));
    } else {
      log('Start from Scratch not found in dropdown');
    }

    await context.storageState({ path: 'ghl-auth.json' });
    log('\nAuth saved. Browser open 60s...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
