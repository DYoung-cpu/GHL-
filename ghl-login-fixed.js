const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log('[' + new Date().toISOString().substr(11,8) + '] ' + msg);

async function main() {
  log('=== GHL LOGIN WITH GOOGLE ===');
  fs.mkdirSync('screenshots/exploration', { recursive: true });
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  try {
    log('Going to GHL...');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/exploration/01-login.png' });
    
    // The Google button is at approximately (728, 427) based on screenshot
    // But let's try to find it first with multiple methods
    log('Looking for Google button...');
    
    // Method 1: Try text selector
    let googleClicked = false;
    const selectors = [
      'button:has-text("Sign in with Google")',
      'text=Sign in with Google',
      '[data-provider="google"]',
      'button >> text=Google'
    ];
    
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          log('Found via selector: ' + sel);
          await el.click();
          googleClicked = true;
          break;
        }
      } catch (e) {}
    }
    
    // Method 2: Coordinate click if selectors failed
    if (!googleClicked) {
      log('Selectors failed, trying coordinate click at (728, 427)...');
      await page.mouse.click(728, 427);
    }
    
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/exploration/02-after-google-click.png' });
    
    // Wait for Google popup
    log('Waiting for Google popup...');
    let googlePage = null;
    
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      const allPages = context.pages();
      log('Pages: ' + allPages.length);
      
      for (const p of allPages) {
        const url = p.url();
        if (url.includes('accounts.google.com')) {
          googlePage = p;
          log('Found Google auth page!');
          break;
        }
      }
      if (googlePage) break;
    }
    
    if (googlePage) {
      log('Entering Google credentials...');
      await googlePage.bringToFront();
      await sleep(2000);
      await googlePage.screenshot({ path: 'screenshots/exploration/03-google-email.png' });
      
      // Enter email
      const emailInput = googlePage.locator('input[type="email"]');
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill(CONFIG.email);
        log('Filled email');
        await sleep(500);
        
        // Click Next or press Enter
        const nextBtn = googlePage.locator('button:has-text("Next"), #identifierNext');
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextBtn.click();
        } else {
          await googlePage.keyboard.press('Enter');
        }
        log('Clicked Next/Enter');
        await sleep(4000);
        await googlePage.screenshot({ path: 'screenshots/exploration/04-google-password.png' });
        
        // Enter password
        const passInput = googlePage.locator('input[type="password"]');
        if (await passInput.isVisible({ timeout: 5000 })) {
          await passInput.fill(CONFIG.password);
          log('Filled password');
          await sleep(500);
          
          const passNext = googlePage.locator('button:has-text("Next"), #passwordNext');
          if (await passNext.isVisible({ timeout: 2000 }).catch(() => false)) {
            await passNext.click();
          } else {
            await googlePage.keyboard.press('Enter');
          }
          log('Clicked Next/Enter for password');
          await sleep(6000);
        }
      }
      
      await page.bringToFront();
    } else {
      log('No Google popup - waiting for manual login (60s)...');
      await sleep(60000);
    }
    
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/exploration/05-after-login.png' });
    log('URL after login: ' + page.url());
    
    // Check if logged in
    if (!page.url().includes('login')) {
      log('LOGIN SUCCESSFUL!');
      
      // Save auth state
      await context.storageState({ path: 'ghl-auth.json' });
      log('Auth state saved to ghl-auth.json');
      
      // Now map the workflows page
      log('Navigating to workflows...');
      await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
      await sleep(5000);
      await page.screenshot({ path: 'screenshots/exploration/06-workflows.png' });
      
      // Map all elements
      const elements = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('button, a, [role="button"], input').forEach(el => {
          const rect = el.getBoundingClientRect();
          const text = (el.innerText || el.placeholder || el.getAttribute('aria-label') || '').trim();
          if (rect.width > 0 && rect.height > 0) {
            items.push({ 
              text: text.substring(0, 60), 
              x: Math.round(rect.x + rect.width/2), 
              y: Math.round(rect.y + rect.height/2),
              tag: el.tagName
            });
          }
        });
        return items;
      });
      
      log('Elements found on workflows page:');
      elements.filter(e => e.text).forEach(e => {
        log('  "' + e.text + '" at (' + e.x + ', ' + e.y + ')');
      });
      
      // Save to JSON
      fs.writeFileSync('ghl-ui-map.json', JSON.stringify({ elements, timestamp: new Date().toISOString() }, null, 2));
      log('Saved to ghl-ui-map.json');
      
      log('Keeping browser open for exploration (3 min)...');
      await sleep(180000);
    } else {
      log('Still on login page - login may have failed');
    }
    
  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/exploration/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
