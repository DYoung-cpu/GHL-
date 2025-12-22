/**
 * Create workflows using the inline Continue button approach
 * Instead of fighting with the "Create Workflow" dropdown,
 * use the inline quick-create UI on the page
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';

const WORKFLOWS = [
  'New Lead Nurture Sequence',
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Application Process Updates',
  'Underwriting Status Updates',
  'Conditional Approval Celebration',
  'Clear to Close Celebration',
  'Closing Countdown Sequence',
  'Post-Close Nurture & Referral Sequence',
  'Realtor Partner Updates',
  'Rate Drop Alert Campaign',
  'Birthday Wishes',
  'Stale Lead Re-engagement'
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/cont-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`   [ss: ${name}]`);
}

(async () => {
  console.log('='.repeat(50));
  console.log('  Create Workflows via Continue Button');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let successCount = 0;

  try {
    // Login
    console.log('[1] Logging in...');
    await page.goto('https://app.gohighlevel.com/');
    await page.waitForTimeout(3000);

    const iframe = await page.$('#g_id_signin iframe');
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(4000);

    const gp = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (gp) {
      await gp.fill('input[type="email"]', 'david@lendwisemtg.com');
      await gp.keyboard.press('Enter');
      await page.waitForTimeout(4000);
      try {
        await gp.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
        await gp.fill('input[type="password"]:visible', 'Fafa2185!');
        await gp.keyboard.press('Enter');
      } catch(e) {}
      await page.waitForTimeout(10000);
    }
    console.log('   Done!\n');

    // Switch account
    console.log('[2] Switching account...');
    const sw = page.locator('text=Click here to switch');
    if (await sw.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sw.click();
      await page.waitForTimeout(2000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(5000);
    }
    console.log('   Done!\n');

    // Go to workflows
    console.log('[3] Going to workflows...');
    await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
    await page.waitForTimeout(8000);
    await ss(page, 'workflows-page');

    // Wait for Continue button to be visible (indicates page is loaded)
    console.log('   Waiting for Continue button...');
    await page.waitForSelector('text=Continue', { timeout: 30000 });
    console.log('   Page ready!\n');

    // Create workflows
    console.log('[4] Creating workflows...\n');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      const name = WORKFLOWS[i];
      console.log(`[${i+1}/${WORKFLOWS.length}] "${name}"`);

      try {
        // Make sure we're on the workflows page
        if (!page.url().includes('/workflows')) {
          await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
          await page.waitForTimeout(5000);
        }

        // Wait for page to load
        await page.waitForSelector('text=Continue', { timeout: 20000 });
        await page.waitForTimeout(1000);

        // Click Continue button (the blue one in the middle of the page)
        console.log('   Clicking Continue...');
        const continueBtn = page.locator('button:has-text("Continue")').first();
        await continueBtn.click();
        await page.waitForTimeout(3000);
        await ss(page, `${i+1}-after-continue`);

        // Check if we're now in the workflow editor or need to enter a name
        // Look for a name input field
        const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="workflow" i], input[type="text"]').first();

        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('   Found name input, entering name...');
          await nameInput.fill(name);
          await page.waitForTimeout(500);
          await ss(page, `${i+1}-named`);

          // Look for Create/Save/Continue button
          const createBtn = page.locator('button:has-text("Create"), button:has-text("Save"), button:has-text("Continue")').first();
          if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await createBtn.click();
            await page.waitForTimeout(3000);
          }
        }

        // Check if we're in the workflow editor (should show triggers/actions)
        const editorCheck = await page.locator('text=Add New Trigger, text=Trigger, text=Add Action').first().isVisible({ timeout: 5000 }).catch(() => false);

        if (editorCheck) {
          console.log('   In workflow editor!');

          // Try to save/publish
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Publish"), button:has-text("Draft")').first();
          if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
          }

          successCount++;
          console.log('   SUCCESS!\n');
          await ss(page, `${i+1}-success`);
        } else {
          // Check URL - if it has /workflow/ we might be in the editor
          if (page.url().includes('/workflow/')) {
            console.log('   URL indicates workflow created!');
            successCount++;
            console.log('   SUCCESS!\n');
          } else {
            console.log('   Could not verify - checking page...');
            await ss(page, `${i+1}-unknown`);
          }
        }

        // Go back to workflows list for next one
        await page.goto(`https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`);
        await page.waitForTimeout(5000);

      } catch (err) {
        console.log(`   ERROR: ${err.message}\n`);
        await ss(page, `${i+1}-error`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    await ss(page, 'final');

  } catch (e) {
    console.error('FATAL:', e.message);
    await ss(page, 'fatal');
  }

  console.log('='.repeat(50));
  console.log(`  Result: ${successCount}/${WORKFLOWS.length} workflows`);
  console.log('='.repeat(50));

  console.log('\nBrowser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
