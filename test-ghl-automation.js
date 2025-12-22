const { chromium } = require('playwright');
const fs = require('fs');

// Coordinates learned from recording session
const UI = {
  sidebar: {
    automation: { x: 83, y: 564 },
    settings: { x: 84, y: 1037 },
    contacts: { x: 81, y: 354 }
  },
  switcher: {
    clickToSwitch: { x: 122, y: 93 },
    missionControl: { x: 383, y: 300 }
  },
  workflows: {
    tab: { x: 396, y: 54 },
    createWorkflow: { x: 1509, y: 51 },
    startFromScratch: { x: 1466, y: 101 },
    backToWorkflows: { x: 64, y: 30 }
  },
  editor: {
    testWorkflow: { x: 1662, y: 95 },
    saveTrigger: { x: 1834, y: 1044 }
  },
  triggers: {
    birthdayReminder: { x: 1540, y: 415 },
    contactChanged: { x: 1511, y: 591 }
  }
};

const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11,8) + '] ' + msg);

async function click(page, coords, name) {
  log('Clicking ' + name + ' at (' + coords.x + ', ' + coords.y + ')');
  await page.mouse.click(coords.x, coords.y);
  await sleep(1500);
}

async function main() {
  log('=== TESTING GHL AUTOMATION ===');
  
  // Check for saved auth
  if (!fs.existsSync('ghl-auth.json')) {
    log('ERROR: No auth file found. Run recorder first.');
    return;
  }
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();
  
  try {
    // Step 1: Go directly to workflows page
    log('Step 1: Navigate to workflows');
    await page.goto('https://app.gohighlevel.com/v2/location/' + LOCATION_ID + '/automation/workflows');
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/test-01-workflows.png' });
    log('Screenshot: test-01-workflows.png');
    
    // Step 2: Click Create Workflow
    log('Step 2: Click Create Workflow');
    await click(page, UI.workflows.createWorkflow, 'Create Workflow');
    await page.screenshot({ path: 'screenshots/test-02-dropdown.png' });
    
    // Step 3: Click Start from Scratch
    log('Step 3: Click Start from Scratch');
    await click(page, UI.workflows.startFromScratch, 'Start from Scratch');
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/test-03-editor.png' });
    
    // Step 4: Click on trigger area (center of canvas)
    log('Step 4: Click trigger area');
    await page.mouse.click(640, 350);
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/test-04-trigger-panel.png' });
    
    // Step 5: Select Birthday Reminder trigger
    log('Step 5: Select Birthday Reminder trigger');
    await click(page, UI.triggers.birthdayReminder, 'Birthday Reminder');
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/test-05-trigger-selected.png' });
    
    // Step 6: Save trigger
    log('Step 6: Save trigger');
    await click(page, UI.editor.saveTrigger, 'Save Trigger');
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/test-06-saved.png' });
    
    log('=== TEST COMPLETE ===');
    log('Check screenshots folder for results');
    log('Keeping browser open for 30 seconds...');
    await sleep(30000);
    
  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/test-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
