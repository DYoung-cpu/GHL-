const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('WATCH MODE - Browser open for manual navigation');
  console.log('Navigate manually. I will take screenshots periodically.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  global.page = await context.newPage();
  global.browser = browser;

  // Go to GHL login
  await global.page.goto('https://app.gohighlevel.com/');
  console.log('Browser opened to GHL. You can navigate now.\n');

  // Keep alive for 30 minutes
  await new Promise(resolve => setTimeout(resolve, 1800000));

  await browser.close();
})();

// Export for external screenshot taking
module.exports = { getPage: () => global.page };
