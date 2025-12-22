const { chromium } = require('playwright');

// Script to create tags for mortgage CRM
// Tags are created in Settings > Tags

const TAGS = [
  // Lead Source Tags
  'source_zillow',
  'source_realtor_com',
  'source_referral',
  'source_website',
  'source_social',
  'source_cold_call',
  'source_google_ads',
  'source_facebook',

  // Loan Type Tags
  'loan_conventional',
  'loan_fha',
  'loan_va',
  'loan_usda',
  'loan_jumbo',
  'loan_refinance',
  'loan_cashout',
  'loan_heloc',

  // Status Tags
  'status_hot_lead',
  'status_warm_lead',
  'status_cold_lead',
  'status_pre_qualified',
  'status_pre_approved',
  'status_in_processing',
  'status_funded',
  'status_lost',
  'status_nurture',

  // Property Tags
  'prop_single_family',
  'prop_condo',
  'prop_townhouse',
  'prop_multi_family',
  'prop_investment',

  // Buyer Type Tags
  'buyer_first_time',
  'buyer_move_up',
  'buyer_investor',
  'buyer_refinance',
  'buyer_veteran'
];

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('🏷️  GHL Tags Creator');
  console.log('='.repeat(50));
  console.log(`Creating ${TAGS.length} mortgage-related tags\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ===== LOGIN =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try Google One-Tap first (iframe in corner)
    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      console.log('   Found Google One-Tap iframe...');
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   Clicked Google One-Tap button');
      }
    } else {
      // Fallback to Sign in with Google button
      const googleBtn = page.locator('text=Sign in with Google');
      if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   Clicking Sign in with Google button...');
        await googleBtn.click();
      }
    }
    await page.waitForTimeout(3000);

    // Handle Google popup
    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering Google credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      // Wait for password field
      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    // Wait for dashboard to load - verify we're actually logged in
    const loggedIn = await page.waitForSelector('text=LENDWISE', { timeout: 30000 }).catch(() => null);
    if (!loggedIn) {
      console.log('   ⚠️ Login may not have completed, checking page...');
      await screenshot(page, 'tags-login-check');
    }
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE MORTGA').click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO TAGS =====
    console.log('📍 Navigating to Tags...');

    // Try direct URL
    await page.goto('https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/settings/tags', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await screenshot(page, 'tags-01-page');
    console.log('✅ On Tags page!\n');

    // ===== CREATE TAGS =====
    let successCount = 0;

    for (let i = 0; i < TAGS.length; i++) {
      const tag = TAGS[i];
      console.log(`📍 Creating tag ${i + 1}/${TAGS.length}: "${tag}"`);

      try {
        // Click "+ New Tag" button using coordinates (top right corner ~1290, 93)
        // First try locator, then fallback to coordinates
        const addBtn = page.locator('button:has-text("New Tag")').first();
        if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addBtn.click();
        } else {
          // Fallback to coordinate click - button is top right
          console.log('   Using coordinate click for New Tag button...');
          await page.mouse.click(1290, 93);
        }
        await page.waitForTimeout(1500);

        // Wait for modal and find any visible input
        await page.waitForTimeout(500);

        // Try multiple selectors for the tag name input
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
          console.log('   ⚠️ Could not find input field');
        }

        await page.waitForTimeout(500);

        // Click Save/Create button in modal - try multiple approaches
        const saveBtns = ['button:has-text("Save")', 'button:has-text("Create")', 'button:has-text("Add")'];
        for (const selector of saveBtns) {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
            await btn.click({ force: true });
            break;
          }
        }
        await page.waitForTimeout(1500);

        // Close modal if still open
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        successCount++;
        console.log(`   ✅ Created: ${tag}`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Screenshot every 10 tags
      if ((i + 1) % 10 === 0) {
        await screenshot(page, `tags-progress-${i + 1}`);
      }
    }

    await screenshot(page, 'tags-final');

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Created ${successCount}/${TAGS.length} tags`);
    console.log('Browser staying open for 20 seconds...\n');

    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'tags-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
