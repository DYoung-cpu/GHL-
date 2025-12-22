const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const recorded = {
  startTime: new Date().toISOString(),
  elements: []
};

async function main() {
  console.log('==========================================');
  console.log('   PRECISE ELEMENT RECORDER');
  console.log('==========================================');
  console.log('');
  console.log('This captures the EXACT CENTER of each');
  console.log('element you click - guaranteed to work.');
  console.log('');
  console.log('Instructions:');
  console.log('1. Click on each button/element you want');
  console.log('2. I record the element\'s bounding box CENTER');
  console.log('3. Press Ctrl+C when done');
  console.log('');
  console.log('==========================================');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  let clickCount = 0;

  // Record element bounding box center (not mouse position)
  await page.exposeFunction('recordElement', async (data) => {
    clickCount++;
    const element = {
      id: clickCount,
      name: data.text,
      tag: data.tag,
      // BOUNDING BOX CENTER - this is the precise clickable point
      x: Math.round(data.boxX + data.boxW / 2),
      y: Math.round(data.boxY + data.boxH / 2),
      // Original box for reference
      box: {
        x: Math.round(data.boxX),
        y: Math.round(data.boxY),
        w: Math.round(data.boxW),
        h: Math.round(data.boxH)
      },
      // Where you actually clicked (for comparison)
      clickedAt: { x: Math.round(data.mouseX), y: Math.round(data.mouseY) },
      url: page.url().split('/').pop()
    };

    recorded.elements.push(element);

    console.log('');
    console.log('=== ELEMENT #' + clickCount + ' ===');
    console.log('Name: "' + element.name + '"');
    console.log('PRECISE CENTER: (' + element.x + ', ' + element.y + ')');
    console.log('Box: ' + element.box.w + 'x' + element.box.h + ' at (' + element.box.x + ', ' + element.box.y + ')');
    console.log('You clicked: (' + element.clickedAt.x + ', ' + element.clickedAt.y + ')');
  });

  // Inject listener that captures element bounding box
  const injectRecorder = async () => {
    await page.evaluate(() => {
      if (window.__recorderInjected) return;
      window.__recorderInjected = true;

      document.addEventListener('click', (e) => {
        const el = e.target;
        const rect = el.getBoundingClientRect();

        // Get meaningful text
        let text = el.innerText || el.textContent || '';
        text = text.trim().split('\n')[0].substring(0, 40);
        if (!text) text = el.getAttribute('aria-label') || el.placeholder || el.tagName;

        window.recordElement({
          text: text,
          tag: el.tagName,
          boxX: rect.x,
          boxY: rect.y,
          boxW: rect.width,
          boxH: rect.height,
          mouseX: e.clientX,
          mouseY: e.clientY
        });
      }, true);
    });
  };

  // Go to workflows
  console.log('Opening workflows page...');
  await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
  await sleep(5000);
  await injectRecorder();

  // Re-inject on navigation
  page.on('load', async () => {
    await sleep(1000);
    await injectRecorder();
  });

  console.log('');
  console.log('>>> READY! Click on elements to record <<<');
  console.log('>>> Press Ctrl+C when done <<<');
  console.log('');

  // Save on exit
  process.on('SIGINT', async () => {
    console.log('');
    console.log('==========================================');
    console.log('RECORDING COMPLETE - ' + recorded.elements.length + ' elements');
    console.log('==========================================');
    console.log('');

    recorded.endTime = new Date().toISOString();

    // Save full data
    fs.writeFileSync('precise-recording.json', JSON.stringify(recorded, null, 2));

    // Generate clean coordinate map
    const coordMap = {};
    recorded.elements.forEach(el => {
      const key = el.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      if (key) {
        coordMap[key] = { x: el.x, y: el.y };
      }
    });
    fs.writeFileSync('precise-coords.json', JSON.stringify(coordMap, null, 2));

    // Show summary
    console.log('=== PRECISE COORDINATES ===');
    console.log('');
    recorded.elements.forEach(el => {
      console.log('"' + el.name + '": { x: ' + el.x + ', y: ' + el.y + ' }');
    });
    console.log('');
    console.log('Saved to: precise-recording.json');
    console.log('Saved to: precise-coords.json');

    await browser.close();
    process.exit(0);
  });

  await new Promise(() => {});
}

main().catch(console.error);
