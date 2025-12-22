const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  await page.goto('https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/automation/workflows');
  await new Promise(r => setTimeout(r, 8000));

  const frame = page.frame({ url: /automation-workflows/ });
  if (!frame) {
    console.log('Frame not found');
    await browser.close();
    return;
  }

  // Click Create Workflow -> Start from Scratch
  console.log('Opening workflow editor...');
  await frame.locator('button:has-text("Create Workflow")').click();
  await new Promise(r => setTimeout(r, 1500));
  await frame.locator('text=Start from Scratch').click();
  await new Promise(r => setTimeout(r, 6000));

  console.log('\n=== WORKFLOW EDITOR ELEMENTS ===\n');

  // Map all elements with text
  const elements = await frame.evaluate(() => {
    const results = [];
    document.querySelectorAll('*').forEach(el => {
      const text = (el.innerText || el.textContent || '').trim().split('\n')[0].substring(0, 50);
      const rect = el.getBoundingClientRect();
      if (text && rect.width > 10 && rect.height > 10 && rect.width < 400 && rect.height < 100) {
        results.push({
          text,
          cx: Math.round(rect.x + rect.width / 2),
          cy: Math.round(rect.y + rect.height / 2),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        });
      }
    });
    // Dedupe by text
    const seen = new Set();
    return results.filter(e => {
      if (seen.has(e.text)) return false;
      seen.add(e.text);
      return true;
    });
  });

  // Print relevant elements
  const keywords = ['Back', 'Builder', 'Settings', 'Enrollment', 'Execution', 'Test', 'Publish', 'Draft', 'Save', 'Trigger', 'Action', 'Add', 'Workflow'];

  elements.forEach(e => {
    if (keywords.some(k => e.text.includes(k))) {
      console.log('"' + e.text + '": { x: ' + e.cx + ', y: ' + e.cy + ' }');
    }
  });

  // Save all
  const coordMap = {};
  elements.forEach(e => {
    const key = e.text.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (key && key.length > 1 && key.length < 40) {
      coordMap[key] = { x: e.cx, y: e.cy };
    }
  });

  fs.writeFileSync('editor-elements.json', JSON.stringify(coordMap, null, 2));
  console.log('\nSaved to editor-elements.json');

  await page.screenshot({ path: 'screenshots/editor-mapped.png' });
  await browser.close();
}

main().catch(console.error);
