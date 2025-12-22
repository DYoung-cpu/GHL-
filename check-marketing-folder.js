/**
 * Check Marketing Workflows folder for named workflows
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

  // Click on Marketing Workflows folder
  console.log('Opening Marketing Workflows folder...');
  await frame.locator('text=Marketing Workflows').click();
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: 'screenshots/marketing-folder.png' });
  console.log('Screenshot saved to screenshots/marketing-folder.png');

  // Count workflows in this folder
  const rows = await frame.locator('tr').count();
  console.log(`Found ${rows} rows in the folder`);

  // Check both pages if paginated
  const nextBtn = frame.locator('text=Next');
  if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
    console.log('Checking next page...');
    await nextBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/marketing-folder-page2.png' });
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

main().catch(console.error);
