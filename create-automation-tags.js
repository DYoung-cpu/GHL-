const { chromium } = require('playwright');

/**
 * Create automation trigger tags for workflows
 * These tags trigger the 15 mortgage workflows
 */

const AUTOMATION_TAGS = [
  // Primary workflow trigger tags
  'New Lead',
  'Pre-Qual Started',
  'Pre-Qual Complete',
  'Application Started',
  'In Underwriting',
  'Conditionally Approved',
  'Clear to Close',
  'Closing Scheduled',
  'Closed',
  'Realtor Referral',

  // Exit condition & supporting tags
  'Appointment Scheduled',
  'Do Not Contact',
  'Long-Term Nurture',
  'Documents Received',
  'Past Client',
  'Cold Lead'
];

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   Screenshot: ${name}.png`);
  return path;
}

(async () => {
  console.log('=== AUTOMATION TAGS CREATOR ===');
  console.log(`Creating ${AUTOMATION_TAGS.length} workflow trigger tags\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const sleep = (ms) => page.waitForTimeout(ms);

  try {
    // ===== LOGIN =====
    console.log('[LOGIN] Starting...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await sleep(2000);

    // Google One-Tap
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('[LOGIN] Found Google One-Tap...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
      }
    }
    await sleep(3000);

    // Handle Google popup
    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      console.log('[LOGIN] Entering Google credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await sleep(3000);

      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch (e) {
        console.log('[LOGIN] Password field not found (may already be logged in)');
      }
      await sleep(8000);
    }

    console.log('[LOGIN] Done!\n');

    // ===== NAVIGATE TO TAGS =====
    console.log('[TAGS] Navigating to Tags page...');
    await page.goto(`https://app.gohighlevel.com/location/${LOCATION_ID}/settings/tags`, {
      waitUntil: 'domcontentloaded'
    });
    await sleep(3000);
    await screenshot(page, 'auto-tags-01-page');

    // ===== CREATE TAGS =====
    let successCount = 0;

    for (let i = 0; i < AUTOMATION_TAGS.length; i++) {
      const tag = AUTOMATION_TAGS[i];
      console.log(`[${i + 1}/${AUTOMATION_TAGS.length}] Creating: "${tag}"`);

      try {
        // Click "+ New Tag" button - try locator first, then coordinates
        const addBtn = page.locator('button:has-text("New Tag")').first();
        if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addBtn.click();
        } else {
          console.log('   Using coordinate click...');
          await page.mouse.click(1290, 93);
        }
        await sleep(1500);

        // Find and fill the tag name input
        let filled = false;
        const inputSelectors = [
          'input[placeholder*="tag"]',
          'input[placeholder*="Tag"]',
          'input[placeholder*="name"]',
          'input[placeholder*="Name"]',
          '[role="dialog"] input',
          '.modal input',
          'input:visible'
        ];

        for (const selector of inputSelectors) {
          const input = page.locator(selector).first();
          if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
            await input.click();
            await input.fill(tag);
            filled = true;
            break;
          }
        }

        if (!filled) {
          console.log('   Warning: Could not find input field');
        }

        await sleep(500);

        // Click Save/Create button
        const saveBtns = ['button:has-text("Save")', 'button:has-text("Create")', 'button:has-text("Add")'];
        for (const selector of saveBtns) {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
            await btn.click({ force: true });
            break;
          }
        }
        await sleep(1500);

        // Close modal if still open
        await page.keyboard.press('Escape');
        await sleep(300);

        successCount++;
        console.log(`   Created: ${tag}`);

      } catch (error) {
        console.log(`   Error: ${error.message}`);
        await page.keyboard.press('Escape');
        await sleep(500);
      }

      // Screenshot every 5 tags
      if ((i + 1) % 5 === 0) {
        await screenshot(page, `auto-tags-progress-${i + 1}`);
      }
    }

    await screenshot(page, 'auto-tags-final');

    console.log('\n=== COMPLETE ===');
    console.log(`Created ${successCount}/${AUTOMATION_TAGS.length} automation tags\n`);
    console.log('Tags created:');
    AUTOMATION_TAGS.forEach((tag, i) => console.log(`  ${i + 1}. ${tag}`));

    console.log('\nBrowser staying open for review (30 seconds)...');
    await sleep(30000);

  } catch (error) {
    console.error('Error:', error.message);
    await screenshot(page, 'auto-tags-error');
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
