/**
 * Connect to existing Chrome browser and build workflow actions
 *
 * Prerequisites:
 * 1. Close Chrome completely
 * 2. Reopen Chrome with: chrome.exe --remote-debugging-port=9222
 * 3. Navigate to the workflow builder page in GHL
 * 4. Run this script
 */

const { chromium } = require('playwright');

async function connectAndBuild() {
  console.log('='.repeat(60));
  console.log('CONNECTING TO YOUR CHROME BROWSER');
  console.log('='.repeat(60));

  try {
    // Connect to existing Chrome instance
    console.log('\nConnecting to Chrome on port 9222...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected successfully!\n');

    // Get all contexts (browser windows)
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser context(s)`);

    if (contexts.length === 0) {
      console.log('No browser contexts found. Make sure Chrome is open with pages.');
      return;
    }

    // Get all pages
    const context = contexts[0];
    const pages = context.pages();
    console.log(`Found ${pages.length} page(s)`);

    // Find the GHL page
    let ghlPage = null;
    for (const page of pages) {
      const url = page.url();
      console.log(`  - ${url.substring(0, 80)}...`);
      if (url.includes('gohighlevel.com') || url.includes('highlevel')) {
        ghlPage = page;
        console.log('    ^ Found GHL page!');
      }
    }

    if (!ghlPage) {
      console.log('\nERROR: No GHL page found. Please navigate to the workflow builder.');
      return;
    }

    // Bring page to front
    await ghlPage.bringToFront();
    console.log('\nGHL page is now active.');

    // Take screenshot of current state
    await ghlPage.screenshot({ path: 'screenshots/connected-state.png' });
    console.log('Screenshot saved: screenshots/connected-state.png');

    // Analyze the page
    console.log('\n' + '='.repeat(60));
    console.log('ANALYZING WORKFLOW BUILDER');
    console.log('='.repeat(60));

    const url = ghlPage.url();
    console.log('Current URL:', url);

    // Check if we're on a workflow builder page
    if (!url.includes('workflow')) {
      console.log('\nWARNING: URL does not contain "workflow". Are you on the right page?');
    }

    // Find the workflow builder elements
    console.log('\nLooking for workflow builder elements...');

    // Look for the "+" button to add actions
    const plusButtons = await ghlPage.locator('text=+').all();
    console.log(`Found ${plusButtons.length} elements with "+" text`);

    // Look for specific workflow elements
    const triggerBlock = await ghlPage.locator('text=Trigger').first();
    if (await triggerBlock.isVisible()) {
      console.log('Found Trigger block');
    }

    const endBlock = await ghlPage.locator('text=END').first();
    if (await endBlock.isVisible()) {
      console.log('Found END block');
    }

    // Find clickable areas between trigger and end
    // In GHL workflow builder, there's usually a "+" or line you can click
    console.log('\nSearching for "Add Action" area...');

    // Common selectors for add action
    const addActionSelectors = [
      '[class*="add-action"]',
      '[class*="addAction"]',
      '[class*="add-node"]',
      '[data-testid*="add"]',
      'button svg', // Plus icon buttons
      '.workflow-builder button',
      '[class*="connector"]'
    ];

    for (const selector of addActionSelectors) {
      const elements = await ghlPage.locator(selector).all();
      if (elements.length > 0) {
        console.log(`  Found ${elements.length} element(s) with selector: ${selector}`);
      }
    }

    // Try to find and click the add button
    console.log('\n' + '='.repeat(60));
    console.log('ATTEMPTING TO ADD ACTION');
    console.log('='.repeat(60));

    // Look for the small "+" button in the workflow canvas
    // It's usually between nodes or on a connector line

    // First, let's try clicking in the area below the trigger
    const triggerBbox = await triggerBlock.boundingBox();
    if (triggerBbox) {
      console.log(`Trigger block at: x=${triggerBbox.x}, y=${triggerBbox.y}`);

      // The "+" button is typically below the trigger block
      // Let's look for it
      const addButton = await ghlPage.locator('button:has(svg), [role="button"]:has(svg)').filter({
        has: ghlPage.locator('path[d*="M12"]') // Common plus icon path
      }).first();

      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found add button with plus icon!');
      }
    }

    // Alternative: look for any clickable element near the connector line
    // GHL uses a visual connector between nodes
    const connectorElements = await ghlPage.locator('[class*="edge"], [class*="path"], [class*="connector"], [class*="line"]').all();
    console.log(`Found ${connectorElements.length} potential connector elements`);

    // Let's try a more direct approach - look for anything that says "Add"
    const addElements = await ghlPage.locator('*:has-text("Add")').all();
    console.log(`Found ${addElements.length} elements containing "Add"`);

    for (let i = 0; i < Math.min(addElements.length, 10); i++) {
      const el = addElements[i];
      try {
        const text = await el.textContent();
        const tag = await el.evaluate(e => e.tagName);
        if (text && text.length < 50) {
          console.log(`  ${i}: <${tag}> "${text.trim()}"`);
        }
      } catch (e) {}
    }

    // Save page HTML for analysis
    const html = await ghlPage.content();
    require('fs').writeFileSync('workflow-page.html', html);
    console.log('\nSaved page HTML to workflow-page.html for analysis');

    // Take final screenshot
    await ghlPage.screenshot({ path: 'screenshots/workflow-analyzed.png', fullPage: true });
    console.log('Full page screenshot saved: screenshots/workflow-analyzed.png');

    console.log('\n' + '='.repeat(60));
    console.log('NEXT STEPS');
    console.log('='.repeat(60));
    console.log('1. Check the screenshots to see current state');
    console.log('2. I can analyze workflow-page.html to find exact selectors');
    console.log('3. Then create targeted automation');

    // Don't close - keep connection for further commands
    console.log('\nBrowser connection remains open for further automation.');

  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nERROR: Could not connect to Chrome.');
      console.log('Make sure Chrome is running with --remote-debugging-port=9222');
      console.log('\nRun this in PowerShell:');
      console.log('& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
    } else {
      console.error('Error:', error.message);
    }
  }
}

connectAndBuild();
