const { chromium } = require('playwright');
const fs = require('fs');

// WORKING coordinates - verified
const UI = {
  login: {
    googleIframeButton: { x: 960, y: 564 }  // Google OAuth iframe button
  },
  switcher: {
    clickToSwitch: { x: 122, y: 93 },
    missionControl: { x: 383, y: 300 }
  },
  workflows: {
    createWorkflow: { x: 1509, y: 51 },
    startFromScratch: { x: 1466, y: 101 }
  },
  triggers: {
    birthdayReminder: { x: 1540, y: 415 }
  },
  editor: {
    saveTrigger: { x: 1834, y: 1044 }
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

async function handleGoogleLogin(context, page) {
  log('Clicking Google button at (960, 564)');
  await page.mouse.click(UI.login.googleIframeButton.x, UI.login.googleIframeButton.y);
  await sleep(3000);

  // Find Google popup
  let googlePage = null;
  for (let i = 0; i < 15; i++) {
    const allPages = context.pages();
    for (const p of allPages) {
      const url = p.url();
      if (url.includes('accounts.google.com') && !url.includes('gsi/button')) {
        googlePage = p;
        break;
      }
    }
    if (googlePage) break;
    await sleep(1000);
  }

  if (!googlePage) {
    log('ERROR: Google popup not found');
    return false;
  }

  await googlePage.bringToFront();
  await sleep(2000);
  log('Google popup found');

  // Enter email
  try {
    const emailInput = googlePage.locator('input[type="email"]');
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(CONFIG.email);
    log('Entered email');

    const nextBtn = googlePage.locator('#identifierNext button, button:has-text("Next")').first();
    await nextBtn.click();
    log('Clicked Next');
    await sleep(4000);
  } catch (e) {
    log('Email step: ' + e.message);
  }

  // Enter password
  try {
    const passInput = googlePage.locator('input[type="password"]');
    await passInput.waitFor({ timeout: 10000 });
    await passInput.fill(CONFIG.password);
    log('Entered password');

    const signInBtn = googlePage.locator('#passwordNext button, button:has-text("Next")').first();
    await signInBtn.click();
    log('Clicked Sign in');
    await sleep(5000);
  } catch (e) {
    log('Password step: ' + e.message);
  }

  // Wait for redirect - Google popup will close on success
  log('Waiting for authentication to complete...');
  await sleep(5000);

  // Return to main page
  try {
    await page.bringToFront();
  } catch (e) {
    // Main page might have navigated
  }

  return true;
}

async function main() {
  log('=== GHL WORKING LOGIN ===');

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
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/w01-landing.png' });

    // Check if login needed
    const content = await page.content();
    const needsLogin = content.includes('Sign into your account');
    log('Needs login: ' + needsLogin);

    if (needsLogin) {
      log('Step 2: Google login');
      await handleGoogleLogin(context, page);
    }

    // Get current state after login
    await sleep(3000);

    // Get the active page (might be different after login redirect)
    const pages = context.pages();
    const activePage = pages[pages.length - 1];
    await activePage.bringToFront();

    log('After login URL: ' + activePage.url());
    await activePage.screenshot({ path: 'screenshots/w02-after-login.png' });

    // Check for sub-account switch
    const currentUrl = activePage.url();
    if (currentUrl.includes('agency') || currentUrl.includes('launchpad')) {
      log('Step 3: Switching sub-account');
      await activePage.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await activePage.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
      await activePage.screenshot({ path: 'screenshots/w03-switched.png' });
    }

    // Navigate to workflows
    log('Step 4: Navigate to workflows');
    const workflowsUrl = 'https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows';
    await activePage.goto(workflowsUrl);
    await sleep(5000);
    await activePage.screenshot({ path: 'screenshots/w04-workflows.png' });
    log('Current URL: ' + activePage.url());

    // Check if on workflows page
    const wfContent = await activePage.content();
    if (wfContent.includes('Sign into your account')) {
      log('ERROR: Still on login page - auth failed');
    } else {
      log('SUCCESS: Authenticated!');

      // Click Create Workflow
      log('Step 5: Click Create Workflow');
      await activePage.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
      await sleep(2000);
      await activePage.screenshot({ path: 'screenshots/w05-dropdown.png' });

      // Click Start from Scratch
      log('Step 6: Click Start from Scratch');
      await activePage.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
      await sleep(3000);
      await activePage.screenshot({ path: 'screenshots/w06-editor.png' });

      log('=== WORKFLOW EDITOR REACHED ===');
    }

    // Save auth
    await context.storageState({ path: 'ghl-auth.json' });
    log('Auth saved');

    log('Browser open 60s for inspection...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
