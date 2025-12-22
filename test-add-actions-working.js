/**
 * Test adding actions - WORKING VERSION with coordinate clicks
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/work-${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

async function login(page, context) {
  console.log('📍 Logging into GHL...');
  await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const googleIframe = await page.$('#g_id_signin iframe');
  if (googleIframe) {
    const frame = await googleIframe.contentFrame();
    if (frame) await frame.click('div[role="button"]');
  }
  await page.waitForTimeout(3000);

  const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
  if (googlePage) {
    await googlePage.waitForLoadState('domcontentloaded');
    await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
    await googlePage.keyboard.press('Enter');
    await googlePage.waitForTimeout(3000);
    await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
    await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
    await googlePage.keyboard.press('Enter');
    await page.waitForTimeout(8000);
  }
  await page.waitForTimeout(5000);
  console.log('✅ Logged in!\n');

  const switcher = page.locator('text=Click here to switch');
  if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
    await switcher.click();
    await page.waitForTimeout(2000);
    await page.locator('text=LENDWISE MORTGA').click();
    await page.waitForTimeout(3000);
  }
}

function getWfFrame(page) {
  return page.frames().find(f => f.url().includes('automation-workflows'));
}

async function addAction(page, wfFrame, actionName, config = {}) {
  console.log(`\n   📍 Adding action: ${actionName}`);

  // Find add-action buttons
  const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  console.log(`      Found ${addBtns.length} add-action buttons`);

  if (addBtns.length === 0) {
    console.log('      ⚠️ No add buttons found');
    return false;
  }

  // Click the last button (before END)
  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  // Search for the action (search box is at ~1100, 227)
  console.log(`      Searching for "${actionName}"...`);
  await page.mouse.click(1100, 227);
  await page.waitForTimeout(300);
  await page.keyboard.type(actionName);
  await page.waitForTimeout(1500);

  // Click on the action result (~920, 385)
  console.log(`      Clicking on ${actionName} result...`);
  await page.mouse.click(920, 385);
  await page.waitForTimeout(2500);

  // Configure if needed
  if (actionName === 'Wait' && config.time) {
    console.log(`      Setting wait time to ${config.time}...`);
    // The time input is at approximately (570, 434)
    await page.mouse.click(570, 434);
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+a');
    await page.keyboard.type(String(config.time));
    await page.waitForTimeout(300);
  }

  // Click Save Action button at (1289, 833)
  console.log(`      Clicking Save Action...`);
  await page.mouse.click(1289, 833);
  await page.waitForTimeout(2000);

  // Check if we're back to builder (config panel closed)
  // The add-action buttons should appear again
  const newBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  const success = newBtns.length > 0;
  console.log(`      ${success ? '✅' : '⚠️'} Action ${success ? 'added' : 'may not have been added'}`);

  return success;
}

(async () => {
  console.log('='.repeat(50));
  console.log('  TEST ADD ACTIONS - WORKING');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    await login(page, context);

    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);

    let wfFrame = getWfFrame(page);
    if (!wfFrame) throw new Error('Frame not found');

    console.log('📍 Opening: New Lead Nurture Sequence');
    await wfFrame.locator('text=New Lead Nurture Sequence').first().click();
    await page.waitForTimeout(5000);

    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    wfFrame = getWfFrame(page);
    await ss(page, 'ready');

    // Add Wait action
    let waitAdded = await addAction(page, wfFrame, 'Wait', { time: 5 });
    await ss(page, 'after-wait');

    // Refresh frame reference
    wfFrame = getWfFrame(page);

    // Add Send SMS action
    let smsAdded = await addAction(page, wfFrame, 'Send SMS');
    await ss(page, 'after-sms');

    // Refresh frame and add Send Email
    wfFrame = getWfFrame(page);

    let emailAdded = await addAction(page, wfFrame, 'Send Email');
    await ss(page, 'after-email');

    await ss(page, 'final');

    console.log('\n' + '='.repeat(50));
    console.log('  RESULTS');
    console.log('='.repeat(50));
    console.log(`  Wait:  ${waitAdded ? '✅' : '❌'}`);
    console.log(`  SMS:   ${smsAdded ? '✅' : '❌'}`);
    console.log(`  Email: ${emailAdded ? '✅' : '❌'}`);
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser open 60s...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
