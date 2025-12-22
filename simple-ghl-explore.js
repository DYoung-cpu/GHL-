const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

const UI_MAP = { login: {}, sidebar: {}, workflows: { list: {}, editor: {}, triggers: {} }, log: [] };

const log = (msg) => { console.log(msg); UI_MAP.log.push(msg); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  log('=== GHL EXPLORATION WITH GOOGLE LOGIN ===');
  
  fs.mkdirSync('screenshots/exploration', { recursive: true });
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  try {
    // Go to GHL
    log('Going to GHL...');
    await page.goto('https://app.gohighlevel.com/');
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/exploration/01-login.png' });
    
    // Find Google button
    log('Looking for Google Sign In...');
    const googleBtn = await page.locator('button:has-text("Google")').first();
    if (await googleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await googleBtn.boundingBox();
      log('Found Google button at (' + Math.round(box.x + box.width/2) + ', ' + Math.round(box.y + box.height/2) + ')');
      UI_MAP.login.googleButton = { x: Math.round(box.x + box.width/2), y: Math.round(box.y + box.height/2) };
      await googleBtn.click();
    } else {
      log('Trying coordinate click for Google button...');
      await page.mouse.click(727, 427);
    }
    
    await sleep(3000);
    
    // Handle Google popup
    const pages = context.pages();
    log('Found ' + pages.length + ' pages');
    
    for (const p of pages) {
      if (p.url().includes('accounts.google.com')) {
        log('Found Google page, entering credentials...');
        await p.bringToFront();
        await sleep(2000);
        
        // Email
        const emailInput = p.locator('input[type="email"]').first();
        if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await emailInput.fill(CONFIG.email);
          await p.keyboard.press('Enter');
          log('Entered email');
          await sleep(4000);
          await p.screenshot({ path: 'screenshots/exploration/02-google-email.png' });
        }
        
        // Password
        const passInput = p.locator('input[type="password"]:visible').first();
        if (await passInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await passInput.fill(CONFIG.password);
          await p.keyboard.press('Enter');
          log('Entered password');
          await sleep(6000);
        }
        
        break;
      }
    }
    
    // Back to main page
    await page.bringToFront();
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/exploration/03-after-login.png' });
    log('Current URL: ' + page.url());
    
    // Save auth
    await context.storageState({ path: 'ghl-auth.json' });
    log('Auth saved');
    
    // Navigate to workflows
    log('Navigating to workflows...');
    await page.goto('https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows');
    await sleep(5000);
    await page.screenshot({ path: 'screenshots/exploration/04-workflows.png' });
    
    // Map all visible elements
    log('Mapping visible elements...');
    const elements = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('button, a, [role="button"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || '').trim();
        if (rect.width > 0 && rect.height > 0 && text) {
          items.push({ text: text.substring(0, 50), x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) });
        }
      });
      return items;
    });
    
    log('Found ' + elements.length + ' elements:');
    elements.forEach(el => {
      log('  "' + el.text + '" at (' + el.x + ', ' + el.y + ')');
      if (el.text.toLowerCase().includes('create workflow')) {
        UI_MAP.workflows.list.createWorkflow = el;
      }
    });
    
    // Click Create Workflow
    const createBtn = UI_MAP.workflows.list.createWorkflow;
    if (createBtn) {
      log('Clicking Create Workflow at (' + createBtn.x + ', ' + createBtn.y + ')');
      await page.mouse.click(createBtn.x, createBtn.y);
      await sleep(2000);
      await page.screenshot({ path: 'screenshots/exploration/05-dropdown.png' });
      
      // Get dropdown
      const dropdown = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[role="menuitem"], [role="option"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          const text = (el.innerText || '').trim();
          if (rect.width > 0 && text) {
            items.push({ text: text.substring(0, 50), x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) });
          }
        });
        return items;
      });
      
      log('Dropdown items:');
      dropdown.forEach(d => {
        log('  "' + d.text + '" at (' + d.x + ', ' + d.y + ')');
        if (d.text.toLowerCase().includes('scratch')) {
          UI_MAP.workflows.list.startFromScratch = d;
        }
      });
      
      // Click Start from Scratch
      const scratch = UI_MAP.workflows.list.startFromScratch;
      if (scratch) {
        log('Clicking Start from Scratch...');
        await page.mouse.click(scratch.x, scratch.y);
        await sleep(3000);
        await page.screenshot({ path: 'screenshots/exploration/06-editor.png' });
        
        // Map editor
        const editorElements = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('button, input, [role="button"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || el.placeholder || '').trim();
            if (rect.width > 0 && rect.height > 0) {
              items.push({ text: text.substring(0, 50), x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2), tag: el.tagName });
            }
          });
          return items;
        });
        
        log('Editor elements:');
        editorElements.forEach(el => {
          if (el.text) log('  "' + el.text + '" at (' + el.x + ', ' + el.y + ')');
          if (el.text.toLowerCase().includes('save')) UI_MAP.workflows.editor.save = el;
          if (el.text.toLowerCase().includes('publish')) UI_MAP.workflows.editor.publish = el;
        });
        
        // Click trigger area
        log('Clicking trigger area...');
        await page.mouse.click(640, 350);
        await sleep(2000);
        await page.screenshot({ path: 'screenshots/exploration/07-triggers.png' });
        
        // Map triggers
        const triggers = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('div, button').forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || '').trim();
            if (rect.x > 900 && rect.width > 50 && text && text.length < 60) {
              items.push({ text: text, x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) });
            }
          });
          return items.slice(0, 20);
        });
        
        log('Trigger types:');
        triggers.forEach(t => {
          log('  "' + t.text + '" at (' + t.x + ', ' + t.y + ')');
          UI_MAP.workflows.triggers[t.text.replace(/[^a-zA-Z]/g, '').substring(0, 20)] = t;
        });
      }
    }
    
    // Save map
    fs.writeFileSync('ghl-ui-map.json', JSON.stringify(UI_MAP, null, 2));
    log('Saved ghl-ui-map.json');
    
    // Generate markdown
    let md = '# GHL UI MAP\\n\\n';
    md += '## Login (GOOGLE REQUIRED)\\n';
    md += '- Email: ' + CONFIG.email + '\\n';
    md += '- Password: ' + CONFIG.password + '\\n';
    md += '- Google Button: (' + (UI_MAP.login.googleButton?.x || 727) + ', ' + (UI_MAP.login.googleButton?.y || 427) + ')\\n\\n';
    md += '## Workflows\\n';
    md += '- URL: https://app.gohighlevel.com/v2/location/' + CONFIG.locationId + '/automation/workflows\\n';
    md += '- Create Workflow: (' + (UI_MAP.workflows.list.createWorkflow?.x || 'TBD') + ', ' + (UI_MAP.workflows.list.createWorkflow?.y || 'TBD') + ')\\n';
    md += '- Start from Scratch: (' + (UI_MAP.workflows.list.startFromScratch?.x || 'TBD') + ', ' + (UI_MAP.workflows.list.startFromScratch?.y || 'TBD') + ')\\n\\n';
    md += '## Editor\\n';
    Object.entries(UI_MAP.workflows.editor).forEach(([k, v]) => {
      md += '- ' + k + ': (' + v.x + ', ' + v.y + ')\\n';
    });
    md += '\\n## Triggers\\n';
    Object.entries(UI_MAP.workflows.triggers).forEach(([k, v]) => {
      md += '- ' + v.text + ': (' + v.x + ', ' + v.y + ')\\n';
    });
    
    fs.writeFileSync('GHL-UI-MAP.md', md.replace(/\\n/g, '\n'));
    log('Saved GHL-UI-MAP.md');
    
    log('=== EXPLORATION COMPLETE ===');
    log('Browser open for 3 minutes...');
    await sleep(180000);
    
  } catch (error) {
    log('ERROR: ' + error.message);
    await page.screenshot({ path: 'screenshots/exploration/error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
