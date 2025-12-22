/**
 * GHL Workflow Automation Helper
 * Uses frame locators for reliable interaction with GHL's iframe-based UI
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  email: 'david@lendwisemtg.com',
  password: 'Fafa2185!',
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

// Estimated coordinates (fallback if locators fail)
const COORDS = {
  login: {
    googleButton: { x: 960, y: 564 }
  },
  editor: {
    backToWorkflows: { x: 88, y: 21 },
    builder: { x: 579, y: 59 },
    settings: { x: 645, y: 59 },
    enrollmentHistory: { x: 740, y: 59 },
    executionLogs: { x: 853, y: 59 },
    testWorkflow: { x: 1271, y: 59 },
    draft: { x: 1343, y: 59 },
    publish: { x: 1414, y: 59 }
  }
};

class GHLAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.frame = null;
  }

  async init() {
    this.browser = await chromium.launch({ headless: false });
    this.context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: fs.existsSync('ghl-auth.json') ? 'ghl-auth.json' : undefined
    });
    this.page = await this.context.newPage();
  }

  async login() {
    await this.page.goto('https://app.gohighlevel.com/');
    await this.sleep(5000);

    const content = await this.page.content();
    if (!content.includes('Sign into your account')) {
      console.log('Already logged in');
      return true;
    }

    console.log('Logging in with Google...');
    await this.page.mouse.click(COORDS.login.googleButton.x, COORDS.login.googleButton.y);
    await this.sleep(3000);

    // Handle Google popup
    let googlePage = null;
    for (let i = 0; i < 15; i++) {
      for (const p of this.context.pages()) {
        if (p.url().includes('accounts.google.com') && !p.url().includes('gsi/button')) {
          googlePage = p;
          break;
        }
      }
      if (googlePage) break;
      await this.sleep(1000);
    }

    if (!googlePage) return false;

    await googlePage.bringToFront();
    await this.sleep(2000);

    try {
      await googlePage.locator('input[type="email"]').fill(CONFIG.email);
      await googlePage.locator('#identifierNext button').click();
      await this.sleep(4000);
    } catch (e) {}

    try {
      await googlePage.locator('input[type="password"]').fill(CONFIG.password);
      await googlePage.locator('#passwordNext button').click();
      await this.sleep(5000);
    } catch (e) {}

    await this.sleep(3000);
    await this.page.bringToFront();
    return true;
  }

  async goToWorkflows() {
    await this.page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
    await this.sleep(8000);
    this.frame = this.page.frame({ url: /automation-workflows/ });
    return !!this.frame;
  }

  async createWorkflow(name = 'New Workflow') {
    if (!this.frame) throw new Error('Not on workflows page');

    // Click Create Workflow
    await this.frame.locator('button:has-text("Create Workflow")').click();
    await this.sleep(1500);

    // Click Start from Scratch
    await this.frame.locator('text=Start from Scratch').click();
    await this.sleep(5000);

    // Rename workflow if name provided
    if (name !== 'New Workflow') {
      await this.frame.locator('text=Workflow').first().click();
      await this.sleep(500);
      // Type new name
      await this.page.keyboard.selectAll();
      await this.page.keyboard.type(name);
      await this.page.keyboard.press('Enter');
      await this.sleep(1000);
    }

    return true;
  }

  async addTrigger(triggerName) {
    if (!this.frame) throw new Error('Not in editor');

    // Click Add Trigger
    const addTrigger = this.frame.locator('text=Add Trigger').first();
    if (await addTrigger.count() > 0) {
      await addTrigger.click();
      await this.sleep(2000);

      // Search and select trigger
      const searchInput = this.frame.locator('input[placeholder*="Search"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill(triggerName);
        await this.sleep(1000);
      }

      // Click the trigger option
      await this.frame.locator(`text=${triggerName}`).first().click();
      await this.sleep(2000);

      return true;
    }
    return false;
  }

  async saveTrigger() {
    const saveBtn = this.frame.locator('button:has-text("Save Trigger")');
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      await this.sleep(2000);
      return true;
    }
    return false;
  }

  async publishWorkflow() {
    const publishBtn = this.frame.locator('text=Publish');
    if (await publishBtn.count() > 0) {
      await publishBtn.click();
      await this.sleep(2000);
      return true;
    }
    return false;
  }

  async backToWorkflows() {
    const backBtn = this.frame.locator('text=Back to Workflows');
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await this.sleep(3000);
      return true;
    }
    return false;
  }

  async saveAuth() {
    await this.context.storageState({ path: 'ghl-auth.json' });
  }

  async screenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// Export for use in other scripts
module.exports = { GHLAutomation, CONFIG, COORDS };

// Test if run directly
if (require.main === module) {
  (async () => {
    const ghl = new GHLAutomation();
    try {
      await ghl.init();
      await ghl.login();
      await ghl.goToWorkflows();
      await ghl.screenshot('test-workflows');
      await ghl.createWorkflow('Test Automation');
      await ghl.screenshot('test-editor');
      console.log('Test complete!');
      await ghl.saveAuth();
    } catch (e) {
      console.error('Error:', e.message);
    } finally {
      await ghl.close();
    }
  })();
}
