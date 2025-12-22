const { chromium } = require('playwright');
const fs = require('fs');

// UI coordinates (recorded from user clicks)
const UI = {
  switcher: {
    clickToSwitch: { x: 122, y: 93 },
    missionControl: { x: 383, y: 300 }
  },
  sidebar: {
    automation: { x: 83, y: 564 }
  },
  workflows: {
    createWorkflow: { x: 1509, y: 51 },
    startFromScratch: { x: 1466, y: 101 }
  },
  triggers: {
    birthdayReminder: { x: 1540, y: 415 },
    contactChanged: { x: 1511, y: 591 }
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
  log('Handling Google login with selectors...');

  // Use text selector to find and click the Google button
  try {
    const googleBtn = page.locator('text=Sign in with Google');
    await googleBtn.waitFor({ timeout: 5000 });
    log('Found Google button - clicking');
    await googleBtn.click();
  } catch (e) {
    log('Could not find Google button by text, trying alternative...');
    // Try clicking the button that contains Google icon
    const altBtn = page.locator('button:has-text("Google"), div:has-text("Sign in with Google")').first();
    await altBtn.click();
  }

  await sleep(3000);

  // Wait for Google popup
  log('Waiting for Google popup...');
  let googlePage = null;

  for (let i = 0; i < 15; i++) {
    const allPages = context.pages();
    for (const p of allPages) {
      const url = p.url();
      if (url.includes('accounts.google.com')) {
        googlePage = p;
        log('Found Google page');
        break;
      }
    }
    if (googlePage) break;
    await sleep(1000);
  }

  if (!googlePage) {
    log('Google popup not found - checking if login opened in same tab');
    // Check if Google login opened in same tab
    const currentUrl = page.url();
    if (currentUrl.includes('accounts.google.com')) {
      googlePage = page;
      log('Google login in same tab');
    } else {
      log('ERROR: Cannot find Google login');
      return false;
    }
  }

  await googlePage.bringToFront();
  await sleep(2000);
  await googlePage.screenshot({ path: 'screenshots/google-page.png' });

  // Handle email
  try {
    log('Looking for email input...');
    const emailInput = googlePage.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(CONFIG.email);
      log('Filled email');
      await sleep(500);

      // Click Next button
      const nextBtn = googlePage.locator('button:has-text("Next"), #identifierNext');
      await nextBtn.click();
      log('Clicked Next');
      await sleep(4000);
    }
  } catch (e) {
    log('Email step: ' + e.message);
  }

  await googlePage.screenshot({ path: 'screenshots/google-after-email.png' });

  // Handle password
  try {
    log('Looking for password input...');
    const passInput = googlePage.locator('input[type="password"]');
    if (await passInput.isVisible({ timeout: 8000 })) {
      await passInput.fill(CONFIG.password);
      log('Filled password');
      await sleep(500);

      // Click Next/Sign in button
      const signInBtn = googlePage.locator('button:has-text("Next"), #passwordNext');
      await signInBtn.click();
      log('Clicked Sign in');
      await sleep(5000);
    }
  } catch (e) {
    log('Password step: ' + e.message);
  }

  await googlePage.screenshot({ path: 'screenshots/google-after-password.png' });

  // Return to main page
  await page.bringToFront();
  await sleep(3000);

  return true;
}

async function main() {
  log('=== GHL SELECTOR-BASED LOGIN ===');

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
    await page.screenshot({ path: 'screenshots/01-ghl-landing.png' });

    // Check if login needed
    const content = await page.content();
    const needsLogin = content.includes('Sign into your account') || content.includes('Sign in with Google');

    log('Needs login: ' + needsLogin);

    if (needsLogin) {
      log('Step 2: Performing Google login');
      await handleGoogleLogin(context, page);
      await page.screenshot({ path: 'screenshots/02-after-login.png' });
      log('After login URL: ' + page.url());
    }

    // Wait for redirect/load
    await sleep(3000);
    log('Current URL: ' + page.url());

    // Navigate to workflows
    log('Step 3: Navigate to workflows');
    const workflowsUrl = 'https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows';
    await page.goto(workflowsUrl);
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/03-workflows.png' });

    // Verify we're logged in
    const wfContent = await page.content();
    if (wfContent.includes('Sign into your account')) {
      log('ERROR: Still on login page');
      await page.screenshot({ path: 'screenshots/still-login.png' });
    } else {
      log('SUCCESS: On workflows page');

      // Click Create Workflow
      log('Step 4: Click Create Workflow');
      await page.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/04-dropdown.png' });

      // Click Start from Scratch
      log('Step 5: Click Start from Scratch');
      await page.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
      await sleep(3000);
      await page.screenshot({ path: 'screenshots/05-editor.png' });

      log('=== WORKFLOW EDITOR REACHED ===');
    }

    // Save auth
    await context.storageState({ path: 'ghl-auth.json' });
    log('Auth saved');

    log('Browser open for 60s...');
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
