// STEP 2: Workflow Builder Helper
// Paste this into browser console while INSIDE a workflow builder

(function() {
  console.clear();
  console.log('%c=== GHL WORKFLOW BUILDER HELPER ===', 'color: #00ff00; font-size: 16px; font-weight: bold');

  window.GHL = {
    // Helper to wait
    wait: (ms) => new Promise(r => setTimeout(r, ms)),

    // Find and click the + button to add action
    clickAddAction: async function() {
      // Try multiple selectors for the + button
      const selectors = [
        '[data-testid="add-action"]',
        'button[class*="add"]',
        '[class*="AddAction"]',
        '[class*="add-node"]',
        'button:has(svg)',
        '.add-action-btn'
      ];

      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          btn.click();
          console.log('%cClicked add button', 'color: #00ff00');
          return true;
        }
      }

      // Try finding any button with + icon
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerHTML.includes('plus') || btn.textContent.includes('+')) {
          btn.click();
          console.log('%cClicked + button', 'color: #00ff00');
          return true;
        }
      }

      console.log('%cCould not find add button. Look for a + icon on the canvas.', 'color: #ff0000');
      return false;
    },

    // List all visible action options
    listActions: function() {
      const items = document.querySelectorAll('[class*="action"], [class*="menu-item"], [class*="option"], li, [role="menuitem"]');
      console.log('%cVisible action items:', 'color: #ffff00');
      items.forEach((item, i) => {
        const text = item.textContent.trim().substring(0, 50);
        if (text) console.log(`${i}: ${text}`);
      });
    },

    // Click on action by text
    selectAction: async function(searchText) {
      await this.wait(500);
      const items = document.querySelectorAll('[class*="action"], [class*="menu-item"], [class*="option"], li, [role="menuitem"], div[class*="item"]');

      for (const item of items) {
        if (item.textContent.toLowerCase().includes(searchText.toLowerCase())) {
          item.click();
          console.log(`%cSelected: ${item.textContent.trim().substring(0, 30)}`, 'color: #00ff00');
          return true;
        }
      }

      // Also try buttons and links
      const clickables = document.querySelectorAll('button, a, [role="button"]');
      for (const el of clickables) {
        if (el.textContent.toLowerCase().includes(searchText.toLowerCase())) {
          el.click();
          console.log(`%cClicked: ${el.textContent.trim().substring(0, 30)}`, 'color: #00ff00');
          return true;
        }
      }

      console.log(`%cCould not find: ${searchText}`, 'color: #ff0000');
      return false;
    },

    // Add SMS action
    addSMS: async function() {
      console.log('%cAdding SMS action...', 'color: #00ffff');
      await this.clickAddAction();
      await this.wait(1000);
      await this.selectAction('SMS');
      await this.wait(500);
      await this.selectAction('Send SMS');
    },

    // Add Email action
    addEmail: async function() {
      console.log('%cAdding Email action...', 'color: #00ffff');
      await this.clickAddAction();
      await this.wait(1000);
      await this.selectAction('Email');
      await this.wait(500);
      await this.selectAction('Send Email');
    },

    // Add Wait/Delay action
    addWait: async function() {
      console.log('%cAdding Wait action...', 'color: #00ffff');
      await this.clickAddAction();
      await this.wait(1000);
      await this.selectAction('Wait');
    },

    // Add Tag action
    addTag: async function() {
      console.log('%cAdding Tag action...', 'color: #00ffff');
      await this.clickAddAction();
      await this.wait(1000);
      await this.selectAction('Tag');
      await this.wait(500);
      await this.selectAction('Add Tag');
    },

    // Click Save/Publish
    save: async function() {
      const saveBtn = document.querySelector('button:has-text("Save"), button:has-text("Publish"), [class*="save"]');
      if (saveBtn) {
        saveBtn.click();
        console.log('%cSaved!', 'color: #00ff00');
      } else {
        // Try finding by text
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Save') || btn.textContent.includes('Publish')) {
            btn.click();
            console.log('%cSaved!', 'color: #00ff00');
            return;
          }
        }
        console.log('%cCould not find save button', 'color: #ff0000');
      }
    },

    // Describe current page structure
    describe: function() {
      console.log('%c=== PAGE STRUCTURE ===', 'color: #ffff00; font-weight: bold');

      // Find main containers
      const canvas = document.querySelector('[class*="canvas"], [class*="workflow"], [class*="builder"]');
      if (canvas) {
        console.log('Canvas found:', canvas.className);
      }

      // Find nodes/blocks
      const nodes = document.querySelectorAll('[class*="node"], [class*="block"], [class*="action"]');
      console.log(`Found ${nodes.length} nodes/blocks`);

      // Find buttons
      const buttons = document.querySelectorAll('button');
      console.log(`Found ${buttons.length} buttons`);
      buttons.forEach((btn, i) => {
        const text = btn.textContent.trim().substring(0, 30);
        if (text) console.log(`  Button ${i}: ${text}`);
      });

      // Find any + or add icons
      const addIcons = document.querySelectorAll('[class*="add"], [class*="plus"]');
      console.log(`Found ${addIcons.length} add/plus elements`);
    }
  };

  console.log('%c\nAvailable commands:', 'color: #00ffff; font-weight: bold');
  console.log('  GHL.describe()     - Show page structure');
  console.log('  GHL.listActions()  - List visible actions');
  console.log('  GHL.addSMS()       - Add SMS action');
  console.log('  GHL.addEmail()     - Add Email action');
  console.log('  GHL.addWait()      - Add Wait/Delay action');
  console.log('  GHL.addTag()       - Add Tag action');
  console.log('  GHL.save()         - Save workflow');
  console.log('');
  console.log('%cTip: Run GHL.describe() first to see what\'s on the page', 'color: #888');
})();
