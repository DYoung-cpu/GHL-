const { chromium } = require('playwright');

// Simple script - just opens GHL to My Staff page
// User manually clicks pencil and pastes signature

(async () => {
  console.log('🔧 Opening GHL My Staff Page');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    // ===== LOGIN =====
    console.log('📍 Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   ✓ Clicked Google sign-in');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Switching to Lendwise...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
      }
    }
    console.log('✅ In sub-account!\n');

    // ===== GO TO SETTINGS → MY STAFF =====
    console.log('📍 Navigating to Settings → My Staff...');
    await page.click('text=Settings');
    await page.waitForTimeout(4000);
    await page.click('text=My Staff');
    await page.waitForTimeout(5000);
    console.log('✅ On My Staff page!\n');

    // ===== INSTRUCTIONS =====
    console.log('='.repeat(50));
    console.log('📋 MANUAL STEPS:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. Click the PENCIL icon ✏️ next to David Young');
    console.log('2. Click "User Info" tab');
    console.log('3. Scroll down to "Signature" section');
    console.log('4. Enable the toggle "Enable signature on all outgoing messages"');
    console.log('5. Click the </> button in the editor toolbar');
    console.log('6. Open: C:\\Users\\dyoun\\Downloads\\PASTE-THIS-SIGNATURE.html');
    console.log('7. Select ALL (Ctrl+A) and Copy (Ctrl+C)');
    console.log('8. Paste (Ctrl+V) into the signature editor');
    console.log('9. Click </> again to close source mode');
    console.log('10. Click "Next" or "Save"');
    console.log('');
    console.log('='.repeat(50));
    console.log('Browser will stay open for 5 minutes');
    console.log('='.repeat(50));

    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();
