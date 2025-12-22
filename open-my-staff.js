const { chromium } = require('playwright');

(async () => {
  console.log('Opening GHL My Staff page...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Login to GHL
    console.log('Logging in...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('Clicked Google sign-in');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    console.log('Logged in!');

    // Switch to sub-account
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
    console.log('In sub-account!');

    // Go to Settings → My Staff
    await page.click('text=Settings');
    await page.waitForTimeout(2000);

    const myStaff = page.locator('a:has-text("My Staff")');
    if (await myStaff.isVisible({ timeout: 5000 }).catch(() => false)) {
      await myStaff.click();
      console.log('Clicked My Staff');
    }
    await page.waitForTimeout(3000);

    console.log('\n========================================');
    console.log('Ready! Click pencil icon next to David Young');
    console.log('Then scroll to Signature, click </> and paste.');
    console.log('Browser stays open for 10 minutes.');
    console.log('========================================\n');

    await page.waitForTimeout(600000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.waitForTimeout(120000);
  } finally {
    await browser.close();
  }
})();
