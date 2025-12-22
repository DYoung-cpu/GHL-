const { chromium } = require('playwright');
const fs = require('fs');

// Recorded coordinates from user click session
const UI = {
  login: {
    googleOneTap: { x: 227, y: 19 },      // Google One Tap popup at top
    accountSelect: { x: 144, y: 31 }       // david@lendwisemtg.com
  },
  switcher: {
    clickToSwitch: { x: 122, y: 93 },
    missionControl: { x: 383, y: 300 }
  },
  sidebar: {
    automation: { x: 83, y: 564 }
  },
  workflows: {
    tab: { x: 396, y: 54 },
    createWorkflow: { x: 1509, y: 51 },
    startFromScratch: { x: 1466, y: 101 }
  },
  triggers: {
    birthdayReminder: { x: 1540, y: 415 },
    contactChanged: { x: 1511, y: 591 }
  },
  editor: {
    saveTrigger: { x: 1834, y: 1044 },
    backToWorkflows: { x: 64, y: 30 }
  }
};

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const time = new Date().toISOString().substr(11, 8);
  console.log('[' + time + '] ' + msg);
}

async function main() {
  log('=== TEST RECORDED COORDINATES ===');

  // Create screenshots folder if needed
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Step 1: Go to GHL
    log('Step 1: Navigate to GHL');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/01-landing.png' });
    log('Screenshot saved: 01-landing.png');
    log('Current URL: ' + page.url());

    // Step 2: Check if login needed
    const needsLogin = page.url().includes('login') || page.url().includes('accounts.google');

    if (needsLogin) {
      log('Step 2: Login required - clicking Google One Tap');

      // Try clicking the Google One Tap popup
      await page.mouse.click(UI.login.googleOneTap.x, UI.login.googleOneTap.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/02-after-google-click.png' });

      // Check for Google popup window
      const allPages = context.pages();
      log('Open pages: ' + allPages.length);

      for (const p of allPages) {
        const url = p.url();
        log('Page URL: ' + url);

        if (url.includes('accounts.google.com')) {
          log('Found Google auth page - handling login');
          await p.bringToFront();
          await sleep(2000);

          // Try to enter email
          try {
            const emailInput = p.locator('input[type="email"]');
            if (await emailInput.isVisible({ timeout: 5000 })) {
              await emailInput.fill(CONFIG.email);
              await p.keyboard.press('Enter');
              log('Entered email');
              await sleep(3000);
            }
          } catch (e) {
            log('Email input not found: ' + e.message);
          }

          // Try to enter password
          try {
            const passInput = p.locator('input[type="password"]');
            if (await passInput.isVisible({ timeout: 5000 })) {
              await passInput.fill(CONFIG.password);
              await p.keyboard.press('Enter');
              log('Entered password');
              await sleep(5000);
            }
          } catch (e) {
            log('Password input not found: ' + e.message);
          }

          break;
        }
      }

      // Return to main page
      await page.bringToFront();
      await sleep(3000);
    }

    await page.screenshot({ path: 'screenshots/03-after-login.png' });
    log('Current URL after login: ' + page.url());

    // Step 3: Navigate directly to workflows
    log('Step 3: Navigate to workflows page');
    const workflowsUrl = 'https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows';
    await page.goto(workflowsUrl);
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/04-workflows-page.png' });
    log('On workflows page');

    // Step 4: Click Create Workflow button
    log('Step 4: Click Create Workflow at (' + UI.workflows.createWorkflow.x + ', ' + UI.workflows.createWorkflow.y + ')');
    await page.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/05-create-dropdown.png' });

    // Step 5: Click Start from Scratch
    log('Step 5: Click Start from Scratch at (' + UI.workflows.startFromScratch.x + ', ' + UI.workflows.startFromScratch.y + ')');
    await page.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/06-workflow-editor.png' });

    log('=== TEST COMPLETE ===');
    log('Check screenshots folder for results');
    log('Browser staying open for 60 seconds for inspection...');

    // Save auth state for future runs
    try {
      await context.storageState({ path: 'ghl-auth.json' });
      log('Auth state saved to ghl-auth.json');
    } catch (e) {
      log('Could not save auth: ' + e.message);
    }

    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
