/**
 * Verify Transfer via GHL API
 * Captures auth token and queries API endpoints
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

(async () => {
  console.log('='.repeat(60));
  console.log('  Verify Transfer via GHL API');
  console.log('='.repeat(60));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Capture API responses
  const apiData = {
    workflows: [],
    customFields: [],
    tags: [],
    pipelines: [],
    calendars: [],
    templates: []
  };

  // Listen for API responses
  page.on('response', async (response) => {
    const url = response.url();
    try {
      if (url.includes('/workflows') && response.status() === 200) {
        const data = await response.json().catch(() => null);
        if (data) apiData.workflows.push(data);
      }
      if (url.includes('/custom-fields') && response.status() === 200) {
        const data = await response.json().catch(() => null);
        if (data) apiData.customFields.push(data);
      }
      if (url.includes('/tags') && response.status() === 200) {
        const data = await response.json().catch(() => null);
        if (data) apiData.tags.push(data);
      }
      if (url.includes('/pipelines') && response.status() === 200) {
        const data = await response.json().catch(() => null);
        if (data) apiData.pipelines.push(data);
      }
    } catch (e) {}
  });

  try {
    // === LOGIN ===
    console.log('📍 Logging into GHL...');
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
      await page.waitForTimeout(8000);
    }

    console.log('✅ Logged in!\n');

    // === SWITCH TO MISSION CONTROL ===
    console.log('📍 Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await page.waitForTimeout(4000);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('✅ In Mission Control\n');

    // === NAVIGATE TO EACH SECTION TO TRIGGER API CALLS ===

    // Workflows
    console.log('📍 Fetching Workflows...');
    await page.click('text=Automation');
    await page.waitForTimeout(5000);

    // Custom Fields
    console.log('📍 Fetching Custom Fields...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/custom_fields`);
    await page.waitForTimeout(5000);

    // Tags
    console.log('📍 Fetching Tags...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/tags`);
    await page.waitForTimeout(5000);

    // Pipelines
    console.log('📍 Fetching Pipelines...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/opportunities/list`);
    await page.waitForTimeout(5000);

    // === USE PAGE CONTEXT TO MAKE DIRECT API CALLS ===
    console.log('\n📍 Making direct API calls...');

    const results = await page.evaluate(async (locationId) => {
      const baseUrl = 'https://services.leadconnectorhq.com';
      const results = {};

      // Get auth token from page context
      const getAuthHeaders = () => {
        // Try to get token from various sources
        const token = localStorage.getItem('hl_sso_token') ||
                     localStorage.getItem('token') ||
                     document.cookie.split(';').find(c => c.includes('token'))?.split('=')[1];
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        };
      };

      try {
        // Fetch workflows
        const workflowsRes = await fetch(`${baseUrl}/workflows/?locationId=${locationId}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (workflowsRes.ok) {
          results.workflows = await workflowsRes.json();
        }
      } catch (e) {
        results.workflowsError = e.message;
      }

      try {
        // Fetch custom fields
        const fieldsRes = await fetch(`${baseUrl}/locations/${locationId}/customFields`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (fieldsRes.ok) {
          results.customFields = await fieldsRes.json();
        }
      } catch (e) {
        results.customFieldsError = e.message;
      }

      try {
        // Fetch tags
        const tagsRes = await fetch(`${baseUrl}/locations/${locationId}/tags`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (tagsRes.ok) {
          results.tags = await tagsRes.json();
        }
      } catch (e) {
        results.tagsError = e.message;
      }

      try {
        // Fetch pipelines
        const pipelinesRes = await fetch(`${baseUrl}/opportunities/pipelines?locationId=${locationId}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (pipelinesRes.ok) {
          results.pipelines = await pipelinesRes.json();
        }
      } catch (e) {
        results.pipelinesError = e.message;
      }

      return results;
    }, MISSION_CONTROL_ID);

    // === DISPLAY RESULTS ===
    console.log('\n' + '='.repeat(60));
    console.log('  VERIFICATION RESULTS');
    console.log('='.repeat(60));

    if (results.workflows?.workflows) {
      console.log(`\n📋 WORKFLOWS: ${results.workflows.workflows.length} found`);
      results.workflows.workflows.forEach(w => {
        console.log(`   - ${w.name} (${w.status || 'draft'})`);
      });
    } else {
      console.log('\n📋 WORKFLOWS: Could not fetch via API');
    }

    if (results.customFields?.customFields) {
      console.log(`\n📋 CUSTOM FIELDS: ${results.customFields.customFields.length} found`);
    } else {
      console.log('\n📋 CUSTOM FIELDS: Could not fetch via API');
    }

    if (results.tags?.tags) {
      console.log(`\n📋 TAGS: ${results.tags.tags.length} found`);
      results.tags.tags.forEach(t => {
        console.log(`   - ${t.name}`);
      });
    } else {
      console.log('\n📋 TAGS: Could not fetch via API');
    }

    if (results.pipelines?.pipelines) {
      console.log(`\n📋 PIPELINES: ${results.pipelines.pipelines.length} found`);
      results.pipelines.pipelines.forEach(p => {
        console.log(`   - ${p.name} (${p.stages?.length || 0} stages)`);
      });
    } else {
      console.log('\n📋 PIPELINES: Could not fetch via API');
    }

    // === SCRAPE FROM PAGE ===
    console.log('\n📍 Scraping data from pages...');

    // Go to workflows and scrape
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/list`);
    await page.waitForTimeout(5000);

    const pageWorkflows = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const workflows = [];
      rows.forEach(row => {
        const nameCell = row.querySelector('td:first-child');
        if (nameCell && nameCell.textContent.trim()) {
          workflows.push(nameCell.textContent.trim());
        }
      });
      return workflows;
    });

    console.log(`\n📋 WORKFLOWS (from page): ${pageWorkflows.length} found`);
    pageWorkflows.forEach(w => console.log(`   - ${w}`));

    // Go to tags and scrape
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/tags`);
    await page.waitForTimeout(3000);

    const pageTags = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const tags = [];
      rows.forEach(row => {
        const nameCell = row.querySelector('td:first-child');
        if (nameCell && nameCell.textContent.trim()) {
          tags.push(nameCell.textContent.trim());
        }
      });
      return tags;
    });

    console.log(`\n📋 TAGS (from page): ${pageTags.length} found`);
    pageTags.forEach(t => console.log(`   - ${t}`));

    // Go to custom fields and scrape
    await page.goto(`https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/settings/custom_fields`);
    await page.waitForTimeout(3000);

    const pageFields = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="field"], tr, [class*="item"]');
      return items.length;
    });

    console.log(`\n📋 CUSTOM FIELDS (from page): ~${pageFields} elements found`);

    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      locationId: MISSION_CONTROL_ID,
      workflows: pageWorkflows,
      tags: pageTags,
      customFieldElements: pageFields,
      apiResults: results
    };

    fs.writeFileSync('./verification-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Report saved to verification-report.json');

    console.log('\n' + '='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('\nBrowser closing in 30 seconds...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();
