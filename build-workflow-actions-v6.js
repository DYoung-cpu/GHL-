/**
 * LENDWISE - Build Workflow Actions v6
 * Properly handles frame navigation
 *
 * Run with: node build-workflow-actions-v6.js
 */

const { chromium } = require('playwright');
const fs = require('fs');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/v6-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: false });
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
  // Get fresh frame reference
  const frames = page.frames();
  for (const f of frames) {
    if (f.url().includes('automation-workflows')) {
      return f;
    }
  }
  return null;
}

(async () => {
  console.log('========================================');
  console.log('  LENDWISE - Build Workflow Actions v6');
  console.log('========================================\n');

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
    if (!wfFrame) throw new Error('Workflow frame not found');

    // Open the workflow
    console.log('📍 Opening workflow: New Lead Nurture Sequence');
    await wfFrame.locator('text=New Lead Nurture Sequence').first().click();
    await page.waitForTimeout(5000);

    // Get fresh frame reference after navigation
    wfFrame = getWfFrame(page);
    if (!wfFrame) {
      console.log('   Frame changed, using main frame...');
      wfFrame = page.mainFrame();
    }

    await ss(page, 'workflow-opened');

    // Ensure Builder tab
    await page.locator('text=Builder').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    // Close any open panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('\n📍 Analyzing canvas structure...');

    // Use page.evaluate to find clickable elements in canvas
    const canvasInfo = await page.evaluate(() => {
      const results = {
        plusButtons: [],
        addButtons: [],
        allInteractive: []
      };

      // Find all elements and check their properties
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const classes = el.className?.toString() || '';
        const text = el.textContent?.trim() || '';

        // Look for + buttons in canvas area (roughly center of screen)
        if (rect.x > 500 && rect.x < 900 && rect.y > 150 && rect.y < 500) {
          if (text === '+' || text === '＋' || classes.includes('plus') || classes.includes('add')) {
            results.plusButtons.push({
              tag: el.tagName,
              classes: classes.substring(0, 80),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              text: text.substring(0, 10),
              cursor: style.cursor
            });
          }
        }
      });

      // Also check iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const rect = iframe.getBoundingClientRect();
        results.iframeInfo = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          src: iframe.src?.substring(0, 100)
        };
      });

      return results;
    });

    console.log('   Plus buttons found:', canvasInfo.plusButtons.length);
    canvasInfo.plusButtons.forEach(btn => {
      console.log(`      ${btn.tag} at (${btn.x},${btn.y}) [${btn.width}x${btn.height}] "${btn.text}" cursor:${btn.cursor}`);
    });

    if (canvasInfo.iframeInfo) {
      console.log(`   Iframe: x=${canvasInfo.iframeInfo.x}, y=${canvasInfo.iframeInfo.y}`);
    }

    // The canvas is inside an iframe, need to search inside the frame
    console.log('\n📍 Searching inside workflow frame...');

    wfFrame = getWfFrame(page);
    if (wfFrame) {
      const frameCanvasInfo = await wfFrame.evaluate(() => {
        const results = [];
        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const classes = el.className?.toString() || '';
          const text = el.textContent?.trim() || '';
          const tagName = el.tagName.toLowerCase();

          // Look for potential + buttons
          if (
            text === '+' ||
            classes.includes('add-action') ||
            classes.includes('plus') ||
            (tagName === 'button' && rect.width < 50 && rect.height < 50 && rect.x > 400)
          ) {
            results.push({
              tag: tagName,
              classes: classes.substring(0, 100),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              text: text.substring(0, 20)
            });
          }
        });

        return results;
      });

      console.log(`   Found ${frameCanvasInfo.length} potential + elements in frame:`);
      frameCanvasInfo.forEach(el => {
        console.log(`      ${el.tag} (${el.x},${el.y}) [${el.width}x${el.height}] "${el.text}" ${el.classes.substring(0, 40)}`);
      });

      // Try clicking elements that look like + buttons
      for (const elInfo of frameCanvasInfo) {
        if (elInfo.text === '+' || elInfo.classes.includes('add')) {
          console.log(`\n📍 Clicking element at (${elInfo.x}, ${elInfo.y})...`);

          // Click at the element's center
          const clickX = elInfo.x + elInfo.width / 2;
          const clickY = elInfo.y + elInfo.height / 2;

          await page.mouse.click(clickX, clickY);
          await page.waitForTimeout(1500);
          await ss(page, `clicked-${elInfo.x}-${elInfo.y}`);

          // Check if action panel appeared
          const panelVisible = await page.locator('text=Send SMS').isVisible({ timeout: 1000 }).catch(() => false);
          if (panelVisible) {
            console.log('   ✅ Action panel appeared!');

            // Click "Wait" action
            console.log('📍 Clicking Wait action...');
            await page.locator('text=Wait').first().click();
            await page.waitForTimeout(2000);
            await ss(page, 'wait-action-added');
            break;
          }
        }
      }
    }

    await ss(page, 'final-state');
    console.log('\n✅ Done exploring!');

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('Browser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
