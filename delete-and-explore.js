/**
 * Delete duplicates and explore workflow builder
 *
 * 1. Delete 2 duplicate "Pre-Qualification Process Workflow" entries
 * 2. Open a workflow and screenshot the builder interface
 *
 * Browser stays open for manual work
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

(async () => {
  console.log('=== DELETE DUPLICATES & EXPLORE BUILDER ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('[1] Logging in...');
  await page.goto('https://app.gohighlevel.com/');
  await page.waitForTimeout(3000);
  const iframe = await page.$('#g_id_signin iframe');
  if (iframe) {
    const frame = await iframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await page.waitForTimeout(4000);
  const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (gp) {
    await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
    await gp.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    try {
      await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
      await gp.fill('input[type="password"]:visible', 'Fafa2185!');
      await gp.keyboard.press('Enter');
    } catch(e) {}
    await page.waitForTimeout(10000);
  }
  console.log('   Done!\n');

  // Go to workflows page 2 (where duplicates are)
  console.log('[2] Going to workflows page 2...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await page.waitForTimeout(5000);
  await page.mouse.click(1157, 860);  // Next to page 2
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/page2-before-delete.png' });
  console.log('   Done!\n');

  // Delete first duplicate (row with second "Pre-Qualification Process Workflow")
  // Looking at page 2, rows 3 and 4 are both "Pre-Qualification Process Workflow"
  // Row 4 is at y ~= 605 (row 0=371, each row +68)
  // The 3-dot menu (actions) is on the far right of each row

  console.log('[3] Deleting duplicate workflows...');

  // First duplicate - click checkbox on row 4 to select it
  // Actually, let's try right-clicking on the row to get context menu
  // Or click the actions menu (3 dots) on the right side

  // The actions menu icon is typically at x ~= 1350 for each row
  // Row 4 (second Pre-Qual) is at y ~= 605

  // Let's try clicking the row's action menu
  console.log('   Looking for delete option on row 4...');
  await page.mouse.click(1320, 605);  // Try clicking near end of row 4
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './screenshots/row4-click.png' });

  // Check if dropdown appeared - if so, look for delete
  // Often need to click the "..." or kebab menu specifically
  // Let's try the chevron/arrow on the right
  await page.mouse.click(1350, 605);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './screenshots/row4-menu.png' });

  // If we see a menu, click delete (usually last option)
  // The menu items are typically stacked vertically

  console.log('   Attempting delete...');
  // Common positions for dropdown menu items
  await page.mouse.click(1300, 680);  // First menu item position
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './screenshots/after-click1.png' });

  // If a confirmation dialog appeared, confirm it
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('   First delete attempted.\n');

  // Refresh and check state
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await page.waitForTimeout(4000);
  await page.mouse.click(1157, 860);  // Go to page 2
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/page2-after-delete1.png' });

  // Second duplicate
  console.log('   Attempting second delete...');
  await page.mouse.click(1350, 537);  // Row 3 position now
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './screenshots/row3-menu.png' });
  await page.mouse.click(1300, 610);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Final state
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: './screenshots/final-list-p1.png' });
  await page.mouse.click(1157, 860);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: './screenshots/final-list-p2.png' });

  // Now open a workflow to explore the builder
  console.log('\n[4] Opening workflow builder to explore...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await page.waitForTimeout(4000);

  // Click on first workflow to open builder
  await page.mouse.click(400, 371);  // First row
  await page.waitForTimeout(5000);

  // Screenshot the workflow builder
  await page.screenshot({ path: './screenshots/workflow-builder.png', fullPage: true });
  console.log('   Workflow builder screenshot saved.\n');

  console.log('=== BROWSER STAYING OPEN ===');
  console.log('You can now manually configure workflows.');
  console.log('The browser will close in 10 minutes or press Ctrl+C.\n');

  // Keep open for manual work
  await page.waitForTimeout(600000);  // 10 minutes

  await browser.close();
})();
