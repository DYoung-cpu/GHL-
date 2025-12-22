/**
 * Audit Current Workflows
 * Checks what workflows exist and their status
 */

const { chromium } = require('playwright');

const CONFIG = {
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  console.log('Navigating to workflows...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
  await new Promise(r => setTimeout(r, 8000));

  const frame = page.frame({ url: /automation-workflows/ });
  if (!frame) {
    console.log('ERROR: Frame not found');
    await browser.close();
    return;
  }

  console.log('\n=== CURRENT WORKFLOWS ===\n');

  // Get all workflow names visible on the page
  const workflows = await frame.evaluate(() => {
    const results = [];
    // Look for workflow list items
    const items = document.querySelectorAll('[class*="workflow"], tr, [class*="list-item"]');
    items.forEach(item => {
      const text = item.innerText || '';
      if (text.length > 5 && text.length < 200) {
        results.push(text.split('\n')[0].trim());
      }
    });
    return [...new Set(results)].slice(0, 30);
  });

  workflows.forEach((wf, i) => {
    console.log(`${i + 1}. ${wf}`);
  });

  await page.screenshot({ path: 'screenshots/workflow-audit.png' });
  console.log('\nScreenshot saved to screenshots/workflow-audit.png');

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

main().catch(console.error);
