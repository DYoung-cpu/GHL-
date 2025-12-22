/**
 * Test Full Workflow Creation
 * Creates a workflow, adds trigger, adds action, and publishes
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  locationId: 'peE6XmGYBb1xV0iNbh6C'
};

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'
  });
  const page = await context.newPage();

  console.log('1. Navigating to workflows...');
  await page.goto(`https://app.gohighlevel.com/v2/location/${CONFIG.locationId}/automation/workflows`);
  await new Promise(r => setTimeout(r, 8000));

  const frame = page.frame({ url: /automation-workflows/ });
  if (!frame) {
    console.log('ERROR: Frame not found');
    await browser.close();
    return;
  }
  console.log('   Frame found');

  // Step 2: Click Create Workflow
  console.log('2. Creating new workflow...');
  await frame.locator('button:has-text("Create Workflow")').click();
  await new Promise(r => setTimeout(r, 1500));

  // Step 3: Click Start from Scratch
  await frame.locator('text=Start from Scratch').click();
  await new Promise(r => setTimeout(r, 6000));
  console.log('   Editor opened');

  // Take screenshot of editor
  await page.screenshot({ path: 'screenshots/editor-opened.png' });

  // Step 4: Look for Add Trigger element
  console.log('3. Looking for Add Trigger...');

  // The editor might be in a new frame or same frame
  let editorFrame = page.frame({ url: /automation-workflows/ });
  if (!editorFrame) {
    console.log('   Trying to find new frame...');
    await new Promise(r => setTimeout(r, 2000));
    editorFrame = page.frame({ url: /automation/ });
  }

  if (editorFrame) {
    // Try to find Add Trigger
    const addTriggerLocator = editorFrame.locator('text=Add Trigger');
    const count = await addTriggerLocator.count();
    console.log(`   Found ${count} "Add Trigger" elements`);

    if (count > 0) {
      console.log('4. Clicking Add Trigger...');
      await addTriggerLocator.first().click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'screenshots/trigger-panel.png' });
      console.log('   Trigger panel opened');

      // Look for Contact Tag trigger
      console.log('5. Searching for Contact Tag trigger...');
      const searchInput = editorFrame.locator('input[placeholder*="Search"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('Contact Tag');
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: 'screenshots/trigger-search.png' });

        // Click the Contact Tag option
        const contactTagOption = editorFrame.locator('text=Contact Tag').first();
        if (await contactTagOption.count() > 0) {
          await contactTagOption.click();
          await new Promise(r => setTimeout(r, 2000));
          await page.screenshot({ path: 'screenshots/trigger-selected.png' });
          console.log('   Contact Tag trigger selected');

          // Look for Save Trigger button
          console.log('6. Looking for Save Trigger...');
          const saveTrigger = editorFrame.locator('button:has-text("Save Trigger")');
          if (await saveTrigger.count() > 0) {
            await saveTrigger.click();
            await new Promise(r => setTimeout(r, 2000));
            console.log('   Trigger saved!');
          } else {
            console.log('   Save Trigger button not found');
          }
        }
      }
    }

    // Look for Add Action (+ button)
    console.log('7. Looking for Add Action...');
    await page.screenshot({ path: 'screenshots/after-trigger.png' });

    // Try different selectors for the + button
    const plusButtons = [
      editorFrame.locator('button:has-text("+")'),
      editorFrame.locator('[data-testid*="add"]'),
      editorFrame.locator('text=Add Action'),
      editorFrame.locator('.add-action')
    ];

    for (const btn of plusButtons) {
      const c = await btn.count();
      if (c > 0) {
        console.log(`   Found ${c} potential add action buttons`);
        break;
      }
    }
  }

  // Map editor elements for future reference
  console.log('\n8. Mapping editor elements...');
  try {
    const elements = await editorFrame.evaluate(() => {
      const results = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el.innerText || el.textContent || '').trim().split('\n')[0].substring(0, 50);
        const rect = el.getBoundingClientRect();
        if (text && rect.width > 10 && rect.height > 10 && rect.width < 400 && rect.height < 100) {
          results.push({ text, x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) });
        }
      });
      const seen = new Set();
      return results.filter(e => {
        if (seen.has(e.text)) return false;
        seen.add(e.text);
        return true;
      }).slice(0, 50);
    });

    console.log('\nEditor Elements Found:');
    elements.forEach(e => {
      if (['Back', 'Trigger', 'Action', 'Add', 'Save', 'Publish', 'Draft', 'Test'].some(k => e.text.includes(k))) {
        console.log(`  "${e.text}": (${e.x}, ${e.y})`);
      }
    });
  } catch (e) {
    console.log('   Could not map elements:', e.message);
  }

  console.log('\nTest complete! Check screenshots folder.');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

main().catch(console.error);
