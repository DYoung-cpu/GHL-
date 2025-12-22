/**
 * Complete Workflow Builder
 * Creates workflows with triggers and actions using frame locators
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

// Workflow definitions from templates
const WORKFLOWS = [
  {
    name: 'New Lead Nurture Sequence',
    trigger: { type: 'Contact Tag', value: 'New Lead' },
    actions: [
      { type: 'Send SMS', template: 'New Lead - Initial Contact' },
      { type: 'Wait', delay: '5 minutes' },
      { type: 'Send Email', template: 'New Lead - Welcome Email' }
    ]
  },
  {
    name: 'Application Process Updates',
    trigger: { type: 'Contact Tag', value: 'Application Started' },
    actions: [
      { type: 'Send SMS', template: 'Application - Received Confirmation' },
      { type: 'Send Email', template: 'Application - Next Steps Email' }
    ]
  }
];

class WorkflowBuilder {
  constructor(page) {
    this.page = page;
    this.frame = null;
  }

  async getFrame() {
    this.frame = this.page.frame({ url: /automation-workflows/ });
    return this.frame;
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async screenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async navigateToWorkflows() {
    console.log('Navigating to workflows...');
    await this.page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
    await this.sleep(8000);
    await this.getFrame();
    return !!this.frame;
  }

  async createNewWorkflow() {
    console.log('Creating new workflow...');
    await this.frame.locator('button:has-text("Create Workflow")').click();
    await this.sleep(1500);
    await this.frame.locator('text=Start from Scratch').click();
    await this.sleep(6000);
    // Refresh frame reference after navigation
    await this.getFrame();
    return true;
  }

  async renameWorkflow(newName) {
    console.log(`Renaming to: ${newName}`);
    // Click on the workflow name (pencil icon area)
    const nameElement = this.frame.locator('text=New Workflow').first();
    if (await nameElement.count() > 0) {
      await nameElement.click();
      await this.sleep(500);
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(newName);
      await this.page.keyboard.press('Enter');
      await this.sleep(1000);
    }
    return true;
  }

  async addTrigger(triggerType, triggerValue) {
    console.log(`Adding trigger: ${triggerType} = ${triggerValue}`);

    // Click Add New Trigger
    const addTrigger = this.frame.locator('text=Add New Trigger');
    if (await addTrigger.count() > 0) {
      await addTrigger.click();
      await this.sleep(2000);
      await this.screenshot('trigger-panel');

      // Search for trigger type
      const searchInput = this.frame.locator('input[placeholder*="Search"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill(triggerType);
        await this.sleep(1500);
      }

      // Click the trigger option
      const triggerOption = this.frame.locator(`text=${triggerType}`).first();
      if (await triggerOption.count() > 0) {
        await triggerOption.click();
        await this.sleep(2000);
        await this.screenshot('trigger-selected');

        // If it's a Contact Tag trigger, we need to select the tag
        if (triggerType === 'Contact Tag' && triggerValue) {
          await this.configureContactTagTrigger(triggerValue);
        }

        // Save the trigger
        const saveTrigger = this.frame.locator('button:has-text("Save Trigger")');
        if (await saveTrigger.count() > 0) {
          await saveTrigger.click();
          await this.sleep(2000);
          console.log('   Trigger saved!');
          return true;
        }
      }
    }
    return false;
  }

  async configureContactTagTrigger(tagName) {
    console.log(`   Configuring tag: ${tagName}`);

    // Look for tag dropdown/input
    const tagInput = this.frame.locator('input[placeholder*="tag"], input[placeholder*="Tag"]').first();
    if (await tagInput.count() > 0) {
      await tagInput.click();
      await this.sleep(500);
      await tagInput.fill(tagName);
      await this.sleep(1000);

      // Click the matching tag in dropdown
      const tagOption = this.frame.locator(`text=${tagName}`).first();
      if (await tagOption.count() > 0) {
        await tagOption.click();
        await this.sleep(500);
      }
    }
  }

  async addAction(actionType, templateName) {
    console.log(`Adding action: ${actionType}`);

    // Click the + button to add action
    const plusButton = this.frame.locator('button:has(svg), [class*="add"]').filter({ hasText: '+' }).first();
    // Or look for a different selector
    const addActionBtn = this.frame.locator('[data-testid*="add"], .add-action-btn').first();

    // Try clicking the visual + in the workflow
    // The + is typically between trigger and END
    await this.frame.locator('text=+').first().click().catch(() => {});
    await this.sleep(2000);
    await this.screenshot('action-panel');

    // Search for action
    const searchInput = this.frame.locator('input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill(actionType);
      await this.sleep(1000);

      // Click the action option
      const actionOption = this.frame.locator(`text=${actionType}`).first();
      if (await actionOption.count() > 0) {
        await actionOption.click();
        await this.sleep(2000);

        // Configure action based on type
        if (actionType.includes('SMS') || actionType.includes('Email')) {
          await this.configureMessageAction(templateName);
        }

        // Save action
        const saveAction = this.frame.locator('button:has-text("Save Action")');
        if (await saveAction.count() > 0) {
          await saveAction.click();
          await this.sleep(2000);
          console.log('   Action saved!');
          return true;
        }
      }
    }
    return false;
  }

  async configureMessageAction(templateName) {
    console.log(`   Looking for template: ${templateName}`);
    // This will need to be customized based on GHL's action config UI
    // For now, just take a screenshot
    await this.screenshot('action-config');
  }

  async publishWorkflow() {
    console.log('Publishing workflow...');
    const publishBtn = this.frame.locator('text=Publish').last();
    if (await publishBtn.count() > 0) {
      await publishBtn.click();
      await this.sleep(2000);
      console.log('   Published!');
      return true;
    }
    return false;
  }

  async backToWorkflows() {
    console.log('Going back to workflows list...');
    const backBtn = this.frame.locator('text=Back to Workflows');
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await this.sleep(3000);
      return true;
    }
    return false;
  }

  async buildWorkflow(workflow) {
    console.log(`\n=== Building: ${workflow.name} ===`);

    await this.createNewWorkflow();
    await this.renameWorkflow(workflow.name);

    if (workflow.trigger) {
      await this.addTrigger(workflow.trigger.type, workflow.trigger.value);
    }

    // Note: Adding multiple actions would require navigating the action chain
    // For now, we'll just add the trigger and save

    await this.screenshot(`workflow-${workflow.name.replace(/\s+/g, '-')}`);
    await this.backToWorkflows();
    await this.sleep(3000);
    await this.getFrame();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  const builder = new WorkflowBuilder(page);

  try {
    if (!await builder.navigateToWorkflows()) {
      throw new Error('Failed to navigate to workflows');
    }

    // Build just the first workflow as a test
    await builder.buildWorkflow(WORKFLOWS[0]);

    console.log('\n=== Test Complete ===');
    await builder.screenshot('final-state');

  } catch (e) {
    console.error('Error:', e.message);
    await builder.screenshot('error-state');
  } finally {
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

main().catch(console.error);
