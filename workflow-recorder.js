const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const recorded = {
  startTime: new Date().toISOString(),
  clicks: []
};

async function main() {
  console.log('=========================================');
  console.log('   GHL WORKFLOW RECORDER');
  console.log('=========================================');
  console.log('');
  console.log('Instructions:');
  console.log('1. You are already logged in');
  console.log('2. Click on elements you want to map:');
  console.log('   - Create Workflow button');
  console.log('   - Start from Scratch');
  console.log('   - Trigger options');
  console.log('   - Save/Publish buttons');
  console.log('3. Press Ctrl+C when done');
  console.log('');
  console.log('=========================================');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  let clickCount = 0;

  // Record clicks
  await page.exposeFunction('recordClick', async (x, y, text, tag) => {
    clickCount++;
    const click = {
      id: clickCount,
      x: Math.round(x),
      y: Math.round(y),
      text: text.substring(0, 40),
      tag: tag,
      url: page.url().split('/').pop(),
      time: new Date().toISOString()
    };
    recorded.clicks.push(click);
    console.log('CLICK #' + clickCount + ' at (' + click.x + ', ' + click.y + ') - "' + click.text + '"');
  });

  // Inject click listener
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const text = target.innerText || target.placeholder || target.getAttribute('aria-label') || target.tagName;
      window.recordClick(e.clientX, e.clientY, text || 'unknown', target.tagName);
    }, true);
  });

  // Go to workflows page
  console.log('Opening workflows page...');
  await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
  await sleep(5000);

  // Re-inject after navigation
  page.on('framenavigated', async () => {
    try {
      await page.addInitScript(() => {
        document.addEventListener('click', (e) => {
          const target = e.target;
          const text = target.innerText || target.placeholder || target.getAttribute('aria-label') || target.tagName;
          window.recordClick(e.clientX, e.clientY, text || 'unknown', target.tagName);
        }, true);
      });
    } catch (e) {}
  });

  console.log('');
  console.log('>>> READY! Click on elements to record their positions <<<');
  console.log('>>> Press Ctrl+C when done <<<');
  console.log('');

  // Save on exit
  process.on('SIGINT', async () => {
    console.log('');
    console.log('=========================================');
    console.log('RECORDING COMPLETE');
    console.log('=========================================');
    console.log('Clicks recorded: ' + recorded.clicks.length);
    console.log('');

    // Save JSON
    recorded.endTime = new Date().toISOString();
    fs.writeFileSync('workflow-clicks.json', JSON.stringify(recorded, null, 2));
    console.log('Saved to workflow-clicks.json');

    // Generate coordinates map
    const coordMap = {};
    recorded.clicks.forEach(c => {
      const key = c.text.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      if (key) {
        coordMap[key] = { x: c.x, y: c.y };
      }
    });
    fs.writeFileSync('workflow-coords.json', JSON.stringify(coordMap, null, 2));
    console.log('Saved coordinates to workflow-coords.json');

    // Show summary
    console.log('');
    console.log('=== RECORDED COORDINATES ===');
    recorded.clicks.forEach(c => {
      console.log('"' + c.text + '": { x: ' + c.x + ', y: ' + c.y + ' }');
    });

    await browser.close();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
