const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

(async () => {
  console.log('===========================================');
  console.log('INTERACTIVE BROWSER HELPER');
  console.log('===========================================');
  console.log('Browser will open. You navigate manually.');
  console.log('Press ENTER anytime to take a screenshot.');
  console.log('Type "quit" to close.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  // Go to GHL
  await page.goto('https://app.gohighlevel.com/');
  console.log('Browser opened to GHL login page.\n');
  console.log('Navigate manually. Press ENTER when you want me to take a screenshot.\n');

  let screenshotCount = 0;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const takeScreenshot = async () => {
    screenshotCount++;
    const filename = `/mnt/c/Users/dyoun/ghl-automation/screenshots/interactive-${screenshotCount}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`Screenshot saved: interactive-${screenshotCount}.png`);

    // Also dump current URL and page title
    const url = page.url();
    const title = await page.title();
    console.log(`URL: ${url}`);
    console.log(`Title: ${title}\n`);
  };

  rl.on('line', async (input) => {
    if (input.toLowerCase() === 'quit') {
      console.log('Closing browser...');
      await browser.close();
      rl.close();
      process.exit(0);
    } else {
      await takeScreenshot();
    }
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    await browser.close();
    process.exit(0);
  });

})();
