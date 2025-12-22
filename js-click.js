const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11, 8) + '] ' + msg);

async function main() {
  log('=== JAVASCRIPT CLICK TEST ===');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  try {
    log('Navigate to workflows');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(10000);  // Wait longer
    await page.screenshot({ path: 'screenshots/js-01.png' });

    // Use JavaScript to find and click the button
    log('Using JS to find Create Workflow button...');

    const buttonInfo = await page.evaluate(() => {
      // Search all elements for "Create Workflow"
      const allElements = document.querySelectorAll('*');
      const results = [];

      for (const el of allElements) {
        const text = el.textContent || el.innerText || '';
        if (text.includes('Create Workflow') && !text.includes('Create Folder')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.width < 300 && rect.height > 0 && rect.height < 100) {
            results.push({
              tag: el.tagName,
              class: el.className,
              text: text.substring(0, 50),
              x: rect.x,
              y: rect.y,
              w: rect.width,
              h: rect.height,
              cx: rect.x + rect.width / 2,
              cy: rect.y + rect.height / 2
            });
          }
        }
      }

      // Sort by area (smallest = most specific)
      results.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      return results;
    });

    log('Found ' + buttonInfo.length + ' elements with "Create Workflow":');
    buttonInfo.forEach((b, i) => {
      log('  ' + i + ': <' + b.tag + '> class="' + (b.class || '').substring(0, 30) + '" at (' + Math.round(b.cx) + ', ' + Math.round(b.cy) + ') size=' + Math.round(b.w) + 'x' + Math.round(b.h));
    });

    if (buttonInfo.length > 0) {
      // Click the smallest/most specific element
      const target = buttonInfo[0];
      log('\nClicking at (' + Math.round(target.cx) + ', ' + Math.round(target.cy) + ')');

      // Use JavaScript click
      await page.evaluate((coords) => {
        const el = document.elementFromPoint(coords.x, coords.y);
        if (el) {
          console.log('Clicking element:', el.tagName, el.className);
          el.click();
        }
      }, { x: target.cx, y: target.cy });

      await sleep(2000);
      await page.screenshot({ path: 'screenshots/js-02-afterclick.png' });

      // Check for dropdown
      const dropdownItems = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
          const text = (el.textContent || '').trim();
          if (text === 'Start from Scratch' || text === 'Use Recipe') {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              results.push({ text, cx: rect.x + rect.width/2, cy: rect.y + rect.height/2 });
            }
          }
        });
        return results;
      });

      log('Dropdown items: ' + JSON.stringify(dropdownItems));

      if (dropdownItems.length > 0) {
        const scratch = dropdownItems.find(d => d.text === 'Start from Scratch');
        if (scratch) {
          log('Clicking Start from Scratch at (' + Math.round(scratch.cx) + ', ' + Math.round(scratch.cy) + ')');
          await page.evaluate((coords) => {
            const el = document.elementFromPoint(coords.x, coords.y);
            if (el) el.click();
          }, { x: scratch.cx, y: scratch.cy });

          await sleep(3000);
          await page.screenshot({ path: 'screenshots/js-03-editor.png' });
          log('=== EDITOR SHOULD BE OPEN ===');
        }
      }
    }

    log('Browser open 60s...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
