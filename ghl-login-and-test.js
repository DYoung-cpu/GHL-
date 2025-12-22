const { chromium } = require('playwright');
const fs = require('fs');

// UI coordinates for login form page (centered at 1920x1080)
const UI = {
  loginForm: {
    signInWithGoogle: { x: 727, y: 427 }  // "Sign in with Google" button on login form
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

async function handleGoogleLogin(context, page) {
  log('Handling Google login flow...');

  // Click Sign in with Google button on the login form
  log('Clicking Sign in with Google button at (727, 427)');
  await page.mouse.click(UI.loginForm.signInWithGoogle.x, UI.loginForm.signInWithGoogle.y);
  await sleep(3000);

  // Look for Google popup/page
  let googlePage = null;
  const maxWait = 10;

  for (let i = 0; i < maxWait; i++) {
    const allPages = context.pages();
    log('Looking for Google page... Found ' + allPages.length + ' pages');

    for (const p of allPages) {
      const url = p.url();
      if (url.includes('accounts.google.com')) {
        googlePage = p;
        log('Found Google auth page: ' + url.substring(0, 60));
        break;
      }
    }

    if (googlePage) break;
    await sleep(1000);
  }

  if (!googlePage) {
    log('ERROR: Google page not found after ' + maxWait + ' seconds');
    return false;
  }

  await googlePage.bringToFront();
  await sleep(2000);
  await googlePage.screenshot({ path: 'screenshots/google-auth.png' });

  // Enter email
  log('Looking for email input...');
  try {
    await googlePage.waitForSelector('input[type="email"]', { timeout: 10000 });
    await googlePage.fill('input[type="email"]', CONFIG.email);
    log('Entered email: ' + CONFIG.email);
    await googlePage.keyboard.press('Enter');
    await sleep(4000);
    await googlePage.screenshot({ path: 'screenshots/google-email-entered.png' });
  } catch (e) {
    log('Email step issue: ' + e.message);
    // Maybe email was pre-filled or account already selected
  }

  // Enter password
  log('Looking for password input...');
  try {
    await googlePage.waitForSelector('input[type="password"]', { timeout: 10000 });
    await googlePage.fill('input[type="password"]', CONFIG.password);
    log('Entered password');
    await googlePage.keyboard.press('Enter');
    await sleep(5000);
    await googlePage.screenshot({ path: 'screenshots/google-password-entered.png' });
  } catch (e) {
    log('Password step issue: ' + e.message);
  }

  // Return to main page
  await page.bringToFront();
  await sleep(3000);

  return true;
}

async function main() {
  log('=== GHL LOGIN AND TEST ===');

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
    await page.screenshot({ path: 'screenshots/step1-landing.png' });

    // Check page content for login form
    const pageContent = await page.content();
    const isLoginPage = pageContent.includes('Sign into your account') ||
                        pageContent.includes('Sign in with Google') ||
                        !pageContent.includes('sidebar');

    log('Is login page: ' + isLoginPage);
    log('Current URL: ' + page.url());

    if (isLoginPage) {
      log('Step 2: Login required');
      const loginSuccess = await handleGoogleLogin(context, page);

      if (!loginSuccess) {
        log('Login failed - exiting');
        await page.screenshot({ path: 'screenshots/login-failed.png' });
        await browser.close();
        return;
      }

      await sleep(3000);
      await page.screenshot({ path: 'screenshots/step2-after-login.png' });
      log('After login URL: ' + page.url());
    }

    // Check if we need to switch sub-account
    const currentUrl = page.url();
    if (currentUrl.includes('agency') || currentUrl.includes('launchpad')) {
      log('Step 3: Switching to Mission Control sub-account');
      await page.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/step3-switcher.png' });

      await page.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
      await page.screenshot({ path: 'screenshots/step3-switched.png' });
    }

    // Step 4: Navigate to workflows
    log('Step 4: Navigate to workflows page');
    const workflowsUrl = 'https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows';
    await page.goto(workflowsUrl);
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/step4-workflows.png' });
    log('On workflows page: ' + page.url());

    // Verify we're on workflows page
    const wfContent = await page.content();
    if (wfContent.includes('Sign into your account')) {
      log('ERROR: Still on login page - authentication did not persist');
      await page.screenshot({ path: 'screenshots/auth-failed.png' });
    } else if (wfContent.includes('Workflows') || wfContent.includes('Create Workflow')) {
      log('SUCCESS: On workflows page!');

      // Step 5: Click Create Workflow
      log('Step 5: Click Create Workflow');
      await page.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/step5-dropdown.png' });

      // Step 6: Click Start from Scratch
      log('Step 6: Click Start from Scratch');
      await page.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
      await sleep(3000);
      await page.screenshot({ path: 'screenshots/step6-editor.png' });

      log('=== TEST COMPLETE ===');
    }

    // Save auth state
    try {
      await context.storageState({ path: 'ghl-auth.json' });
      log('Auth state saved to ghl-auth.json');
    } catch (e) {
      log('Could not save auth: ' + e.message);
    }

    log('Browser staying open 60 seconds for inspection...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
