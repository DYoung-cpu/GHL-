const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(msg);

async function main() {
  log('=== GHL ELEMENT MAPPER ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  try {
    log('Navigating to workflows...');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');

    // Wait for page to fully load - look for "Workflow List" text
    log('Waiting for page to load...');
    await page.waitForSelector('text=Workflow List', { timeout: 30000 });
    await sleep(2000);  // Extra buffer for dynamic content
    log('Page loaded!\n');

    // Map all elements
    const elements = await page.evaluate(() => {
      const results = {};
      const all = document.querySelectorAll('*');

      all.forEach(el => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || el.textContent || '').trim();

        // Only get meaningful elements with text
        if (rect.width > 10 && rect.height > 10 && text && text.length < 60 && text.length > 1) {
          // Skip if we already have this text (get most specific/smallest element)
          const key = text.replace(/\n/g, ' ').substring(0, 40);
          const existing = results[key];
          const area = rect.width * rect.height;

          if (!existing || area < existing.area) {
            results[key] = {
              text: key,
              x: Math.round(rect.x + rect.width / 2),
              y: Math.round(rect.y + rect.height / 2),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              area: area,
              tag: el.tagName
            };
          }
        }
      });

      return results;
    });

    // Display key elements
    log('=== KEY WORKFLOW PAGE ELEMENTS ===\n');

    const keywords = ['Create', 'Workflow', 'Folder', 'Filter', 'Search', 'Settings', 'Save', 'Back', 'Test', 'Delete'];
    const keyElements = {};

    Object.values(elements).forEach(el => {
      const hasKeyword = keywords.some(k => el.text.includes(k));
      if (hasKeyword) {
        log(`"${el.text}" => (${el.x}, ${el.y})`);
        keyElements[el.text] = { x: el.x, y: el.y };
      }
    });

    // Save to JSON
    fs.writeFileSync('workflow-page-elements.json', JSON.stringify(keyElements, null, 2));
    log('\nSaved to workflow-page-elements.json');

    // Now click Create Workflow and map dropdown
    log('\n=== CLICKING CREATE WORKFLOW ===\n');

    const createBtn = elements['Create Workflow'] || elements['+ Create Workflow'];
    if (createBtn) {
      log(`Clicking at (${createBtn.x}, ${createBtn.y})`);
      await page.mouse.click(createBtn.x, createBtn.y);
      await sleep(1500);

      // Map dropdown items
      const dropdownItems = await page.evaluate(() => {
        const results = {};
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          const text = (el.innerText || '').trim();
          if (text && rect.width > 0 && rect.height > 0 && rect.height < 100) {
            if (text.includes('Scratch') || text.includes('Recipe') || text.includes('Template') || text.includes('Folder')) {
              const key = text.substring(0, 40);
              if (!results[key] || rect.width * rect.height < results[key].area) {
                results[key] = {
                  text: key,
                  x: Math.round(rect.x + rect.width / 2),
                  y: Math.round(rect.y + rect.height / 2),
                  area: rect.width * rect.height
                };
              }
            }
          }
        });
        return results;
      });

      log('Dropdown items:');
      Object.values(dropdownItems).forEach(item => {
        log(`  "${item.text}" => (${item.x}, ${item.y})`);
        keyElements[item.text] = { x: item.x, y: item.y };
      });

      // Click Start from Scratch
      const scratchItem = dropdownItems['Start from Scratch'];
      if (scratchItem) {
        log(`\nClicking Start from Scratch at (${scratchItem.x}, ${scratchItem.y})`);
        await page.mouse.click(scratchItem.x, scratchItem.y);
        await sleep(3000);

        // Map workflow editor
        log('\n=== WORKFLOW EDITOR ELEMENTS ===\n');

        const editorElements = await page.evaluate(() => {
          const results = {};
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || '').trim();
            if (text && rect.width > 0 && rect.height > 0 && text.length < 50 && text.length > 1) {
              const key = text.substring(0, 40);
              const area = rect.width * rect.height;
              if (!results[key] || area < results[key].area) {
                results[key] = {
                  text: key,
                  x: Math.round(rect.x + rect.width / 2),
                  y: Math.round(rect.y + rect.height / 2),
                  area: area
                };
              }
            }
          });
          return results;
        });

        const editorKeywords = ['Trigger', 'Action', 'Save', 'Publish', 'Test', 'Back', 'Settings', 'Add', 'Delete', 'Name'];
        Object.values(editorElements).forEach(el => {
          if (editorKeywords.some(k => el.text.includes(k))) {
            log(`"${el.text}" => (${el.x}, ${el.y})`);
            keyElements['EDITOR: ' + el.text] = { x: el.x, y: el.y };
          }
        });

        await page.screenshot({ path: 'screenshots/editor-mapped.png' });
      }
    }

    // Save complete map
    fs.writeFileSync('ghl-element-map.json', JSON.stringify(keyElements, null, 2));
    log('\n=== COMPLETE MAP SAVED TO ghl-element-map.json ===');

    log('\nBrowser open 30s for inspection...');
    await sleep(30000);

  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/map-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
