/**
 * GHL Workflow Builder v6
 *
 * KEY FIX: Wait for page to fully load before interacting
 */

const { chromium } = require('playwright');

const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const WORKFLOWS_URL = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`;

const WORKFLOWS = [
  { name: 'New Lead Nurture Sequence', trigger: 'Contact Tag' },
  { name: 'Appointment Reminder Sequence', trigger: 'Customer Booked Appointment' },
  { name: 'Missed Appointment Follow-Up', trigger: 'Appointment Status' },
  { name: 'Pre-Qualification Process Workflow', trigger: 'Contact Tag' },
  { name: 'Pre-Qualification Complete Notification', trigger: 'Contact Tag' },
  { name: 'Application Process Updates', trigger: 'Contact Tag' },
  { name: 'Underwriting Status Updates', trigger: 'Contact Tag' },
  { name: 'Conditional Approval Celebration', trigger: 'Contact Tag' },
  { name: 'Clear to Close Celebration', trigger: 'Contact Tag' },
  { name: 'Closing Countdown Sequence', trigger: 'Contact Tag' },
  { name: 'Post-Close Nurture & Referral Sequence', trigger: 'Contact Tag' },
  { name: 'Realtor Partner Updates', trigger: 'Contact Tag' },
  { name: 'Rate Drop Alert Campaign', trigger: 'Contact Tag' },
  { name: 'Birthday Wishes', trigger: 'Birthday Reminder' },
  { name: 'Stale Lead Re-engagement', trigger: 'Stale Opportunities' }
];

let ssNum = 0;
async function ss(page, name) {
  ssNum++;
  await page.screenshot({ path: `./screenshots/v6-${String(ssNum).padStart(2,'0')}-${name}.png`, fullPage: true });
  console.log(`      [ss: ${name}]`);
}

(async () => {
  console.log('='.repeat(60));
  console.log('  GHL WORKFLOW BUILDER v6');
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  let successCount = 0;

  try {
    // ===== LOGIN =====
    console.log('[1] LOGGING IN...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) await frame.click('div[role="button"]');
    }
    await page.waitForTimeout(4000);

    const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
    if (googlePage) {
      console.log('      Entering credentials...');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(4000);
      try {
        await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 8000 });
        await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
        await googlePage.keyboard.press('Enter');
      } catch(e) {}
      await page.waitForTimeout(10000);
    }
    console.log('      Done!\n');

    // ===== SWITCH ACCOUNT =====
    console.log('[2] SWITCHING ACCOUNT...');
    await page.waitForTimeout(3000);

    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(3000);
      await page.locator('text=LENDWISE').first().click();
      await page.waitForTimeout(6000);
      console.log('      Switched!\n');
    }

    // ===== GO TO WORKFLOWS =====
    console.log('[3] NAVIGATING TO WORKFLOWS...');
    await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });

    // **KEY FIX**: Wait for Create Workflow button to appear (page fully loaded)
    console.log('      Waiting for page to fully load...');
    try {
      await page.waitForSelector('text=Create Workflow', { timeout: 30000 });
      console.log('      Page loaded!\n');
    } catch (e) {
      console.log('      Create Workflow button not found, checking page...');
      await ss(page, 'page-not-loaded');
      // Try waiting more
      await page.waitForTimeout(10000);
    }
    await ss(page, 'workflows-loaded');

    // ===== CREATE WORKFLOWS =====
    console.log('[4] CREATING WORKFLOWS...\n');

    for (let i = 0; i < WORKFLOWS.length; i++) {
      const wf = WORKFLOWS[i];
      console.log(`  [${i+1}/${WORKFLOWS.length}] "${wf.name}"`);

      try {
        // Wait for page to be fully loaded
        await page.waitForSelector('text=Create Workflow', { timeout: 20000 });
        await page.waitForTimeout(1000);

        // Click Create Workflow button
        console.log('      Clicking Create Workflow...');
        const createBtn = page.locator('text=Create Workflow').first();
        await createBtn.click();
        await page.waitForTimeout(2000);
        await ss(page, `${i+1}-clicked`);

        // Check if dropdown appeared or if we need to click again
        const dropdownVisible = await page.locator('text=Start from Scratch').isVisible({ timeout: 3000 }).catch(() => false);

        if (dropdownVisible) {
          console.log('      Dropdown visible, clicking Start from Scratch...');
          await page.locator('text=Start from Scratch').first().click();
          await page.waitForTimeout(2000);
        } else {
          // Maybe it went straight to a modal - check for name input
          const nameVisible = await page.locator('input[placeholder*="name" i]').isVisible({ timeout: 2000 }).catch(() => false);
          if (!nameVisible) {
            console.log('      No dropdown or modal, trying to click dropdown arrow...');
            // The button might be a split button - try clicking the right side
            const btnBox = await createBtn.boundingBox();
            if (btnBox) {
              // Click near the right edge (dropdown arrow area)
              await page.mouse.click(btnBox.x + btnBox.width - 10, btnBox.y + btnBox.height / 2);
              await page.waitForTimeout(2000);
              await ss(page, `${i+1}-dropdown-arrow`);

              // Now try Start from Scratch again
              if (await page.locator('text=Start from Scratch').isVisible({ timeout: 2000 }).catch(() => false)) {
                await page.locator('text=Start from Scratch').click();
                await page.waitForTimeout(2000);
              }
            }
          }
        }

        await ss(page, `${i+1}-after-scratch`);

        // Look for workflow name input
        console.log('      Looking for name input...');
        const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="workflow" i]').first();

        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('      Found name input!');
          await nameInput.fill(wf.name);
          await page.waitForTimeout(500);
          await ss(page, `${i+1}-named`);

          // Click Continue/Create
          const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Create")').first();
          if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await continueBtn.click();
            await page.waitForTimeout(3000);
          }

          await ss(page, `${i+1}-continued`);

          // Check if we're in the workflow editor
          const inEditor = await page.locator('text=Add New Trigger, text=Add Trigger').first().isVisible({ timeout: 5000 }).catch(() => false);

          if (inEditor) {
            console.log('      In workflow editor! Saving...');

            // Try to save/publish
            const saveBtn = page.locator('button:has-text("Save"), button:has-text("Publish")').first();
            if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await saveBtn.click();
              await page.waitForTimeout(2000);
            }

            successCount++;
            console.log('      SUCCESS!\n');
          } else {
            console.log('      Not in editor, checking URL...');
            const url = page.url();
            if (url.includes('/workflow/')) {
              console.log('      URL indicates workflow created!');
              successCount++;
              console.log('      SUCCESS!\n');
            } else {
              console.log('      Could not verify workflow creation\n');
            }
          }
        } else {
          console.log('      Name input not found!\n');
          await ss(page, `${i+1}-no-input`);
        }

        // Go back to workflows list
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

      } catch (err) {
        console.log(`      ERROR: ${err.message}\n`);
        await ss(page, `${i+1}-error`);
        await page.keyboard.press('Escape');
        await page.goto(WORKFLOWS_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
      }
    }

    await ss(page, 'final');

  } catch (error) {
    console.error('FATAL:', error.message);
    await ss(page, 'fatal');
  }

  console.log('='.repeat(60));
  console.log(`  RESULT: ${successCount}/${WORKFLOWS.length} workflows`);
  console.log('='.repeat(60));
  console.log('\n  Browser open 60s...');
  await page.waitForTimeout(60000);
  await browser.close();
})();
