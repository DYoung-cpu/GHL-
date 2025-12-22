const { chromium } = require('playwright');
const fs = require('fs');

// CORRECT coordinates from inspection
const UI = {
  login: {
    // Google iframe button - discovered via page inspection
    googleIframeButton: { x: 960, y: 564 }
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
  log('Clicking Google iframe button at (960, 564)');
  await page.mouse.click(UI.login.googleIframeButton.x, UI.login.googleIframeButton.y);
  await sleep(3000);

  // Wait for Google popup
  log('Waiting for Google popup...');
  let googlePage = null;

  for (let i = 0; i < 20; i++) {
    const allPages = context.pages();
    log('Pages found: ' + allPages.length);

    for (const p of allPages) {
      const url = p.url();
      if (url.includes('accounts.google.com') && !url.includes('gsi/button')) {
        googlePage = p;
        log('Found Google auth page');
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
  await googlePage.screenshot({ path: 'screenshots/google-popup.png' });
  log('Google URL: ' + googlePage.url());

  // Enter email
  try {
    log('Entering email...');
    const emailInput = googlePage.locator('input[type="email"]');
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(CONFIG.email);
    await sleep(500);

    // Click Next
    const nextBtn = googlePage.locator('#identifierNext button, button:has-text("Next")').first();
    await nextBtn.click();
    log('Clicked Next after email');
    await sleep(4000);
  } catch (e) {
    log('Email step issue: ' + e.message);
  }

  await googlePage.screenshot({ path: 'screenshots/google-after-email.png' });

  // Enter password
  try {
    log('Entering password...');
    const passInput = googlePage.locator('input[type="password"]');
    await passInput.waitFor({ timeout: 10000 });
    await passInput.fill(CONFIG.password);
    await sleep(500);

    // Click Next/Sign in
    const signInBtn = googlePage.locator('#passwordNext button, button:has-text("Next")').first();
    await signInBtn.click();
    log('Clicked Sign in after password');
    await sleep(6000);
  } catch (e) {
    log('Password step issue: ' + e.message);
  }

  await googlePage.screenshot({ path: 'screenshots/google-after-password.png' });

  // Return to main page
  await page.bringToFront();
  await sleep(3000);

  return true;
}

async function main() {
  log('=== GHL FINAL LOGIN TEST ===');

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
    await page.screenshot({ path: 'screenshots/f01-landing.png' });
    log('Current URL: ' + page.url());

    // Check if login needed
    const content = await page.content();
    const needsLogin = content.includes('Sign into your account');

    if (needsLogin) {
      log('Step 2: Performing Google login');
      const success = await handleGoogleLogin(context, page);

      if (!success) {
        log('Login failed');
        await browser.close();
        return;
      }

      await page.screenshot({ path: 'screenshots/f02-after-login.png' });
      log('After login URL: ' + page.url());
    }

    await sleep(3000);
    log('Current URL: ' + page.url());

    // Check for sub-account switch
    const currentUrl = page.url();
    if (currentUrl.includes('agency') || currentUrl.includes('launchpad')) {
      log('Step 3: Switching sub-account');
      await page.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await page.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
    }

    // Navigate to workflows
    log('Step 4: Navigate to workflows');
    const workflowsUrl = 'https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows';
    await page.goto(workflowsUrl);
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/f03-workflows.png' });
    log('Workflows URL: ' + page.url());

    // Verify success
    const wfContent = await page.content();
    if (wfContent.includes('Sign into your account')) {
      log('ERROR: Still on login page');
    } else if (wfContent.includes('Workflow') || wfContent.includes('Create')) {
      log('SUCCESS: On workflows page!');

      // Click Create Workflow
      log('Step 5: Click Create Workflow');
      await page.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/f04-dropdown.png' });

      // Click Start from Scratch
      log('Step 6: Click Start from Scratch');
      await page.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
      await sleep(3000);
      await page.screenshot({ path: 'screenshots/f05-editor.png' });

      log('=== WORKFLOW EDITOR REACHED ===');
    }

    // Save auth
    await context.storageState({ path: 'ghl-auth.json' });
    log('Auth saved to ghl-auth.json');

    log('Browser open for 60 seconds...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    console.error(error);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
