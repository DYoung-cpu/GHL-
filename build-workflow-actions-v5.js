/**
 * LENDWISE - Build Workflow Actions v5
 * Finds and clicks the add-action elements using locators
 *
 * Run with: node build-workflow-actions-v5.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/v5-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
  console.log(`   📸 ${name}`);
}

async function login(page, context) {
  console.log('📍 Logging into GHL...');
  await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const googleIframe = await page.$('#g_id_signin iframe');
  if (googleIframe) {
    console.log('   Found Google One-Tap iframe...');
    const frame = await googleIframe.contentFrame();
    if (frame) {
      await frame.click('div[role="button"]');
      console.log('   Clicked Google One-Tap button');
    }
  }
  await page.waitForTimeout(3000);

  const allPages = context.pages();
  const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

  if (googlePage) {
    console.log('   Entering Google credentials...');
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
  console.log('✅ In Lendwise account\n');
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions v5');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    await login(page, context);

    console.log('📍 Navigating to Workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`, { timeout: 60000 });
    await page.waitForTimeout(8000);

    // Get the frame
    const wfFrame = page.frame({ url: /automation-workflows/ });
    if (!wfFrame) throw new Error('Workflow frame not found');

    // Open the workflow
    const testWorkflow = 'New Lead Nurture Sequence';
    console.log(`📍 Opening workflow: ${testWorkflow}`);
    await wfFrame.locator(`text=${testWorkflow}`).first().click();
    await page.waitForTimeout(5000);
    await ss(page, 'workflow-opened');

    // Ensure Builder tab
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    // First, close any open panel by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Now find the add-action elements using various selectors
    console.log('\n📍 Looking for add-action elements...');

    // Try different selectors for the + button
    const selectors = [
      '[class*="add-action"]',
      '[class*="addAction"]',
      '[class*="insert"]',
      '[data-testid*="add"]',
      'g[class*="add"]',  // SVG group
      'circle',  // The + might be inside a circle
      '[class*="connector"] [class*="add"]',
      '[class*="edge"] button',
      '[class*="plus-button"]',
      '[class*="plusButton"]',
    ];

    for (const selector of selectors) {
      const count = await wfFrame.locator(selector).count();
      if (count > 0) {
        console.log(`   Found ${count} elements with: ${selector}`);

        // Try to get more info about these elements
        const els = await wfFrame.locator(selector).all();
        for (let i = 0; i < Math.min(els.length, 3); i++) {
          const el = els[i];
          const box = await el.boundingBox().catch(() => null);
          if (box) {
            console.log(`      Element ${i}: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);
          }
        }
      }
    }

    // Try hovering over the connector line to reveal the + button
    console.log('\n📍 Hovering over connector area to reveal + button...');

    // The connector line is roughly at x=705, from y=200 to y=320
    // Hover slowly down the line
    for (let y = 200; y <= 320; y += 20) {
      await page.mouse.move(705, y);
      await page.waitForTimeout(300);
    }
    await ss(page, 'after-hover');

    // Now try to find any newly visible + buttons
    const plusVisible = await wfFrame.locator('[class*="add-action"], [class*="insert"], button:has-text("+")').first();
    if (await plusVisible.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found visible + button after hover!');
      const box = await plusVisible.boundingBox();
      console.log(`   Position: x=${box.x}, y=${box.y}`);
      await plusVisible.click();
      await page.waitForTimeout(1500);
      await ss(page, 'after-plus-click');
    } else {
      console.log('   No visible + button found after hover');

      // Let's try to find the + by its SVG path or text content
      console.log('\n📍 Looking for SVG + icon...');

      // The + symbol might be rendered as text or path
      const plusTexts = await wfFrame.locator('text=+').all();
      console.log(`   Found ${plusTexts.length} elements with "+" text`);

      for (let i = 0; i < plusTexts.length; i++) {
        const el = plusTexts[i];
        const box = await el.boundingBox().catch(() => null);
        if (box && box.x > 600 && box.x < 800 && box.y > 200 && box.y < 450) {
          console.log(`   + at canvas position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
          // Try clicking this element
          await el.click({ force: true });
          await page.waitForTimeout(1500);
          await ss(page, `clicked-plus-${i}`);

          // Check if action panel appeared
          if (await page.locator('text=Send SMS').isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('   ✅ Action panel appeared!');
            break;
          }
        }
      }
    }

    // Alternative: Try using the frame's evaluate to find and click
    console.log('\n📍 Trying to find elements via evaluate...');

    const addBtnInfo = await wfFrame.evaluate(() => {
      // Look for any element that might be the add button
      const candidates = document.querySelectorAll('[class*="add"], [class*="plus"], [class*="insert"], button');
      const results = [];

      candidates.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const classes = el.className?.toString() || '';
        const text = el.textContent?.trim().substring(0, 20) || '';

        // Only include elements in the canvas area
        if (rect.x > 500 && rect.x < 900 && rect.y > 100 && rect.y < 500) {
          results.push({
            index: i,
            classes: classes.substring(0, 100),
            text: text,
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });

      return results;
    });

    console.log(`   Found ${addBtnInfo.length} candidate elements in canvas area:`);
    addBtnInfo.slice(0, 10).forEach(info => {
      console.log(`   - (${info.x},${info.y}) [${info.width}x${info.height}] ${info.classes.substring(0, 50)} "${info.text}"`);
    });

    await ss(page, 'final-state');

    console.log('\n========================================');
    console.log('  Exploration Complete!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    await ss(page, 'error');
  } finally {
    console.log('Browser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
