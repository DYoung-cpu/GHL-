const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = { locationId: 'peE6XmGYBb1xV0iNbh6C' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const recorded = [];
let clickCount = 0;

async function main() {
  console.log('==========================================');
  console.log('   CDP MOUSE RECORDER');
  console.log('==========================================');
  console.log('');
  console.log('This uses Chrome DevTools Protocol to');
  console.log('capture clicks at the browser level.');
  console.log('');
  console.log('Press Ctrl+C when done.');
  console.log('==========================================');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  // Use CDP to track mouse clicks at browser level
  const cdp = await context.newCDPSession(page);

  await cdp.send('DOM.enable');
  await cdp.send('Overlay.enable');

  // Listen for mouse pressed events
  cdp.on('Input.dispatchMouseEvent', (event) => {
    console.log('Mouse event:', event);
  });

  // Alternative: track via page events
  page.on('click', async (e) => {
    console.log('Page click detected');
  });

  // Track mouse position on clicks using evaluate polling
  let lastClickTime = 0;

  setInterval(async () => {
    try {
      const mouseData = await page.evaluate(() => {
        return window.__lastClick || null;
      });
      if (mouseData && mouseData.time > lastClickTime) {
        lastClickTime = mouseData.time;
        clickCount++;
        console.log('');
        console.log('=== CLICK #' + clickCount + ' ===');
        console.log('Position: (' + mouseData.x + ', ' + mouseData.y + ')');
        console.log('Element: ' + mouseData.text);
        recorded.push(mouseData);
      }
    } catch (e) {}
  }, 200);

  // Inject at a very low level
  await page.addInitScript(() => {
    window.__lastClick = null;

    // Capture at document level with useCapture=true
    document.addEventListener('mousedown', (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let text = 'unknown';
      let box = { x: e.clientX, y: e.clientY, w: 1, h: 1 };

      if (el) {
        const rect = el.getBoundingClientRect();
        text = (el.innerText || el.textContent || '').trim().split('\\n')[0].substring(0, 40);
        if (!text) text = el.getAttribute('aria-label') || el.tagName;
        box = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      }

      window.__lastClick = {
        x: Math.round(box.x + box.w / 2),
        y: Math.round(box.y + box.h / 2),
        mouseX: e.clientX,
        mouseY: e.clientY,
        text: text,
        box: box,
        time: Date.now()
      };
    }, true);
  });

  // Go to workflows
  console.log('Opening workflows page...');
  await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
  await sleep(3000);

  // Re-inject after load
  await page.evaluate(() => {
    if (window.__injected) return;
    window.__injected = true;
    window.__lastClick = null;

    document.addEventListener('mousedown', (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let text = 'unknown';
      let box = { x: e.clientX, y: e.clientY, w: 1, h: 1 };

      if (el) {
        const rect = el.getBoundingClientRect();
        text = (el.innerText || el.textContent || '').trim().split('\\n')[0].substring(0, 40);
        if (!text) text = el.getAttribute('aria-label') || el.tagName;
        box = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      }

      window.__lastClick = {
        x: Math.round(box.x + box.w / 2),
        y: Math.round(box.y + box.h / 2),
        mouseX: e.clientX,
        mouseY: e.clientY,
        text: text,
        box: box,
        time: Date.now()
      };
    }, true);
  });

  console.log('');
  console.log('>>> READY - Click elements to record <<<');
  console.log('>>> Press Ctrl+C to save and exit <<<');
  console.log('');

  // Save on exit
  process.on('SIGINT', () => {
    console.log('');
    console.log('==========================================');
    console.log('SAVED ' + recorded.length + ' CLICKS');
    console.log('==========================================');

    if (recorded.length > 0) {
      fs.writeFileSync('recorded-clicks.json', JSON.stringify(recorded, null, 2));

      console.log('');
      console.log('=== COORDINATES ===');
      recorded.forEach((r, i) => {
        console.log((i+1) + '. "' + r.text + '": { x: ' + r.x + ', y: ' + r.y + ' }');
      });
      console.log('');
      console.log('Saved to recorded-clicks.json');
    }

    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
