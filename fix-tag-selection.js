/**
 * FIX TAG SELECTION
 *
 * The tag triggers were created but the specific tag wasn't properly selected.
 * Need to:
 * 1. Open each workflow
 * 2. Click on the existing trigger to edit it
 * 3. Type tag name and CLICK on the dropdown result
 * 4. Save
 *
 * The dropdown appears below the input after typing, showing matching tags.
 */

const { chromium } = require('playwright');
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

// All 10 tag-based workflows that need proper tag selection
const TAG_WORKFLOWS = [
  { name: 'Application Process', tag: 'Application Started' },
  { name: 'Clear to Close', tag: 'Clear to Close' },
  { name: 'Closing Countdown', tag: 'Closing Scheduled' },
  { name: 'Conditional Approval', tag: 'Conditionally Approved' },
  { name: 'New Lead Nurture', tag: 'New Lead' },
  { name: 'Post-Close', tag: 'Closed' },
  { name: 'Pre-Qualification Complete', tag: 'Pre-Qual Complete' },
  { name: 'Pre-Qualification Process', tag: 'Pre-Qual Started' },
  { name: 'Realtor Partner', tag: 'Realtor Referral' },
  { name: 'Underwriting Status', tag: 'In Underwriting' }
];

(async () => {
  console.log('=== FIX TAG SELECTION ===\n');
  console.log('This script will properly select tags from dropdown.\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const sleep = (ms) => page.waitForTimeout(ms);

  // Login
  console.log('[LOGIN]...');
  await page.goto('https://app.gohighlevel.com/');
  await sleep(3000);
  const iframe = await page.$('#g_id_signin iframe');
  if (iframe) {
    const frame = await iframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await sleep(4000);
  const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (gp) {
    await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
    await gp.keyboard.press('Enter');
    await sleep(4000);
    try {
      await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
      await gp.fill('input[type="password"]:visible', 'Fafa2185!');
      await gp.keyboard.press('Enter');
    } catch(e) {}
    await sleep(10000);
  }
  console.log('[LOGIN] Done!\n');

  // First, let's open one workflow and screenshot the tag config panel
  // to see exactly where the dropdown appears
  console.log('[EXPLORE] Checking tag dropdown location...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
  await sleep(5000);

  // Click first workflow
  await page.mouse.click(400, 371);
  await sleep(4000);

  // Click Add New Trigger
  await page.mouse.click(700, 153);
  await sleep(2000);

  // Search for Contact Tag
  await page.keyboard.type('tag');
  await sleep(1500);

  // Click Contact Tag
  await page.mouse.click(950, 405);
  await sleep(2000);

  // Now in the config panel, look for tag input
  // Take screenshot to see current state
  await page.screenshot({ path: './screenshots/tag-dropdown-1.png' });

  // The tag selector should have an input field
  // Let's click on "+ Add filters" to see if that's where we configure
  // Or there might be a tag dropdown directly

  // Based on previous screenshot, there's a "WORKFLOW TRIGGER NAME" field
  // and maybe a separate tag selector
  // Let's scroll down in the right panel to see more options

  // Click in the filter area to see options
  await page.mouse.click(1100, 450);  // Below the trigger name
  await sleep(1000);
  await page.screenshot({ path: './screenshots/tag-dropdown-2.png' });

  // Try clicking Add filters
  await page.mouse.click(560, 427);  // "+ Add filters" from previous screenshot
  await sleep(2000);
  await page.screenshot({ path: './screenshots/tag-dropdown-3.png' });

  console.log('\nScreenshots saved. Check tag-dropdown-1/2/3.png');
  console.log('to see where the tag selector dropdown is.\n');

  console.log('Browser staying open for manual inspection...');
  console.log('Ctrl+C when done.\n');

  await sleep(600000);
  await browser.close();
})();
