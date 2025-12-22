const { chromium } = require('playwright');
const fs = require('fs');

const UI = {
  login: {
    googleButton: { x: 728, y: 427 }  // "Sign in with Google" - center of form
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
const log = (msg) => console.log('[' + new Date().toISOString().substr(11,8) + '] ' + msg);

async function main() {
  log('=== GHL AUTOMATION TEST WITH LOGIN ===');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  try {
    // Step 1: Go to GHL and login
    log('Step 1: Go to GHL');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(3000);
    
    // Click Google Sign In
    log('Step 2: Click Google Sign In');
    await page.mouse.click(UI.login.googleButton.x, UI.login.googleButton.y);
    await sleep(3000);
    
    // Handle Google popup
    const pages = context.pages();
    log('Pages found: ' + pages.length);
    
    for (const p of pages) {
      if (p.url().includes('accounts.google.com')) {
        log('Found Google page - entering credentials');
        await p.bringToFront();
        await sleep(2000);
        
        // Email
        const emailInput = p.locator('input[type="email"]');
        if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await emailInput.fill(CONFIG.email);
          await p.keyboard.press('Enter');
          log('Entered email');
          await sleep(4000);
        }
        
        // Password
        const passInput = p.locator('input[type="password"]');
        if (await passInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await passInput.fill(CONFIG.password);
          await p.keyboard.press('Enter');
          log('Entered password');
          await sleep(6000);
        }
        break;
      }
    }
    
    // Switch back to main page
    await page.bringToFront();
    await sleep(5000);
    log('Current URL: ' + page.url());
    await page.screenshot({ path: 'screenshots/login-result.png' });
    
    // Check if we need to switch sub-account
    if (page.url().includes('agency_launchpad') || page.url().includes('gohighlevel.com/')) {
      log('Step 3: Switch to Mission Control sub-account');
      await page.mouse.click(UI.switcher.clickToSwitch.x, UI.switcher.clickToSwitch.y);
      await sleep(2000);
      await page.mouse.click(UI.switcher.missionControl.x, UI.switcher.missionControl.y);
      await sleep(3000);
    }
    
    // Navigate to workflows
    log('Step 4: Navigate to workflows');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/workflows-page.png' });
    
    // Create new workflow
    log('Step 5: Click Create Workflow');
    await page.mouse.click(UI.workflows.createWorkflow.x, UI.workflows.createWorkflow.y);
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/create-dropdown.png' });
    
    log('Step 6: Click Start from Scratch');
    await page.mouse.click(UI.workflows.startFromScratch.x, UI.workflows.startFromScratch.y);
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/workflow-editor.png' });
    
    log('=== TEST COMPLETE ===');
    log('Browser staying open 60s for inspection...');
    await sleep(60000);
    
  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
