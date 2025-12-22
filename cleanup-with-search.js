/**
 * Cleanup using Search - Find and delete workflows by searching
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

// Workflows to delete - search by partial name
const SEARCH_TERMS = [
  'New Workflow : 1765',  // Will find all 7 placeholder workflows
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('='.repeat(60));
  console.log('  WORKFLOW CLEANUP - Using Search');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  let deleted = 0;

  try {
    // === LOGIN ===
    console.log('\n[1/3] Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await sleep(2000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await sleep(3000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }
    console.log('   Logged in!');

    // === SWITCH TO MISSION CONTROL ===
    console.log('\n[2/3] Switching to Mission Control...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await sleep(2000);
      const mcOption = page.locator('text=Mission Control - David Young').first();
      if (await mcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mcOption.click();
        await sleep(4000);
      }
    }
    await page.keyboard.press('Escape');
    await sleep(1000);
    console.log('   In Mission Control!');

    // === GO TO WORKFLOWS ===
    console.log('\n[3/3] Searching and deleting workflows...');
    await page.goto(
      `https://app.gohighlevel.com/v2/location/${MISSION_CONTROL_ID}/automation/workflows`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await sleep(6000);

    const dir = './screenshots/cleanup';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Find and use the search box
    console.log('   Looking for search box...');

    // The search box is visible in the screenshot - on the right side
    const searchBox = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Found search box!');

      // Search for placeholder workflows
      await searchBox.click();
      await sleep(500);
      await searchBox.fill('New Workflow');
      await sleep(3000);

      await page.screenshot({ path: `${dir}/search-results.png` });
      console.log('   Screenshot saved: search-results.png');

      // Now find all matching rows and delete them
      let keepDeleting = true;
      let attempts = 0;

      while (keepDeleting && attempts < 15) {
        attempts++;

        // Look for any row with "New Workflow" in the visible area
        const rows = page.locator('tr:has-text("New Workflow")');
        const rowCount = await rows.count();

        console.log(`   Found ${rowCount} matching rows`);

        if (rowCount === 0) {
          keepDeleting = false;
          break;
        }

        // Click the kebab menu on the first row
        const firstRow = rows.first();
        await firstRow.hover();
        await sleep(500);

        // Click the three-dot menu (last element in row)
        const kebab = firstRow.locator('button, [class*="menu-trigger"], svg[class*="dots"]').last();
        await kebab.click({ force: true });
        await sleep(1000);

        await page.screenshot({ path: `${dir}/menu-open-${attempts}.png` });

        // Click Delete
        const deleteBtn = page.locator('text=Delete').first();
        if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteBtn.click();
          await sleep(1000);

          // Confirm
          const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Yes"), button:has-text("Confirm")').first();
          if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await confirmBtn.click();
            await sleep(2000);
            console.log(`   Deleted workflow #${deleted + 1}`);
            deleted++;
          }
        }

        await page.keyboard.press('Escape');
        await sleep(1000);
      }
    } else {
      console.log('   Search box not found, trying to find workflows directly...');

      // Try clicking through pages to find placeholder workflows
      for (let pageNum = 1; pageNum <= 4; pageNum++) {
        console.log(`   Checking page ${pageNum}...`);

        // Click page number
        const pageBtn = page.locator(`button:has-text("${pageNum}"), a:has-text("${pageNum}")`).first();
        if (await pageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await pageBtn.click();
          await sleep(3000);
        }

        await page.screenshot({ path: `${dir}/page-${pageNum}.png` });

        // Look for "New Workflow :" on this page
        const placeholderRows = page.locator('tr:has-text("New Workflow :")');
        const count = await placeholderRows.count();

        console.log(`   Found ${count} placeholder workflows on page ${pageNum}`);

        for (let i = 0; i < count; i++) {
          const row = placeholderRows.nth(i);
          await row.hover();
          await sleep(300);

          // Click kebab
          const kebab = row.locator('[class*="menu"], button').last();
          await kebab.click({ force: true });
          await sleep(800);

          // Delete
          const deleteBtn = page.locator('text=Delete').first();
          if (await deleteBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await deleteBtn.click();
            await sleep(800);

            const confirmBtn = page.locator('button:has-text("Delete")').first();
            if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await confirmBtn.click();
              await sleep(1500);
              console.log(`   Deleted!`);
              deleted++;
            }
          }

          await page.keyboard.press('Escape');
          await sleep(500);
        }
      }
    }

    await page.screenshot({ path: `${dir}/final-state.png` });

    console.log('\n' + '='.repeat(60));
    console.log(`  DELETED: ${deleted} workflows`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\nError:', err.message);
  } finally {
    console.log('\nBrowser staying open for manual cleanup...');
    console.log('Delete any remaining workflows manually, then close browser.');
    await sleep(120000);
    await browser.close();
  }
})();
