/**
 * Test adding actions - FINAL WORKING VERSION
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/final-${String(ssNum).padStart(2,'0')}-${name}.png` });
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

  if (addBtns.length === 0) return false;

  // Click the last button (before END)
  await addBtns[addBtns.length - 1].click();
  await page.waitForTimeout(2000);

  // Search for the action
  console.log(`      Searching for "${actionName}"...`);
  await page.mouse.click(1100, 227); // Click search box
  await page.waitForTimeout(300);
  await page.keyboard.type(actionName);
  await page.waitForTimeout(1500);

  // Click on the action result (at position in results)
  console.log(`      Clicking on ${actionName} result...`);
  await page.mouse.click(920, 385);
  await page.waitForTimeout(2000);

  // Check if Save Action button appeared (indicates config panel is open)
  const saveBtn = page.locator('button:has-text("Save Action")');
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`      Config panel opened!`);

    // Configure based on action type
    if (actionName === 'Wait' && config.time) {
      console.log(`      Setting wait time: ${config.time} ${config.unit || 'minutes'}`);
      const timeInput = page.locator('input').filter({ hasText: '' }).first();
      // Find the number input specifically
      const inputs = await page.locator('input').all();
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        if (type === 'number' || type === 'text') {
          const value = await input.inputValue();
          if (value === '0' || value === '') {
            await input.fill(String(config.time));
            break;
          }
        }
      }
    }

    // Click Save Action
    console.log(`      Clicking Save Action...`);
    await saveBtn.click();
    await page.waitForTimeout(2000);
    console.log(`      ✅ ${actionName} added!`);
    return true;
  }

  console.log(`      ⚠️ Config panel didn't open`);
  return false;
}

(async () => {
  console.log('='.repeat(50));
  console.log('  TEST ADD ACTIONS - FINAL');
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
    const waitAdded = await addAction(page, wfFrame, 'Wait', { time: 5, unit: 'minutes' });
    if (waitAdded) await ss(page, 'wait-added');

    // Refresh frame and add SMS
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    wfFrame = getWfFrame(page);

    const smsAdded = await addAction(page, wfFrame, 'Send SMS');
    if (smsAdded) await ss(page, 'sms-added');

    // Refresh frame and add Email
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    wfFrame = getWfFrame(page);

    const emailAdded = await addAction(page, wfFrame, 'Send Email');
    if (emailAdded) await ss(page, 'email-added');

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
