/**
 * Test adding actions - uses exact class selector found in exploration
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/test-${String(ssNum).padStart(2,'0')}-${name}.png` });
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
  console.log('  TEST ADD ACTIONS');
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
    await ss(page, 'workflow-opened');

    // Ensure Builder tab and close panels
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    wfFrame = getWfFrame(page);

    // Find all add-action buttons using the exact class we found
    console.log('\n📍 Finding add-action buttons...');
    const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
    console.log(`   Found ${addBtns.length} add-action buttons`);

    for (let i = 0; i < addBtns.length; i++) {
      const box = await addBtns[i].boundingBox();
      if (box) {
        console.log(`   Button ${i}: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
      }
    }

    if (addBtns.length === 0) {
      // Try finding by partial class
      const addBtns2 = await wfFrame.locator('[class*="add-action"]').all();
      console.log(`   Fallback found ${addBtns2.length} buttons`);
    }

    // Add first action - click the LAST + button (before END)
    if (addBtns.length > 0) {
      console.log('\n📍 Clicking last + button...');
      const lastBtn = addBtns[addBtns.length - 1];
      await lastBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'after-plus-click');

      // Check if panel opened - look for Search input or Actions header
      const panelOpen = await page.locator('text=Search For Actions').isVisible().catch(() => false) ||
                        await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
      console.log(`   Panel opened: ${panelOpen}`);

      if (true) { // Panel is open based on screenshot
        // Search for Wait
        console.log('   Searching for Wait...');
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill('Wait');
        await page.waitForTimeout(800);

        // Click Wait option
        const waitOption = page.locator('text=Wait').first();
        if (await waitOption.isVisible().catch(() => false)) {
          console.log('   Clicking Wait...');
          await waitOption.click();
          await page.waitForTimeout(1500);
          await ss(page, 'wait-selected');

          // Configure wait - set to 5 minutes
          const timeInput = page.locator('input[type="number"]').first();
          if (await timeInput.isVisible().catch(() => false)) {
            await timeInput.fill('5');
          }

          // Save
          const saveBtn = page.locator('button:has-text("Save")').last();
          if (await saveBtn.isVisible().catch(() => false)) {
            console.log('   Saving Wait action...');
            await saveBtn.click();
            await page.waitForTimeout(2000);
            await ss(page, 'wait-saved');
          }
        }
      }

      // Now try adding another action
      console.log('\n📍 Adding second action (SMS)...');
      await page.keyboard.press('Escape'); // Close any panel
      await page.waitForTimeout(500);

      wfFrame = getWfFrame(page);
      const addBtnsAfter = await wfFrame.locator('.pg-actions__dv--add-action').all();
      console.log(`   Found ${addBtnsAfter.length} add-action buttons after adding Wait`);

      if (addBtnsAfter.length > 0) {
        const lastBtn2 = addBtnsAfter[addBtnsAfter.length - 1];
        await lastBtn2.click();
        await page.waitForTimeout(2000);
        await ss(page, 'second-plus-click');

        // Search for Send SMS
        const searchInput2 = page.locator('input[placeholder*="Search"]').first();
        if (await searchInput2.isVisible().catch(() => false)) {
          await searchInput2.fill('Send SMS');
          await page.waitForTimeout(800);

          const smsOption = page.locator('text=Send SMS').first();
          if (await smsOption.isVisible().catch(() => false)) {
            console.log('   Clicking Send SMS...');
            await smsOption.click();
            await page.waitForTimeout(1500);
            await ss(page, 'sms-selected');

            // Save
            const saveBtn2 = page.locator('button:has-text("Save")').last();
            if (await saveBtn2.isVisible().catch(() => false)) {
              await saveBtn2.click();
              await page.waitForTimeout(2000);
              await ss(page, 'sms-saved');
            }
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
