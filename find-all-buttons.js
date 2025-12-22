const { chromium } = require('playwright');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11, 8) + '] ' + msg);

async function main() {
  log('=== FIND ALL CLICKABLE ELEMENTS ===');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  try {
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(6000);
    await page.screenshot({ path: 'screenshots/find-buttons.png' });

    // Get all visible elements with their positions
    const elements = await page.evaluate(() => {
      const results = [];
      const all = document.querySelectorAll('button, a, [role="button"], [onclick], .btn, [class*="button"]');

      all.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.x > 0 && rect.y > 0) {
          const text = (el.innerText || el.textContent || '').trim().substring(0, 50);
          if (text) {
            results.push({
              text: text,
              tag: el.tagName,
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              cx: Math.round(rect.x + rect.width / 2),
              cy: Math.round(rect.y + rect.height / 2)
            });
          }
        }
      });

      return results;
    });

    log('\n=== ALL CLICKABLE ELEMENTS ===');
    elements.forEach(e => {
      if (e.text.includes('Create') || e.text.includes('Workflow') || e.text.includes('Folder') || e.text.includes('Scratch')) {
        log('*** "' + e.text.substring(0, 30) + '" <' + e.tag + '> CENTER: (' + e.cx + ', ' + e.cy + ')');
      }
    });

    log('\n=== ALL BUTTONS IN TOP AREA (y < 200) ===');
    elements.filter(e => e.cy < 200).forEach(e => {
      log('"' + e.text.substring(0, 30) + '" CENTER: (' + e.cx + ', ' + e.cy + ')');
    });

    // Try clicking where Create Workflow should be using evaluate
    log('\n=== SEARCHING PAGE FOR CREATE WORKFLOW ===');
    const found = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el.innerText || '').trim();
        if (text.includes('Create Workflow') && text.length < 50) {
          const rect = el.getBoundingClientRect();
          results.push({
            text: text,
            tag: el.tagName,
            class: el.className,
            cx: Math.round(rect.x + rect.width / 2),
            cy: Math.round(rect.y + rect.height / 2)
          });
        }
      });
      return results;
    });

    found.forEach(f => {
      log('Found: "' + f.text.substring(0, 30) + '" <' + f.tag + '> at (' + f.cx + ', ' + f.cy + ')');
    });

    // Now try to click by using mouse at the found coordinates
    if (found.length > 0) {
      const target = found[found.length - 1];  // Get most specific element
      log('\nClicking at (' + target.cx + ', ' + target.cy + ')');
      await page.mouse.click(target.cx, target.cy);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/after-click.png' });

      // Look for dropdown items
      const dropdown = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
          const text = (el.innerText || '').trim();
          if (text.includes('Scratch') || text.includes('Recipe') || text.includes('Template')) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              results.push({
                text: text.substring(0, 40),
                cx: Math.round(rect.x + rect.width / 2),
                cy: Math.round(rect.y + rect.height / 2)
              });
            }
          }
        });
        return results;
      });

      log('\n=== DROPDOWN ITEMS ===');
      dropdown.forEach(d => {
        log('"' + d.text + '" at (' + d.cx + ', ' + d.cy + ')');
      });
    }

    log('\nBrowser open 30s...');
    await sleep(30000);

  } catch (error) {
    log('ERROR: ' + error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
