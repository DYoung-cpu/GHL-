/**
 * Test adding actions v3 - click search box by coordinates
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/t3-${String(ssNum).padStart(2,'0')}-${name}.png` });
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

(async () => {
  console.log('='.repeat(50));
  console.log('  TEST ADD ACTIONS v3');
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

    // Find add-action buttons
    console.log('\n📍 Finding add-action buttons...');
    const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
    console.log(`   Found ${addBtns.length} add-action buttons`);

    if (addBtns.length > 0) {
      // Click first + button
      console.log('\n📍 Clicking first + button...');
      await addBtns[0].click();
      await page.waitForTimeout(2000);
      await ss(page, 'panel-open');

      // The search box is at approximately (1100, 227) based on the screenshot
      console.log('   Clicking on search box at (1100, 227)...');
      await page.mouse.click(1100, 227);
      await page.waitForTimeout(500);

      // Type to search
      console.log('   Typing "Wait"...');
      await page.keyboard.type('Wait');
      await page.waitForTimeout(1000);
      await ss(page, 'searched-wait');

      // Now look for Wait option and click it
      const waitOption = page.getByText('Wait', { exact: true }).first();
      if (await waitOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found Wait option, clicking...');
        await waitOption.click();
        await page.waitForTimeout(2000);
        await ss(page, 'wait-selected');

        // Configure and save
        const timeInput = page.locator('input[type="number"]').first();
        if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await timeInput.fill('5');
          console.log('   Set wait to 5 minutes');
        }

        // Look for Save button
        const saveBtn = page.getByRole('button', { name: /Save Action/i });
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   Clicking Save Action...');
          await saveBtn.click();
          await page.waitForTimeout(2000);
          await ss(page, 'wait-saved');
          console.log('   ✅ Wait action added!');
        } else {
          // Try any Save button
          const anySave = page.locator('button:has-text("Save")').last();
          if (await anySave.isVisible({ timeout: 1000 }).catch(() => false)) {
            await anySave.click();
            await page.waitForTimeout(2000);
            await ss(page, 'saved');
          }
        }
      } else {
        console.log('   Wait not found after search, scrolling...');
        // Maybe need to scroll in the results
        await page.mouse.move(1100, 500);
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(500);
        await ss(page, 'after-scroll');
      }

      // Add second action - Send SMS
      console.log('\n📍 Adding Send SMS...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      wfFrame = getWfFrame(page);
      const addBtns2 = await wfFrame.locator('.pg-actions__dv--add-action').all();
      console.log(`   Found ${addBtns2.length} buttons now`);

      if (addBtns2.length > 0) {
        await addBtns2[addBtns2.length - 1].click();
        await page.waitForTimeout(2000);

        // Click search box and type
        await page.mouse.click(1100, 227);
        await page.waitForTimeout(300);
        await page.keyboard.type('Send SMS');
        await page.waitForTimeout(1000);
        await ss(page, 'searched-sms');

        const smsOption = page.getByText('Send SMS', { exact: true }).first();
        if (await smsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   Clicking Send SMS...');
          await smsOption.click();
          await page.waitForTimeout(2000);
          await ss(page, 'sms-selected');

          // Save
          const saveBtn = page.locator('button:has-text("Save")').last();
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
            await ss(page, 'sms-saved');
            console.log('   ✅ SMS action added!');
          }
        }
      }
    }

    await ss(page, 'final');
    console.log('\n✅ Test complete!');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser open 60s...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
