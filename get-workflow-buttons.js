const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11, 8) + '] ' + msg);

async function main() {
  log('=== GET WORKFLOW BUTTON COORDINATES ===');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'  // Use saved auth
  });
  const page = await context.newPage();

  try {
    // Go to workflows
    log('Navigating to workflows...');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(5000);

    // Check if logged in
    const content = await page.content();
    if (content.includes('Sign into your account')) {
      log('ERROR: Not logged in. Run ghl-working-login.js first.');
      await browser.close();
      return;
    }

    log('On workflows page - finding buttons...');

    // Find Create Workflow button
    const createBtn = page.locator('button:has-text("Create Workflow"), div:has-text("Create Workflow")').first();
    const createBox = await createBtn.boundingBox();
    if (createBox) {
      log('');
      log('=== CREATE WORKFLOW BUTTON ===');
      log('  Bounding box: x=' + Math.round(createBox.x) + ' y=' + Math.round(createBox.y) + ' w=' + Math.round(createBox.width) + ' h=' + Math.round(createBox.height));
      log('  CENTER: (' + Math.round(createBox.x + createBox.width/2) + ', ' + Math.round(createBox.y + createBox.height/2) + ')');
    }

    // Click Create Workflow to show dropdown
    log('\nClicking Create Workflow button...');
    await createBtn.click();
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/dropdown-open.png' });

    // Find Start from Scratch
    const scratchBtn = page.locator('text=Start from Scratch').first();
    const scratchBox = await scratchBtn.boundingBox();
    if (scratchBox) {
      log('');
      log('=== START FROM SCRATCH ===');
      log('  Bounding box: x=' + Math.round(scratchBox.x) + ' y=' + Math.round(scratchBox.y) + ' w=' + Math.round(scratchBox.width) + ' h=' + Math.round(scratchBox.height));
      log('  CENTER: (' + Math.round(scratchBox.x + scratchBox.width/2) + ', ' + Math.round(scratchBox.y + scratchBox.height/2) + ')');
    }

    // Find Create Folder
    const folderBtn = page.locator('text=Create Folder').first();
    const folderBox = await folderBtn.boundingBox();
    if (folderBox) {
      log('');
      log('=== CREATE FOLDER ===');
      log('  Bounding box: x=' + Math.round(folderBox.x) + ' y=' + Math.round(folderBox.y) + ' w=' + Math.round(folderBox.width) + ' h=' + Math.round(folderBox.height));
      log('  CENTER: (' + Math.round(folderBox.x + folderBox.width/2) + ', ' + Math.round(folderBox.y + folderBox.height/2) + ')');
    }

    // Click Start from Scratch to go to editor
    log('\nClicking Start from Scratch...');
    await scratchBtn.click();
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/workflow-editor-new.png' });
    log('Screenshot: workflow-editor-new.png');

    // Find elements in the workflow editor
    log('\n=== WORKFLOW EDITOR ELEMENTS ===');

    // Look for Add Trigger
    const triggerArea = page.locator('text=Add Trigger').first();
    const triggerBox = await triggerArea.boundingBox().catch(() => null);
    if (triggerBox) {
      log('Add Trigger: CENTER (' + Math.round(triggerBox.x + triggerBox.width/2) + ', ' + Math.round(triggerBox.y + triggerBox.height/2) + ')');
    }

    // Look for common elements
    const elements = ['Save', 'Publish', 'Test', 'Back', 'Settings'];
    for (const el of elements) {
      const btn = page.locator('text=' + el).first();
      const box = await btn.boundingBox().catch(() => null);
      if (box) {
        log(el + ': CENTER (' + Math.round(box.x + box.width/2) + ', ' + Math.round(box.y + box.height/2) + ')');
      }
    }

    log('\nBrowser open for 30 seconds...');
    await sleep(30000);

  } catch (error) {
    log('ERROR: ' + error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
