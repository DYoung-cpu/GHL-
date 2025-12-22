const { chromium } = require('playwright');
const fs = require('fs');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const time = new Date().toISOString().substr(11, 8);
  console.log('[' + time + '] ' + msg);
}

async function main() {
  log('=== INSPECTING GHL LOGIN PAGE ===');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    log('Navigate to GHL');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(5000);

    // Get all frames
    const frames = page.frames();
    log('Found ' + frames.length + ' frames');

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      log('Frame ' + i + ': ' + frame.url());
    }

    // Get page HTML
    const html = await page.content();
    log('Page HTML length: ' + html.length);

    // Save HTML for inspection
    fs.writeFileSync('login-page.html', html);
    log('Saved HTML to login-page.html');

    // Look for Google-related elements
    log('\n=== SEARCHING FOR GOOGLE ELEMENTS ===');

    // Try various selectors
    const selectors = [
      'text=Google',
      'text=Sign in with Google',
      'button:has-text("Google")',
      'a:has-text("Google")',
      '[data-provider="google"]',
      '.google-button',
      '#google-signin',
      'iframe',
      'img[src*="google"]'
    ];

    for (const sel of selectors) {
      try {
        const count = await page.locator(sel).count();
        if (count > 0) {
          log('Found ' + count + ' elements matching: ' + sel);
          // Get info about first match
          const first = page.locator(sel).first();
          const box = await first.boundingBox();
          if (box) {
            log('  -> Bounding box: x=' + Math.round(box.x) + ' y=' + Math.round(box.y) + ' w=' + Math.round(box.width) + ' h=' + Math.round(box.height));
            log('  -> Center: (' + Math.round(box.x + box.width/2) + ', ' + Math.round(box.y + box.height/2) + ')');
          }
        }
      } catch (e) {
        // Skip errors
      }
    }

    // Try to find the button by analyzing visible text
    log('\n=== ALL VISIBLE TEXT ===');
    const allText = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const texts = [];
      elements.forEach(el => {
        if (el.innerText && el.innerText.length < 100) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            texts.push({
              text: el.innerText.trim().substring(0, 50),
              tag: el.tagName,
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
          }
        }
      });
      return texts.filter((t, i, arr) =>
        arr.findIndex(x => x.text === t.text && x.tag === t.tag) === i
      );
    });

    // Filter for Google-related
    const googleElements = allText.filter(t =>
      t.text.toLowerCase().includes('google') ||
      t.text.toLowerCase().includes('sign in')
    );

    log('Google/Sign-in related elements:');
    googleElements.forEach(e => {
      log('  "' + e.text + '" - <' + e.tag + '> at (' + (e.x + e.w/2) + ', ' + (e.y + e.h/2) + ')');
    });

    // Check for iframes and their content
    log('\n=== CHECKING IFRAMES ===');
    const iframeCount = await page.locator('iframe').count();
    log('Found ' + iframeCount + ' iframes');

    for (let i = 0; i < iframeCount; i++) {
      const iframe = page.frameLocator('iframe').nth(i);
      try {
        const iframeContent = await iframe.locator('body').textContent();
        log('Iframe ' + i + ' content: ' + (iframeContent || '').substring(0, 100));
      } catch (e) {
        log('Iframe ' + i + ' not accessible');
      }
    }

    // Try clicking by evaluating JavaScript directly
    log('\n=== TRYING JAVASCRIPT CLICK ===');
    const clicked = await page.evaluate(() => {
      // Find anything with "Google" in it
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.innerText && el.innerText.includes('Sign in with Google')) {
          console.log('Found element:', el.tagName, el.className);
          el.click();
          return { found: true, tag: el.tagName, class: el.className };
        }
      }
      return { found: false };
    });

    log('JS Click result: ' + JSON.stringify(clicked));

    await sleep(3000);
    await page.screenshot({ path: 'screenshots/after-js-click.png' });

    // Check if Google popup appeared
    const allPages = context.pages();
    log('\nPages after click: ' + allPages.length);
    for (const p of allPages) {
      log('  Page: ' + p.url());
    }

    log('\nBrowser open for 60s for manual inspection...');
    await sleep(60000);

  } catch (error) {
    log('ERROR: ' + error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
