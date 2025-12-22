/**
 * Test adding actions v2 - fixes search input location
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/t2-${String(ssNum).padStart(2,'0')}-${name}.png` });
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

async function scrollAndFindAction(page, actionName) {
  // The actions panel is scrollable - look for the action and scroll if needed
  const panel = page.locator('[class*="action"], [class*="panel"]').filter({ hasText: 'Actions' });

  // First try to find it directly
  let action = page.locator(`text="${actionName}"`).first();
  if (await action.isVisible({ timeout: 1000 }).catch(() => false)) {
    return action;
  }

  // Try scrolling the panel
  const scrollContainer = page.locator('[class*="scroll"], [class*="overflow"]').last();
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);

    action = page.locator(`text="${actionName}"`).first();
    if (await action.isVisible({ timeout: 500 }).catch(() => false)) {
      return action;
    }
  }

  return null;
}

(async () => {
  console.log('='.repeat(50));
  console.log('  TEST ADD ACTIONS v2');
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

    // Ensure Builder tab and close panels
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    wfFrame = getWfFrame(page);
    await ss(page, 'workflow-ready');

    // Find add-action buttons
    console.log('\n📍 Finding add-action buttons...');
    const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
    console.log(`   Found ${addBtns.length} add-action buttons`);

    if (addBtns.length > 0) {
      // Click the FIRST + button (between trigger and Email)
      console.log('\n📍 Clicking first + button (between trigger and Email)...');
      await addBtns[0].click();
      await page.waitForTimeout(2000);
      await ss(page, 'panel-opened');

      // The search box has placeholder "Search For Actions"
      console.log('   Looking for search input...');
      const searchInput = page.locator('input[placeholder="Search For Actions"]');

      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Found search input, searching for Wait...');
        await searchInput.click();
        await searchInput.fill('Wait');
        await page.waitForTimeout(1000);
        await ss(page, 'searched-wait');

        // Look for Wait option
        const waitOption = page.locator('text=Wait').first();
        if (await waitOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   Clicking Wait option...');
          await waitOption.click();
          await page.waitForTimeout(2000);
          await ss(page, 'wait-clicked');

          // Configure wait time
          console.log('   Configuring wait time...');
          const timeInput = page.locator('input[type="number"]').first();
          if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await timeInput.fill('5');
            console.log('   Set wait to 5');
          }

          // Find and click Save Action button
          const saveBtn = page.locator('button:has-text("Save Action")');
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   Clicking Save Action...');
            await saveBtn.click();
            await page.waitForTimeout(2000);
            await ss(page, 'wait-saved');
            console.log('   ✅ Wait action saved!');
          }
        }
      } else {
        console.log('   Search input not found, trying direct click...');

        // Try clicking visible action directly
        // Scroll down in the panel to find "Wait"
        console.log('   Scrolling to find Wait...');

        // Move mouse to panel area and scroll
        await page.mouse.move(1100, 500);
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(500);

          const waitOption = page.locator('text=Wait').first();
          if (await waitOption.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log('   Found Wait, clicking...');
            await waitOption.click();
            await page.waitForTimeout(2000);
            await ss(page, 'wait-found');
            break;
          }
        }
      }

      // After first action, add SMS
      console.log('\n📍 Adding SMS action...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      wfFrame = getWfFrame(page);
      const addBtns2 = await wfFrame.locator('.pg-actions__dv--add-action').all();
      console.log(`   Found ${addBtns2.length} add-action buttons now`);

      if (addBtns2.length > 0) {
        // Click last button (before END)
        await addBtns2[addBtns2.length - 1].click();
        await page.waitForTimeout(2000);
        await ss(page, 'panel-for-sms');

        // Search for Send SMS
        const searchInput2 = page.locator('input[placeholder="Search For Actions"]');
        if (await searchInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput2.fill('Send SMS');
          await page.waitForTimeout(1000);

          const smsOption = page.locator('text=Send SMS').first();
          if (await smsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   Clicking Send SMS...');
            await smsOption.click();
            await page.waitForTimeout(2000);
            await ss(page, 'sms-clicked');

            // Save
            const saveBtn2 = page.locator('button:has-text("Save Action")');
            if (await saveBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
              await saveBtn2.click();
              await page.waitForTimeout(2000);
              await ss(page, 'sms-saved');
              console.log('   ✅ SMS action saved!');
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
