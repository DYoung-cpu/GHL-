const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GHL_URL = 'https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/automation/workflows?listTab=all';
const USER_DATA_DIR = path.join(__dirname, '.playwright-data');

async function launchBrowser(headless = false) {
  // Use persistent context to save login session
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: headless,
    viewport: { width: 1400, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
      headless ? '' : '--start-maximized'
    ].filter(Boolean)
  });

  return context;
}

async function waitForLogin(page) {
  console.log('Checking if logged in...');

  // Wait for either the workflow page or login page
  try {
    await page.waitForSelector('button:has-text("Build using AI")', { timeout: 10000 });
    console.log('Already logged in!');
    return true;
  } catch {
    console.log('Not logged in. Please log in manually in the browser window.');
    console.log('Waiting for login...');

    // Wait up to 2 minutes for user to log in
    await page.waitForSelector('button:has-text("Build using AI")', { timeout: 120000 });
    console.log('Login successful!');
    return true;
  }
}

async function openWorkflowAI(page) {
  console.log('Opening Workflow AI...');

  // Click "Build using AI" button
  const buildButton = await page.waitForSelector('button:has-text("Build using AI")');
  await buildButton.click();

  // Wait for the modal to appear
  await page.waitForSelector('text="What do you want to automate?"', { timeout: 5000 });
  console.log('Workflow AI modal opened!');

  return true;
}

async function submitPrompt(page, prompt) {
  console.log('Submitting prompt:', prompt.substring(0, 50) + '...');

  // Find the textarea in the modal
  const textarea = await page.waitForSelector('textarea, div[contenteditable="true"], input[type="text"]');

  // Clear and type the prompt
  await textarea.fill(prompt);

  // Find and click submit button (usually an arrow or send button)
  const submitButton = await page.waitForSelector('button[type="submit"], button:has-text("Generate"), svg[data-testid="send"]', { timeout: 5000 }).catch(() => null);

  if (submitButton) {
    await submitButton.click();
  } else {
    // Try pressing Enter
    await textarea.press('Enter');
  }

  console.log('Prompt submitted!');

  // Wait for response
  await page.waitForTimeout(3000);

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const prompt = args.slice(1).join(' ');
  const headless = args.includes('--headless') || command === 'test';

  console.log('=== GHL Workflow AI Automation ===\n');

  const context = await launchBrowser(headless);
  const page = await context.newPage();

  try {
    // Navigate to GHL
    console.log('Navigating to GHL...');
    await page.goto(GHL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // For test mode, skip login check and go straight to analysis
    if (command !== 'test') {
      // Wait for login
      await waitForLogin(page);
    }

    if (command === 'open') {
      // Just open the AI modal
      await openWorkflowAI(page);
      console.log('\nWorkflow AI is ready. You can now interact with it manually.');
      console.log('Press Ctrl+C to close when done.');

      // Keep browser open
      await new Promise(() => {});

    } else if (command === 'prompt' && prompt) {
      // Open and submit a prompt
      await openWorkflowAI(page);
      await submitPrompt(page, prompt);

      console.log('\nWorkflow created! Review it in the browser.');
      console.log('Press Ctrl+C to close when done.');

      // Keep browser open
      await new Promise(() => {});

    } else if (command === 'list') {
      // Dismiss any modal first
      const gotItBtn = await page.$('button:has-text("Got It")');
      if (gotItBtn) {
        await gotItBtn.click();
        await page.waitForTimeout(1000);
      }

      // List existing workflows
      console.log('\nExisting workflows:');

      let allWorkflows = [];
      let pageNum = 1;

      while (true) {
        await page.waitForTimeout(2000);

        // Get workflow rows from current page
        const workflows = await page.$$eval('table tbody tr', rows => {
          return rows.map(row => {
            const cells = row.querySelectorAll('td');
            const name = row.querySelector('span, a')?.textContent?.trim() || '';
            const status = cells[1]?.textContent?.trim() || '';
            return { name, status };
          }).filter(w => w.name);
        });

        allWorkflows = allWorkflows.concat(workflows);
        console.log(`Page ${pageNum}: Found ${workflows.length} workflows`);

        // Check for next page
        const nextBtn = await page.$('button:has-text("Next"):not([disabled])');
        if (nextBtn) {
          await nextBtn.click();
          pageNum++;
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      }

      console.log('\n=== ALL WORKFLOWS ===');
      allWorkflows.forEach((w, i) => console.log(`${i + 1}. ${w.name} [${w.status}]`));
      console.log(`\nTotal: ${allWorkflows.length} workflows`);

      await context.close();

    } else if (command === 'test') {
      // Test headless mode - check if we can access the page and find elements
      console.log('Testing in headless mode...');

      // Wait for page to fully load (GHL is a heavy SPA)
      console.log('Waiting for page to load...');
      await page.waitForTimeout(15000);

      // Take a screenshot
      await page.screenshot({ path: 'screenshots/ghl-test.png', fullPage: false });
      console.log('Screenshot saved to screenshots/ghl-test.png');

      // Check what's on the page
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      const url = page.url();
      console.log('Current URL:', url);

      // Check for login elements or workflow elements
      const hasLoginButton = await page.$('button:has-text("Sign in"), input[type="email"]').then(el => !!el);
      const hasWorkflowButton = await page.$('button:has-text("Build using AI")').then(el => !!el);

      console.log('Has login elements:', hasLoginButton);
      console.log('Has Workflow AI button:', hasWorkflowButton);

      await context.close();

    } else {
      console.log('Usage:');
      console.log('  node ghl-workflow-ai.js test                    - Test headless mode (no browser window)');
      console.log('  node ghl-workflow-ai.js open                    - Open GHL and Workflow AI modal');
      console.log('  node ghl-workflow-ai.js prompt "Your prompt"    - Submit a workflow prompt');
      console.log('  node ghl-workflow-ai.js list                    - List existing workflows');
      console.log('  Add --headless to any command to run without browser window');

      await context.close();
    }

  } catch (error) {
    console.error('Error:', error.message);
    await context.close();
  }
}

main();
