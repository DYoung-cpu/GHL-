const { chromium } = require('playwright');
const fs = require('fs');

// Configuration
const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C',
  viewport: { width: 1920, height: 1080 },
  screenshotDir: 'screenshots/exploration',
  mapFile: 'GHL-UI-MAP.md'
};

// Storage for discovered elements
const UI_MAP = {
  login: {},
  sidebar: {},
  workflows: {
    list: {},
    editor: {},
    triggers: {},
    actions: {}
  },
  exploration_log: []
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
  UI_MAP.exploration_log.push({ time: timestamp, msg });
}

async function screenshot(page, name, description = '') {
  const path = `${CONFIG.screenshotDir}/${name}.png`;
  await page.screenshot({ path });
  log(`Screenshot: ${name}.png - ${description}`);
  return path;
}

async function getElementInfo(page, selector) {
  try {
    const el = await page.locator(selector).first();
    if (await el.isVisible({ timeout: 1000 })) {
      const box = await el.boundingBox();
      return {
        selector,
        x: Math.round(box.x + box.width / 2),
        y: Math.round(box.y + box.height / 2),
        width: Math.round(box.width),
        height: Math.round(box.height),
        visible: true
      };
    }
  } catch (e) {}
  return { selector, visible: false };
}

async function getAllClickableElements(page) {
  return await page.evaluate(() => {
    const elements = [];
    const selectors = 'button, a, [role="button"], [onclick], input[type="submit"], [class*="btn"], [class*="click"]';
    document.querySelectorAll(selectors).forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
      if (rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.y >= 0) {
        elements.push({
          tag: el.tagName,
          text: text.substring(0, 50),
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          classes: el.className.toString().substring(0, 100)
        });
      }
    });
    return elements;
  });
}

async function mapLoginPage(page) {
  log('=== MAPPING LOGIN PAGE ===');
  await screenshot(page, '01-login-page', 'Initial login page');
  
  // Find login elements
  const loginElements = await getAllClickableElements(page);
  log(`Found ${loginElements.length} clickable elements on login page`);
  
  // Specific login elements
  UI_MAP.login.emailInput = await getElementInfo(page, 'input[type="email"], input[placeholder*="email"]');
  UI_MAP.login.passwordInput = await getElementInfo(page, 'input[type="password"]');
  UI_MAP.login.signInButton = await getElementInfo(page, 'button:has-text("Sign in"), button[type="submit"]');
  UI_MAP.login.googleButton = await getElementInfo(page, 'button:has-text("Google"), [data-provider="google"]');
  
  // Log what we found
  log('Login elements mapped:');
  Object.entries(UI_MAP.login).forEach(([key, val]) => {
    if (val.visible) {
      log(`  ${key}: (${val.x}, ${val.y})`);
    }
  });
  
  return loginElements;
}

async function performLogin(page) {
  log('=== PERFORMING LOGIN ===');
  
  // Try email/password login first
  try {
    // Enter email
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(CONFIG.email);
      log('Entered email');
      await sleep(500);
      
      // Enter password
      const passInput = page.locator('input[type="password"]').first();
      if (await passInput.isVisible({ timeout: 2000 })) {
        await passInput.fill(CONFIG.password);
        log('Entered password');
        await sleep(500);
        
        // Click sign in
        const signIn = page.locator('button:has-text("Sign in"), button[type="submit"]').first();
        await signIn.click();
        log('Clicked Sign In');
        await sleep(5000);
        
        await screenshot(page, '02-after-login', 'After login attempt');
        return true;
      }
    }
  } catch (e) {
    log('Email/password login failed: ' + e.message);
  }
  
  return false;
}

async function mapSidebar(page) {
  log('=== MAPPING SIDEBAR ===');
  await screenshot(page, '03-main-app', 'Main app after login');
  
  // Get all sidebar items
  const sidebarItems = await page.evaluate(() => {
    const items = [];
    // Look for sidebar navigation items
    const navItems = document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="nav"] a, [class*="menu"] a');
    navItems.forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || '').trim();
      // Sidebar is usually on the left (x < 300)
      if (rect.x < 300 && rect.width > 0 && rect.height > 0 && text) {
        items.push({
          text: text.substring(0, 30),
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          href: el.href || ''
        });
      }
    });
    return items;
  });
  
  log(`Found ${sidebarItems.length} sidebar items`);
  sidebarItems.forEach(item => {
    log(`  "${item.text}" at (${item.x}, ${item.y})`);
    UI_MAP.sidebar[item.text.toLowerCase().replace(/\s+/g, '_')] = {
      text: item.text,
      x: item.x,
      y: item.y,
      href: item.href
    };
  });
  
  return sidebarItems;
}

