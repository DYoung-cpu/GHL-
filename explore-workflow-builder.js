const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('GHL WORKFLOW BUILDER EXPLORATION');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync('ghl-auth.json') ? 'ghl-auth.json' : undefined
  });
  
  const page = await context.newPage();

  try {
    console.log('Navigating to workflows...');
    await page.goto('https://app.gohighlevel.com/v2/location/' + LOCATION_ID + '/automation/workflows', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await sleep(5000);
    
    await page.screenshot({ path: 'screenshots/wf-01-initial.png' });
    console.log('Screenshot: wf-01-initial.png');
    
    const url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('login') || url.includes('oauth')) {
      console.log('Need to login - please login manually');
      console.log('Waiting 90 seconds...');
      await sleep(90000);
      
      await page.goto('https://app.gohighlevel.com/v2/location/' + LOCATION_ID + '/automation/workflows', {
        waitUntil: 'domcontentloaded'
      });
      await sleep(5000);
    }
    
    await context.storageState({ path: 'ghl-auth.json' });
    console.log('Auth saved');
    
    await page.screenshot({ path: 'screenshots/wf-02-list.png' });
    console.log('Screenshot: wf-02-list.png');
    
    console.log('Clicking Create Workflow at (1257, 138)...');
    await page.mouse.click(1257, 138);
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/wf-03-dropdown.png' });
    
    console.log('Clicking Start from Scratch at (1200, 190)...');
    await page.mouse.click(1200, 190);
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/wf-04-editor.png' });
    
    console.log('Browser open for 5 minutes - explore manually');
    console.log('Check screenshots folder for captures');
    await sleep(300000);
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/wf-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
