/**
 * Debug Script - Configure ONE workflow trigger
 * Uses saved auth and detailed debugging
 */

require('dotenv').config();
const { chromium } = require('playwright');

const LOCATION_ID = process.env.GHL_LOCATION_ID;

// Target one workflow
const WORKFLOW_ID = 'bda4857d-a537-4286-a7ca-2cce4ae97f6b'; // Application Process Updates
const TRIGGER_TAG = 'application started';

async function main() {
  console.log('=== Debug Trigger Configuration ===\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'auth.json'
  });

  const page = await context.newPage();

  try {
    // Go to workflows list first to verify we're logged in
    console.log('1. Going to workflows list...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/debug-01-workflows-list.png', fullPage: true });
    console.log('   Screenshot: debug-01-workflows-list.png');

    // Check if we need to re-login (look for login elements)
    const loginCheck = await page.$('input[type="email"], text=Sign in, text=Log in');
    if (loginCheck) {
      console.log('   WARNING: Not logged in - need to re-authenticate');
      await browser.close();
      return;
    }

    // Navigate to specific workflow
    console.log('\n2. Going to workflow editor...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflow/${WORKFLOW_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'screenshots/debug-02-workflow-editor.png', fullPage: true });
    console.log('   Screenshot: debug-02-workflow-editor.png');

    // Get page title and URL for verification
    const url = page.url();
    const title = await page.title();
    console.log(`   URL: ${url}`);
    console.log(`   Title: ${title}`);

    // Look for the trigger block/node
    console.log('\n3. Looking for trigger elements...');

    // Take screenshot of just the viewport area (not full page)
    await page.screenshot({ path: 'screenshots/debug-03-viewport.png' });

    // List all visible text on page
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('   Page text sample:', pageText.substring(0, 300));

    // Look for react-flow nodes
    const nodes = await page.$$('.react-flow__node');
    console.log(`   Found ${nodes.length} react-flow nodes`);

    // Look for any clickable trigger-related elements
    const triggerElements = await page.$$('[class*="trigger"], [data-id*="trigger"], text=Add Trigger, text=Trigger');
    console.log(`   Found ${triggerElements.length} trigger-related elements`);

    // Try clicking on the canvas area where trigger should be
    console.log('\n4. Clicking trigger area (center-top of canvas)...');
    await page.mouse.click(700, 350);  // Approximate center where trigger block appears
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/debug-04-after-click.png', fullPage: true });
    console.log('   Screenshot: debug-04-after-click.png');

    // Check if a panel opened on the right
    const panels = await page.$$('[class*="panel"], [class*="sidebar"], [class*="drawer"]');
    console.log(`   Found ${panels.length} panel elements`);

    // Look for trigger type options
    console.log('\n5. Looking for trigger type options...');
    const contactTag = await page.$('text=Contact Tag');
    const customerTag = await page.$('text=Customer Tag');
    const tagAdded = await page.$('text=Tag Added');
    console.log(`   Contact Tag found: ${!!contactTag}`);
    console.log(`   Customer Tag found: ${!!customerTag}`);
    console.log(`   Tag Added found: ${!!tagAdded}`);

    if (contactTag) {
      await contactTag.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/debug-05-trigger-type.png', fullPage: true });
    }

    // Look for save button
    const saveButtons = await page.$$('button');
    console.log(`\n6. Found ${saveButtons.length} buttons`);
    for (let i = 0; i < Math.min(5, saveButtons.length); i++) {
      const text = await saveButtons[i].innerText();
      console.log(`   Button ${i}: "${text}"`);
    }

    console.log('\n=== Debug Complete ===');
    console.log('Browser will stay open for 120 seconds for manual inspection...');

    await page.waitForTimeout(120000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/debug-error.png', fullPage: true });
  }

  await browser.close();
}

main().catch(console.error);