async function navigateToWorkflows(page) {
  log('=== NAVIGATING TO WORKFLOWS ===');
  
  // Direct URL navigation (most reliable)
  const workflowsUrl = `https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`;
  log(`Navigating to: ${workflowsUrl}`);
  
  await page.goto(workflowsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(5000);
  
  await screenshot(page, '04-workflows-page', 'Workflows page');
  return page.url();
}

async function mapWorkflowList(page) {
  log('=== MAPPING WORKFLOW LIST PAGE ===');
  
  // Get all elements on workflow page
  const elements = await getAllClickableElements(page);
  log(`Found ${elements.length} clickable elements`);
  
  // Find specific workflow page elements
  elements.forEach(el => {
    const textLower = el.text.toLowerCase();
    
    if (textLower.includes('create workflow')) {
      UI_MAP.workflows.list.createWorkflowBtn = { x: el.x, y: el.y, text: el.text };
      log(`  Create Workflow button: (${el.x}, ${el.y})`);
    }
    if (textLower.includes('create folder')) {
      UI_MAP.workflows.list.createFolderBtn = { x: el.x, y: el.y, text: el.text };
      log(`  Create Folder button: (${el.x}, ${el.y})`);
    }
    if (textLower === 'all workflows') {
      UI_MAP.workflows.list.allWorkflowsTab = { x: el.x, y: el.y, text: el.text };
      log(`  All Workflows tab: (${el.x}, ${el.y})`);
    }
  });
  
  // Look for search input
  const searchInput = await getElementInfo(page, 'input[placeholder*="Search"], input[type="search"]');
  if (searchInput.visible) {
    UI_MAP.workflows.list.searchInput = searchInput;
    log(`  Search input: (${searchInput.x}, ${searchInput.y})`);
  }
  
  return elements;
}

async function clickCreateWorkflow(page) {
  log('=== CLICKING CREATE WORKFLOW ===');
  
  // Use known coordinate or discovered one
  const createBtn = UI_MAP.workflows.list.createWorkflowBtn;
  const coords = createBtn ? { x: createBtn.x, y: createBtn.y } : { x: 1257, y: 138 };
  
  log(`Clicking at (${coords.x}, ${coords.y})`);
  await page.mouse.click(coords.x, coords.y);
  await sleep(2000);
  
  await screenshot(page, '05-create-dropdown', 'After clicking Create Workflow');
  
  // Map dropdown options
  const dropdownItems = await page.evaluate(() => {
    const items = [];
    // Look for dropdown/menu items
    const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], [class*="dropdown"] a, [class*="menu"] li, [class*="popover"] button');
    menuItems.forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || '').trim();
      if (rect.width > 0 && rect.height > 0 && text) {
        items.push({
          text: text.substring(0, 50),
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2)
        });
      }
    });
    return items;
  });
  
  log('Dropdown options:');
  dropdownItems.forEach(item => {
    log(`  "${item.text}" at (${item.x}, ${item.y})`);
    if (item.text.toLowerCase().includes('scratch')) {
      UI_MAP.workflows.list.startFromScratch = { x: item.x, y: item.y, text: item.text };
    }
    if (item.text.toLowerCase().includes('recipe') || item.text.toLowerCase().includes('template')) {
      UI_MAP.workflows.list.useRecipe = { x: item.x, y: item.y, text: item.text };
    }
  });
  
  return dropdownItems;
}

async function enterWorkflowEditor(page) {
  log('=== ENTERING WORKFLOW EDITOR ===');
  
  // Click "Start from Scratch"
  const scratchBtn = UI_MAP.workflows.list.startFromScratch;
  const coords = scratchBtn ? { x: scratchBtn.x, y: scratchBtn.y } : { x: 1200, y: 190 };
  
  log(`Clicking Start from Scratch at (${coords.x}, ${coords.y})`);
  await page.mouse.click(coords.x, coords.y);
  await sleep(3000);
  
  await screenshot(page, '06-workflow-editor', 'Workflow editor');
  
  return await mapWorkflowEditor(page);
}

