/**
 * Simple Verification - Screenshots and text scraping
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  const dir = './screenshots/verify';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${String(ssNum).padStart(2,'0')}-${name}.png` });
  console.log(`   📸 ${name}`);
}

(async () => {
  console.log('='.repeat(60));
  console.log('  Simple Verification');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    // === LOGIN ===
    console.log('\n📍 Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    console.log('✅ Logged in!');

    // === SWITCH TO MISSION CONTROL ===
    console.log('\n📍 Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await page.waitForTimeout(5000);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('✅ In Mission Control');

    // === CHECK WORKFLOWS ===
    console.log('\n📍 Checking Workflows...');
    await page.click('text=Automation').catch(() => {});
    await page.waitForTimeout(5000);
    await ss(page, 'workflows-1');

    // Get workflow names from visible page
    let workflowText = await page.locator('body').textContent();

    // Try direct navigation
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/list`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(8000);
    await ss(page, 'workflows-2');

    // Extract workflow names
    const workflowNames = await page.evaluate(() => {
      const names = [];
      // Try various selectors
      document.querySelectorAll('td, [class*="workflow-name"], [class*="name"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 100 && !text.includes('\n')) {
          names.push(text);
        }
      });
      return [...new Set(names)].slice(0, 30);
    });

    console.log(`   Workflows found: ${workflowNames.length}`);
    workflowNames.forEach(n => console.log(`   - ${n}`));

    // === CHECK TAGS ===
    console.log('\n📍 Checking Tags...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/tags`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(5000);
    await ss(page, 'tags');

    const tagNames = await page.evaluate(() => {
      const names = [];
      document.querySelectorAll('td:first-child').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 50) {
          names.push(text);
        }
      });
      return [...new Set(names)];
    });

    console.log(`   Tags found: ${tagNames.length}`);
    tagNames.forEach(n => console.log(`   - ${n}`));

    // === CHECK CUSTOM FIELDS ===
    console.log('\n📍 Checking Custom Fields...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/custom_fields`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(5000);
    await ss(page, 'custom-fields');

    // Look for folder count or field count text
    const fieldInfo = await page.evaluate(() => {
      const text = document.body.textContent;
      const folderMatch = text.match(/(\d+)\s*folder/i);
      const fieldMatch = text.match(/(\d+)\s*field/i);
      return {
        folders: folderMatch ? folderMatch[1] : 'unknown',
        fields: fieldMatch ? fieldMatch[1] : 'unknown',
        pageText: text.substring(0, 2000)
      };
    });

    console.log(`   Custom Fields info: ${fieldInfo.folders} folders, ${fieldInfo.fields} fields`);

    // === CHECK PIPELINES ===
    console.log('\n📍 Checking Pipelines...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/opportunities`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(5000);
    await ss(page, 'pipelines');

    // Look for pipeline names
    const pipelineInfo = await page.evaluate(() => {
      const names = [];
      document.querySelectorAll('[class*="pipeline"], [class*="tab"], select option').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 50) {
          names.push(text);
        }
      });
      return [...new Set(names)].slice(0, 10);
    });

    console.log(`   Pipeline elements: ${pipelineInfo.length}`);
    pipelineInfo.forEach(n => console.log(`   - ${n}`));

    // === CHECK CALENDARS ===
    console.log('\n📍 Checking Calendars...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/calendars`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});
    await page.waitForTimeout(5000);
    await ss(page, 'calendars');

    // === SUMMARY ===
    console.log('\n' + '='.repeat(60));
    console.log('  VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Screenshots saved to: ./screenshots/verify/`);
    console.log('  Review screenshots to confirm content transfer');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
    await ss(page, 'error');
  } finally {
    console.log('\nBrowser open for 60 seconds for manual review...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
