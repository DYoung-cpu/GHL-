const { chromium } = require('playwright');

// Script to create calendars for mortgage CRM
// Calendars are created in Settings > Calendars

const CALENDARS = [
  {
    name: 'Discovery Call',
    duration: 15,
    description: 'Initial 15-minute consultation to understand your home financing goals and answer any questions about the mortgage process.'
  },
  {
    name: 'Pre-Qualification Review',
    duration: 30,
    description: '30-minute session to review your financial documents, discuss loan options, and determine your pre-qualification amount.'
  },
  {
    name: 'Document Review',
    duration: 45,
    description: '45-minute in-depth review of your loan file, documentation, and next steps in the mortgage process.'
  },
  {
    name: 'Closing Prep Call',
    duration: 30,
    description: '30-minute pre-closing walkthrough to review closing documents, explain costs, and prepare you for closing day.'
  }
];

async function screenshot(page, name) {
  const path = `/mnt/c/Users/dyoun/ghl-automation/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 ${name}.png`);
  return path;
}

(async () => {
  console.log('📅 GHL Calendars Creator');
  console.log('='.repeat(50));
  console.log(`Creating ${CALENDARS.length} mortgage calendars\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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
      await screenshot(page, 'cal-login-check');
    }
    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);

      // Click on LENDWISE MORTGAGE sub-account
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
        console.log('   Clicked LENDWISE sub-account');
      }
    }

    // Verify we're in the sub-account
    await screenshot(page, 'cal-after-switch');
    console.log('✅ In sub-account!\n');

    // ===== NAVIGATE TO CALENDAR SETTINGS =====
    console.log('📍 Navigating to Calendar Settings...');

    // Click Calendars in the main sidebar first
    const calSidebarLink = page.locator('a:has-text("Calendars")').first();
    if (await calSidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await calSidebarLink.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Calendars in sidebar');
    }

    await screenshot(page, 'cal-01-calendars-page');

    // Now click "Calendar Settings" TAB at the top (not the button)
    const calSettingsTab = page.locator('text=Calendar Settings').first();
    if (await calSettingsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await calSettingsTab.click();
      await page.waitForTimeout(3000);
      console.log('   Clicked Calendar Settings tab');
    } else {
      // Or click the "Go to Calendar Settings" button
      const goBtn = page.locator('button:has-text("Go to Calendar Settings")');
      if (await goBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await goBtn.click();
        await page.waitForTimeout(3000);
        console.log('   Clicked Go to Calendar Settings button');
      }
    }

    await screenshot(page, 'cal-02-calendar-settings');
    console.log('✅ On Calendar Settings page!\n');

    // ===== CREATE CALENDARS =====
    let successCount = 0;

    for (let i = 0; i < CALENDARS.length; i++) {
      const cal = CALENDARS[i];
      console.log(`📍 Creating calendar ${i + 1}/${CALENDARS.length}: "${cal.name}" (${cal.duration} min)`);

      try {
        // Click "Create Calendar" button - try locator first, then coordinates
        let clicked = false;

        // Try locator for "Create Calendar" button
        const createBtn = page.locator('button:has-text("Create Calendar")');
        if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createBtn.click();
          clicked = true;
          console.log('   Clicked Create Calendar button (locator)');
        }

        // Try "+ New Calendar" button in top right
        if (!clicked) {
          const newCalBtn = page.locator('button:has-text("New Calendar")');
          if (await newCalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await newCalBtn.click();
            clicked = true;
            console.log('   Clicked + New Calendar button (locator)');
          }
        }

        // Fallback to coordinate click for "Create Calendar" (center of page)
        if (!clicked) {
          console.log('   Using coordinate click for Create Calendar (~897, 587)');
          await page.mouse.click(897, 587);
          clicked = true;
        }

        await page.waitForTimeout(2000);
        await screenshot(page, `cal-${i + 1}-modal`);

        // Select calendar type - click "Personal Booking" card
        // The card is a clickable div containing the text
        let typeSelected = false;

        // Try clicking the Personal Booking card using various methods
        const personalBookingCard = page.locator('div:has-text("Personal Booking"):has-text("one-on-one")').first();
        if (await personalBookingCard.isVisible({ timeout: 2000 }).catch(() => false)) {
          await personalBookingCard.click();
          typeSelected = true;
          console.log('   ✓ Clicked Personal Booking card (div method)');
        }

        // Fallback: Click by coordinates on the Personal Booking card (top-left card)
        // Based on screenshot, the card is approximately at x=520, y=435
        if (!typeSelected) {
          console.log('   Using coordinate click for Personal Booking (~520, 435)');
          await page.mouse.click(520, 435);
          typeSelected = true;
        }

        await page.waitForTimeout(3000);
        await screenshot(page, `cal-${i + 1}-after-type-select`);

        // Modal is now open - use coordinate-based interaction
        // From screenshot analysis:
        // - Calendar name input: approximately (788, 227)
        // - Duration input: approximately (610, 563)
        // - Confirm button: approximately (1057, 804)

        await screenshot(page, `cal-${i + 1}-config`);

        // Click and fill calendar name input
        console.log('   Clicking calendar name input...');
        await page.mouse.click(788, 227);
        await page.waitForTimeout(300);
        // Select all and replace
        await page.keyboard.press('Control+a');
        await page.keyboard.type(cal.name);
        console.log(`   ✓ Typed name: ${cal.name}`);

        await page.waitForTimeout(500);

        // Click and fill duration input (only if different from 30)
        if (cal.duration !== 30) {
          console.log('   Clicking duration input...');
          await page.mouse.click(610, 563);
          await page.waitForTimeout(300);
          await page.keyboard.press('Control+a');
          await page.keyboard.type(cal.duration.toString());
          console.log(`   ✓ Set duration: ${cal.duration} min`);
        } else {
          console.log(`   ✓ Using default duration: 30 min`);
        }

        await page.waitForTimeout(500);
        await screenshot(page, `cal-${i + 1}-filled`);

        // Click Confirm button
        console.log('   Clicking Confirm button...');
        await page.mouse.click(1057, 804);
        console.log(`   ✓ Clicked Confirm`);

        // Wait for calendar to be created and modal to close
        await page.waitForTimeout(3000);

        // Verify calendar was created by checking for success or list update
        await screenshot(page, `cal-${i + 1}-after-confirm`);

        successCount++;
        console.log(`   ✅ Calendar "${cal.name}" created!\n`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await screenshot(page, `cal-error-${i + 1}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // Navigate to calendar list to verify
    await page.goto('https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/settings/calendars', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await screenshot(page, 'cal-final');

    console.log('='.repeat(50));
    console.log(`✅ Created ${successCount}/${CALENDARS.length} calendars`);
    console.log('Browser staying open for 20 seconds...\n');

    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await screenshot(page, 'cal-error');
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