async function mapWorkflowEditor(page) {
  log('=== MAPPING WORKFLOW EDITOR ===');
  
  const elements = await getAllClickableElements(page);
  log(`Found ${elements.length} clickable elements in editor`);
  
  // Find key editor elements
  elements.forEach(el => {
    const textLower = el.text.toLowerCase();
    
    if (textLower.includes('save')) {
      UI_MAP.workflows.editor.saveBtn = { x: el.x, y: el.y, text: el.text };
      log(`  Save button: (${el.x}, ${el.y})`);
    }
    if (textLower.includes('publish')) {
      UI_MAP.workflows.editor.publishBtn = { x: el.x, y: el.y, text: el.text };
      log(`  Publish button: (${el.x}, ${el.y})`);
    }
    if (textLower.includes('back') || textLower.includes('workflows')) {
      if (el.x < 200) { // Left side
        UI_MAP.workflows.editor.backBtn = { x: el.x, y: el.y, text: el.text };
        log(`  Back button: (${el.x}, ${el.y})`);
      }
    }
    if (textLower.includes('add') && textLower.includes('trigger')) {
      UI_MAP.workflows.editor.addTriggerBtn = { x: el.x, y: el.y, text: el.text };
      log(`  Add Trigger: (${el.x}, ${el.y})`);
    }
  });
  
  // Look for workflow name input (usually at top)
  const nameInputs = await page.evaluate(() => {
    const inputs = [];
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      const rect = el.getBoundingClientRect();
      // Name input is usually at top center
      if (rect.y < 100 && rect.x > 300 && rect.x < 1000) {
        inputs.push({
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          placeholder: el.placeholder || ''
        });
      }
    });
    return inputs;
  });
  
  if (nameInputs.length > 0) {
    UI_MAP.workflows.editor.nameInput = nameInputs[0];
    log(`  Name input: (${nameInputs[0].x}, ${nameInputs[0].y})`);
  }
  
  return elements;
}

async function exploreTriggerPanel(page) {
  log('=== EXPLORING TRIGGER PANEL ===');
  
  // Click on Add Trigger area (usually center of canvas)
  const addTrigger = UI_MAP.workflows.editor.addTriggerBtn;
  const coords = addTrigger ? { x: addTrigger.x, y: addTrigger.y } : { x: 960, y: 400 };
  
  log(`Clicking Add Trigger at (${coords.x}, ${coords.y})`);
  await page.mouse.click(coords.x, coords.y);
  await sleep(2000);
  
  await screenshot(page, '07-trigger-panel', 'Trigger selection panel');
  
  // Map trigger types
  const triggerTypes = await page.evaluate(() => {
    const triggers = [];
    // Look for trigger options in any panel/modal
    document.querySelectorAll('[class*="trigger"], [class*="option"], [class*="item"], [role="option"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || '').trim();
      // Filter to right side panel (usually > 1000px x)
      if (rect.width > 50 && rect.height > 20 && text && text.length < 100) {
        triggers.push({
          text: text.substring(0, 60),
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2)
        });
      }
    });
    return triggers.slice(0, 50); // Limit results
  });
  
  log('Trigger types found:');
  triggerTypes.forEach(t => {
    log(`  "${t.text}" at (${t.x}, ${t.y})`);
    const key = t.text.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    UI_MAP.workflows.triggers[key] = { x: t.x, y: t.y, text: t.text };
  });
  
  return triggerTypes;
}

