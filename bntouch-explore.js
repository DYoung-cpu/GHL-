/**
 * BNTouch Explorer - Map the CRM interface
 * Saves auth state and explores key sections
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  loginUrl: 'https://www.bntouchmortgage.net/'
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('='.repeat(50));
  console.log('  BNTOUCH EXPLORER');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ headless: false });

  // Try to load saved auth, otherwise login fresh
  let context;
  if (fs.existsSync('bntouch-auth.json')) {
    console.log('Loading saved auth...');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: 'bntouch-auth.json'
    });
  } else {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }

  const page = await context.newPage();

  try {
    // Navigate to BNTouch
    await page.goto(CONFIG.loginUrl);
    await sleep(3000);

    // Check if we need to login
    if (page.url().includes('login') || await page.locator('input[name="username"]').count() > 0) {
      console.log('Logging in...');
      await page.locator('input[name="username"]').fill(CONFIG.username);
      await page.locator('input[type="password"]').fill(CONFIG.password);
      await page.locator('button:has-text("Login")').click();
      await sleep(5000);
    }

    console.log('Current URL:', page.url());

    // Save auth state
    await context.storageState({ path: 'bntouch-auth.json' });
    console.log('Auth state saved to bntouch-auth.json\n');

    // Explore key sections
    const sections = [
      { name: 'Mortgages', url: '/account5/mortgages' },
      { name: 'Leads', url: '/account5/leads' },
      { name: 'Campaigns', url: '/account5/campaigns' },
      { name: 'Marketing', url: '/account5/marketing' },
      { name: 'Contacts', url: '/account5/contacts' }
    ];

    console.log('Exploring sections...\n');

    for (const section of sections) {
      console.log(`--- ${section.name} ---`);

      // Try clicking nav link first
      const navLink = page.locator(`a:has-text("${section.name}")`).first();
      if (await navLink.count() > 0) {
        await navLink.click();
        await sleep(3000);

        await page.screenshot({ path: `screenshots/bntouch-${section.name.toLowerCase()}.png` });
        console.log(`Screenshot: bntouch-${section.name.toLowerCase()}.png`);
        console.log(`URL: ${page.url()}\n`);
      }
    }

    // Go back to dashboard
    await page.locator('a:has-text("Dashboard")').first().click();
    await sleep(2000);

    // Map all clickable elements for reference
    console.log('\n=== UI ELEMENT MAP ===\n');

    const links = await page.locator('a').allTextContents();
    const uniqueLinks = [...new Set(links.map(l => l.trim()).filter(l => l.length > 0 && l.length < 50))];

    console.log('Navigation Links:');
    uniqueLinks.slice(0, 30).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });

    console.log('\nExploration complete!');
    console.log('Browser staying open for 30 seconds...');
    await sleep(30000);

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/bntouch-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
