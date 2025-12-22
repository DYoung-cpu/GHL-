const { chromium } = require('playwright');
const fs = require('fs');

const UI = {
  login: { googleButton: { x: 960, y: 564 } },
  switcher: { clickToSwitch: { x: 122, y: 93 }, missionControl: { x: 383, y: 300 } }
};

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(msg);

async function googleLogin(context, page) {
  log('Clicking Google button...');
  await page.mouse.click(UI.login.googleButton.x, UI.login.googleButton.y);
  await sleep(3000);

  // Find Google popup
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

  // Email
  try {
    await googlePage.locator('input[type="email"]').fill(CONFIG.email);
    await googlePage.locator('#identifierNext button').click();
    await sleep(4000);
  } catch (e) {}

  // Password
  try {
    await googlePage.locator('input[type="password"]').fill(CONFIG.password);
    await googlePage.locator('#passwordNext button').click();
    await sleep(5000);
  } catch (e) {}

  await sleep(3000);
  return true;
}

async function main() {
  log('=== LOGIN AND MAP GHL ===\n');

  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Step 1: Login
    log('Step 1: Go to GHL');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(5000);

    const content = await page.content();
    if (content.includes('Sign into your account')) {
      log('Step 2: Google Login');
      await googleLogin(context, page);
    }

    // Get active page after login
    await sleep(3000);
    const pages = context.pages();
    const activePage = pages[pages.length - 1];
    await activePage.bringToFront();
    log('After login: ' + activePage.url());

    // Switch sub-account if needed
    if (activePage.url().includes('agency') || activePage.url().includes('launchpad')) {
      log('Step 3: Switch sub-account');
      await activePage.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await activePage.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
    }

    // Step 4: Go to workflows
    log('Step 4: Navigate to workflows');
    await activePage.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(8000);  // Wait longer for full load
    await activePage.screenshot({ path: 'screenshots/map-01-workflows.png' });

    // Map elements
    log('\n=== MAPPING WORKFLOW PAGE ===\n');

    const elements = await activePage.evaluate(() => {
      const results = {};
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || '').trim().replace(/\n/g, ' ');
        if (rect.width > 10 && rect.height > 10 && text && text.length > 1 && text.length < 50) {
          const area = rect.width * rect.height;
          if (!results[text] || area < results[text].area) {
            results[text] = {
              x: Math.round(rect.x + rect.width / 2),
              y: Math.round(rect.y + rect.height / 2),
              area: area
            };
          }
        }
      });
      return results;
    });

    // Show key elements
    const keywords = ['Create Workflow', 'Create Folder', 'Workflow List', 'All Workflows', 'Search', 'Settings', 'Automation'];
    keywords.forEach(kw => {
      if (elements[kw]) {
        log(`"${kw}" => (${elements[kw].x}, ${elements[kw].y})`);
      }
    });

    // Find Create Workflow specifically
    const createWorkflow = Object.entries(elements).find(([k]) => k.includes('Create Workflow'));
    if (createWorkflow) {
      log(`\nFound: "${createWorkflow[0]}" at (${createWorkflow[1].x}, ${createWorkflow[1].y})`);

      // Click it
      log('\nClicking Create Workflow...');
      await activePage.mouse.click(createWorkflow[1].x, createWorkflow[1].y);
      await sleep(2000);
      await activePage.screenshot({ path: 'screenshots/map-02-dropdown.png' });

      // Find dropdown items
      const dropdown = await activePage.evaluate(() => {
        const results = {};
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          const text = (el.innerText || '').trim();
          if (rect.width > 0 && rect.height > 0 && rect.y > 100 && rect.y < 300) {
            if (text.includes('Scratch') || text.includes('Recipe') || text.includes('Template')) {
              results[text.substring(0, 40)] = {
                x: Math.round(rect.x + rect.width / 2),
                y: Math.round(rect.y + rect.height / 2)
              };
            }
          }
        });
        return results;
      });

      log('\nDropdown items:');
      Object.entries(dropdown).forEach(([k, v]) => log(`  "${k}" => (${v.x}, ${v.y})`));

      // Click Start from Scratch
      const scratch = dropdown['Start from Scratch'];
      if (scratch) {
        log('\nClicking Start from Scratch...');
        await activePage.mouse.click(scratch.x, scratch.y);
        await sleep(4000);
        await activePage.screenshot({ path: 'screenshots/map-03-editor.png' });

        // Map editor
        log('\n=== WORKFLOW EDITOR ELEMENTS ===\n');

        const editorElements = await activePage.evaluate(() => {
          const results = {};
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || '').trim();
            if (rect.width > 0 && rect.height > 0 && text && text.length > 1 && text.length < 40) {
              const area = rect.width * rect.height;
              if (!results[text] || area < results[text].area) {
                results[text] = { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2), area };
              }
            }
          });
          return results;
        });

        const editorKW = ['Trigger', 'Action', 'Save', 'Publish', 'Test', 'Back', 'Add', 'Name', 'Settings'];
        editorKW.forEach(kw => {
          const found = Object.entries(editorElements).find(([k]) => k.includes(kw));
          if (found) log(`"${found[0]}" => (${found[1].x}, ${found[1].y})`);
        });
      }
    }

    // Save auth
    await context.storageState({ path: 'ghl-auth.json' });
    log('\nAuth saved');

    log('\nBrowser open 60s...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
