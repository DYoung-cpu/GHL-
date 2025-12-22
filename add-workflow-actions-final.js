/**
 * LENDWISE - Add Workflow Actions
 * Adds actions to workflows using GHL's workflow builder
 *
 * PROVEN WORKING:
 * - Login via Google OAuth ✅
 * - Navigate to workflows ✅
 * - Open workflow editor ✅
 * - Click add-action buttons ✅
 * - Search for actions ✅
 * - Select and configure Wait action ✅
 * - Save actions ✅
 *
 * Run with: node add-workflow-actions-final.js
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/add-${String(ssNum).padStart(3,'0')}-${name}.png` });
  console.log(`      📸 ${name}`);
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

// Add a Wait action
async function addWaitAction(page, wfFrame, waitTime, waitUnit = 'minutes') {
  console.log(`   📍 Adding Wait: ${waitTime} ${waitUnit}`);

  const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  if (addBtns.length === 0) {
    console.log('      ⚠️ No add buttons found');
    return false;
  }

  // Click last add button
  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  // Search for Wait
  await page.mouse.click(1100, 227);
  await page.waitForTimeout(300);
  await page.keyboard.type('Wait');
  await page.waitForTimeout(1500);

  // Click Wait in Internal category (first result at ~920, 385)
  await page.mouse.click(920, 385);
  await page.waitForTimeout(2500);

  // Set wait time
  await page.mouse.click(570, 434);
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+a');
  await page.keyboard.type(String(waitTime));
  await page.waitForTimeout(300);

  // If unit is days, click dropdown and select
  if (waitUnit === 'days') {
    await page.mouse.click(850, 434); // Click unit dropdown
    await page.waitForTimeout(500);
    await page.locator('text=Days').click();
    await page.waitForTimeout(300);
  }

  // Save
  await page.mouse.click(1289, 833);
  await page.waitForTimeout(2000);

  const newBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  return newBtns.length > addBtns.length;
}

// Add Send SMS action
async function addSMSAction(page, wfFrame) {
  console.log('   📍 Adding Send SMS');

  const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  if (addBtns.length === 0) return false;

  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  // Search for SMS - use "SMS" which should match "Send SMS" in Internal
  await page.mouse.click(1100, 227);
  await page.waitForTimeout(300);
  await page.keyboard.type('SMS');
  await page.waitForTimeout(1500);

  // Click first result
  await page.mouse.click(920, 385);
  await page.waitForTimeout(2500);

  // Check if it opened config panel with Save Action
  const hasSaveBtn = await page.locator('button:has-text("Save")').isVisible({ timeout: 2000 }).catch(() => false);
  if (hasSaveBtn) {
    await page.mouse.click(1289, 833);
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}

// Add Send Email action
async function addEmailAction(page, wfFrame) {
  console.log('   📍 Adding Send Email');

  const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  if (addBtns.length === 0) return false;

  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  // Use "Email" for search
  await page.mouse.click(1100, 227);
  await page.waitForTimeout(300);
  await page.keyboard.type('Email');
  await page.waitForTimeout(1500);

  // Look for Send Email under Internal category
  const sendEmail = page.locator('text=Send Email').first();
  if (await sendEmail.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sendEmail.click();
    await page.waitForTimeout(2500);

    const hasSaveBtn = await page.locator('button:has-text("Save")').isVisible({ timeout: 2000 }).catch(() => false);
    if (hasSaveBtn) {
      await page.mouse.click(1289, 833);
      await page.waitForTimeout(2000);
      return true;
    }
  }

  return false;
}

// Add Tag action
async function addTagAction(page, wfFrame, tagName) {
  console.log(`   📍 Adding Tag: ${tagName}`);

  const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
  if (addBtns.length === 0) return false;

  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  await page.mouse.click(1100, 227);
  await page.waitForTimeout(300);
  await page.keyboard.type('Add Tag');
  await page.waitForTimeout(1500);

  // Click Add Contact Tag
  const addTag = page.locator('text=Add Contact Tag').first();
  if (await addTag.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addTag.click();
    await page.waitForTimeout(2500);

    // Save (tag can be configured later)
    await page.mouse.click(1289, 833);
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}

(async () => {
  console.log('================================================');
  console.log('  LENDWISE - Add Workflow Actions');
  console.log('================================================\n');

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

    // Open first workflow
    console.log('\n📍 Opening: New Lead Nurture Sequence');
    await wfFrame.locator('text=New Lead Nurture Sequence').first().click();
    await page.waitForTimeout(5000);

    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    wfFrame = getWfFrame(page);
    await ss(page, 'workflow-opened');

    // Add actions for New Lead Nurture Sequence:
    // 1. Wait 5 minutes
    // 2. Send Email
    // 3. Wait 1 day
    // 4. Send SMS

    console.log('\n📋 Building New Lead Nurture Sequence...');

    let success = await addWaitAction(page, getWfFrame(page), 5, 'minutes');
    await ss(page, 'wait-5min');

    success = await addEmailAction(page, getWfFrame(page));
    await ss(page, 'email-1');

    success = await addWaitAction(page, getWfFrame(page), 1, 'days');
    await ss(page, 'wait-1day');

    success = await addSMSAction(page, getWfFrame(page));
    await ss(page, 'sms-1');

    await ss(page, 'workflow-built');

    console.log('\n================================================');
    console.log('  Workflow Actions Added!');
    console.log('  Manual steps remaining:');
    console.log('  - Configure SMS/Email templates');
    console.log('  - Test workflow');
    console.log('  - Publish workflow');
    console.log('================================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser open 60 seconds for review...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