async function saveUIMap() {
  log('=== SAVING UI MAP ===');
  
  const mapContent = `# GHL UI Map - Automation Reference

**Purpose:** This file contains all UI coordinates, selectors, and navigation paths for GHL automation.
**Last Updated:** ${new Date().toISOString()}

---

## CREDENTIALS

| Field | Value |
|-------|-------|
| Email | ${CONFIG.email} |
| Password | ${CONFIG.password} |
| Location ID (Mission Control) | ${CONFIG.locationId} |

---

## LOGIN FLOW

### Login Page URL
\`\`\`
https://app.gohighlevel.com/
\`\`\`

### Login Elements
| Element | Coordinates | Notes |
|---------|-------------|-------|
| Email input | (${UI_MAP.login.emailInput?.x || 'TBD'}, ${UI_MAP.login.emailInput?.y || 'TBD'}) | |
| Password input | (${UI_MAP.login.passwordInput?.x || 'TBD'}, ${UI_MAP.login.passwordInput?.y || 'TBD'}) | |
| Sign In button | (${UI_MAP.login.signInButton?.x || 'TBD'}, ${UI_MAP.login.signInButton?.y || 'TBD'}) | |

---

## MAIN NAVIGATION (Left Sidebar)

### Sidebar Elements
| Element | Coordinates | Notes |
|---------|-------------|-------|
${Object.entries(UI_MAP.sidebar).map(([key, val]) => `| ${val.text} | (${val.x}, ${val.y}) | |`).join('\n')}

---

## WORKFLOWS PAGE

### Direct URL
\`\`\`
https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows
\`\`\`

### List Page Elements
| Element | Coordinates | Notes |
|---------|-------------|-------|
| Create Workflow | (${UI_MAP.workflows.list.createWorkflowBtn?.x || 1257}, ${UI_MAP.workflows.list.createWorkflowBtn?.y || 138}) | Main button |
| Start from Scratch | (${UI_MAP.workflows.list.startFromScratch?.x || 1200}, ${UI_MAP.workflows.list.startFromScratch?.y || 190}) | Dropdown option |
| Search | (${UI_MAP.workflows.list.searchInput?.x || 'TBD'}, ${UI_MAP.workflows.list.searchInput?.y || 'TBD'}) | |

---

## WORKFLOW EDITOR

### Editor Elements
| Element | Coordinates | Notes |
|---------|-------------|-------|
| Name Input | (${UI_MAP.workflows.editor.nameInput?.x || 686}, ${UI_MAP.workflows.editor.nameInput?.y || 27}) | Top center |
| Back Button | (${UI_MAP.workflows.editor.backBtn?.x || 118}, ${UI_MAP.workflows.editor.backBtn?.y || 27}) | Top left |
| Save Button | (${UI_MAP.workflows.editor.saveBtn?.x || 'TBD'}, ${UI_MAP.workflows.editor.saveBtn?.y || 'TBD'}) | |
| Publish Button | (${UI_MAP.workflows.editor.publishBtn?.x || 'TBD'}, ${UI_MAP.workflows.editor.publishBtn?.y || 'TBD'}) | |
| Add Trigger | (${UI_MAP.workflows.editor.addTriggerBtn?.x || 960}, ${UI_MAP.workflows.editor.addTriggerBtn?.y || 400}) | Canvas center |

---

## TRIGGER TYPES

| Trigger | Coordinates | Notes |
|---------|-------------|-------|
${Object.entries(UI_MAP.workflows.triggers).map(([key, val]) => `| ${val.text} | (${val.x}, ${val.y}) | |`).join('\n') || '| TBD | TBD | Run exploration to populate |'}

---

## EXPLORATION LOG

\`\`\`
${UI_MAP.exploration_log.map(e => `[${e.time}] ${e.msg}`).join('\n')}
\`\`\`

---

## SCREENSHOTS REFERENCE

All screenshots saved to: \`${CONFIG.screenshotDir}/\`

| Screenshot | Description |
|------------|-------------|
| 01-login-page.png | Initial login page |
| 02-after-login.png | After login attempt |
| 03-main-app.png | Main app view |
| 04-workflows-page.png | Workflows list |
| 05-create-dropdown.png | Create workflow dropdown |
| 06-workflow-editor.png | Workflow editor |
| 07-trigger-panel.png | Trigger selection |
`;

  fs.writeFileSync(CONFIG.mapFile, mapContent);
  log(`UI Map saved to ${CONFIG.mapFile}`);
  
  // Also save raw JSON for programmatic access
  fs.writeFileSync('ghl-ui-map.json', JSON.stringify(UI_MAP, null, 2));
  log('Raw map saved to ghl-ui-map.json');
}

async function main() {
  console.log('='.repeat(60));
  console.log('GHL COMPREHENSIVE EXPLORATION');
  console.log('='.repeat(60));
  
  // Create screenshot directory
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: CONFIG.viewport
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Go to GHL
    log('Starting GHL exploration...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    
    // Step 2: Map and perform login
    await mapLoginPage(page);
    const loggedIn = await performLogin(page);
    
    if (!loggedIn) {
      log('Auto-login failed. Please login manually...');
      log('Waiting 60 seconds for manual login...');
      await sleep(60000);
    }
    
    // Save auth state
    await context.storageState({ path: 'ghl-auth.json' });
    log('Auth state saved');
    
    // Step 3: Map sidebar
    await mapSidebar(page);
    
    // Step 4: Navigate to workflows
    await navigateToWorkflows(page);
    await sleep(3000);
    
    // Step 5: Map workflow list page
    await mapWorkflowList(page);
    
    // Step 6: Click Create Workflow and map dropdown
    await clickCreateWorkflow(page);
    
    // Step 7: Enter workflow editor
    await enterWorkflowEditor(page);
    
    // Step 8: Explore trigger panel
    await exploreTriggerPanel(page);
    
    // Step 9: Save everything
    await saveUIMap();
    
    log('=== EXPLORATION COMPLETE ===');
    log('Keeping browser open for 2 minutes for manual verification...');
    await sleep(120000);
    
  } catch (error) {
    log('ERROR: ' + error.message);
    await screenshot(page, 'error-state', 'Error occurred');
    await saveUIMap(); // Save what we have
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
