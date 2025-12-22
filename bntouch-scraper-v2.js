/**
 * BNTouch Content Scraper v2
 * More targeted approach using visible navigation elements
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

const scraped = {
  campaigns: [],
  emailTemplates: [],
  smsTemplates: [],
  marketingContent: [],
  journeys: [],
  contentLibrary: [],
  metadata: {
    scrapedAt: new Date().toISOString(),
    account: 'lendwisemtg'
  }
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const filename = `screenshots/bntouch-${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  [Screenshot: ${name}]`);
  return filename;
}

async function login(page, context) {
  console.log('Navigating to BNTouch...');
  await page.goto(CONFIG.baseUrl);
  await sleep(3000);

  // Check if login required
  if (await page.locator('input[name="username"]').count() > 0) {
    console.log('Logging in...');
    await page.locator('input[name="username"]').fill(CONFIG.username);
    await page.locator('input[type="password"]').fill(CONFIG.password);
    await page.locator('button:has-text("Login")').click();
    await sleep(5000);
  }

  await context.storageState({ path: 'bntouch-auth.json' });
  console.log('Logged in!\n');
}

async function scrapePendingCampaignsWidget(page) {
  console.log('\n=== SCRAPING PENDING CAMPAIGNS WIDGET ===\n');

  // The Pending Campaigns widget is visible on dashboard
  const pendingSection = page.locator('text=Pending Campaigns').first();

  if (await pendingSection.count() > 0) {
    // Get all rows in the pending campaigns table
    const rows = await page.locator('.pending-campaigns tr, [class*="campaign"] tr, table:has(th:has-text("Campaign")) tr').all();

    console.log(`Found ${rows.length} rows in pending campaigns`);

    // Also get the visible text content
    const campaignTexts = await page.evaluate(() => {
      const results = [];
      // Look for campaign-related content
      document.querySelectorAll('a[href*="campaign"], [class*="campaign"]').forEach(el => {
        const text = el.innerText || el.textContent;
        if (text && text.trim().length > 3) {
          results.push({
            text: text.trim(),
            href: el.href || null
          });
        }
      });
      return results;
    });

    campaignTexts.forEach(c => {
      if (!scraped.campaigns.find(x => x.text === c.text)) {
        scraped.campaigns.push(c);
        console.log(`  Campaign: ${c.text.substring(0, 60)}...`);
      }
    });
  }
}

async function scrapeCampaignsTab(page) {
  console.log('\n=== SCRAPING CAMPAIGNS TAB ===\n');

  // Click the Campaigns tab in sub-navigation (not the help dropdown)
  // The tab should be visible in the nav bar
  const campaignsTab = page.locator('a.nav-link, a[class*="tab"]').filter({ hasText: 'Campaigns' }).first();

  if (await campaignsTab.count() > 0) {
    console.log('Clicking Campaigns tab...');
    await campaignsTab.click();
    await sleep(3000);
    await screenshot(page, 'campaigns-tab');
  } else {
    // Try direct navigation
    console.log('Trying direct URL for campaigns...');
    await page.goto(CONFIG.baseUrl + '/account5/campaign');
    await sleep(3000);
    await screenshot(page, 'campaigns-direct');
  }

  // Now scrape all visible campaigns
  const pageContent = await page.evaluate(() => {
    const data = {
      tables: [],
      links: [],
      campaigns: []
    };

    // Get all tables
    document.querySelectorAll('table').forEach((table, i) => {
      const rows = [];
      table.querySelectorAll('tr').forEach(tr => {
        const cells = [];
        tr.querySelectorAll('td, th').forEach(cell => {
          cells.push(cell.innerText.trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 0) data.tables.push(rows);
    });

    // Get campaign-related links
    document.querySelectorAll('a').forEach(a => {
      const href = a.href;
      const text = a.innerText.trim();
      if ((href && href.includes('campaign')) || text.toLowerCase().includes('campaign')) {
        data.links.push({ text, href });
      }
    });

    return data;
  });

  console.log(`Found ${pageContent.tables.length} tables`);
  console.log(`Found ${pageContent.links.length} campaign-related links`);

  scraped.campaigns.push(...pageContent.links);
  scraped.metadata.campaignTables = pageContent.tables;
}

async function scrapeMarketingTab(page) {
  console.log('\n=== SCRAPING MARKETING TAB ===\n');

  // Click Marketing in main nav
  await page.locator('a').filter({ hasText: /^Marketing$/ }).first().click();
  await sleep(3000);
  await screenshot(page, 'marketing-tab');

  console.log('Current URL:', page.url());

  // Get all visible content
  const marketingContent = await page.evaluate(() => {
    const data = {
      sections: [],
      links: [],
      templates: []
    };

    // Get all section headers
    document.querySelectorAll('h1, h2, h3, h4, .section-title, .card-header').forEach(el => {
      data.sections.push(el.innerText.trim());
    });

    // Get all links
    document.querySelectorAll('a').forEach(a => {
      const text = a.innerText.trim();
      const href = a.href;
      if (text.length > 2 && text.length < 100) {
        data.links.push({ text, href });
      }
    });

    return data;
  });

  console.log('Marketing sections found:');
  marketingContent.sections.forEach(s => console.log(`  - ${s}`));

  scraped.marketingContent.push({
    source: 'marketing-tab',
    content: marketingContent
  });

  // Look for sub-sections to explore
  const subLinks = marketingContent.links.filter(l =>
    /template|email|sms|flyer|content|library|drip|journey/i.test(l.text)
  );

  console.log(`\nExploring ${subLinks.length} sub-sections...`);

  for (const link of subLinks.slice(0, 15)) {
    try {
      console.log(`\n  Exploring: ${link.text}`);
      await page.goto(link.href);
      await sleep(2000);

      const subContent = await page.evaluate(() => {
        return {
          title: document.title,
          h1: document.querySelector('h1')?.innerText || '',
          tables: Array.from(document.querySelectorAll('table')).map(t => t.innerText.substring(0, 500)),
          forms: Array.from(document.querySelectorAll('form')).map(f => f.innerText.substring(0, 300))
        };
      });

      scraped.marketingContent.push({
        source: link.text,
        url: link.href,
        content: subContent
      });

      await screenshot(page, `marketing-${link.text.replace(/[^a-z0-9]/gi, '-').substring(0, 20)}`);

    } catch (e) {
      console.log(`    Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function scrapeEmailTemplates(page) {
  console.log('\n=== SCRAPING EMAIL TEMPLATES ===\n');

  // Try various paths
  const paths = [
    '/account5/marketing/templates',
    '/account5/templates',
    '/account5/email-templates',
    '/account5/marketing/email'
  ];

  for (const path of paths) {
    try {
      await page.goto(CONFIG.baseUrl + path);
      await sleep(2000);

      const hasContent = await page.locator('table, .template-list, .email-template').count();
      if (hasContent > 0) {
        console.log(`Found templates at: ${path}`);
        await screenshot(page, 'email-templates-' + path.replace(/\//g, '-'));

        // Scrape templates
        const templates = await page.evaluate(() => {
          const results = [];
          document.querySelectorAll('tr, .template-item, [class*="template"]').forEach(el => {
            const text = el.innerText.trim();
            if (text.length > 10 && text.length < 1000) {
              results.push(text);
            }
          });
          return results;
        });

        templates.forEach(t => {
          scraped.emailTemplates.push({ content: t, source: path });
        });

        break;
      }
    } catch (e) {}
  }
}

async function scrapeContentLibrary(page) {
  console.log('\n=== SCRAPING CONTENT LIBRARY ===\n');

  // BNTouch often has a content library with pre-built marketing materials
  const libraryPaths = [
    '/account5/content',
    '/account5/library',
    '/account5/marketing/content',
    '/account5/marketing/library'
  ];

  for (const path of libraryPaths) {
    try {
      await page.goto(CONFIG.baseUrl + path);
      await sleep(2000);

      const pageText = await page.locator('body').textContent();
      if (pageText.length > 500 && !pageText.includes('404')) {
        console.log(`Found content at: ${path}`);
        await screenshot(page, 'library-' + path.replace(/\//g, '-'));

        scraped.contentLibrary.push({
          path,
          content: pageText.substring(0, 5000)
        });
      }
    } catch (e) {}
  }
}

async function scrapeDripCampaigns(page) {
  console.log('\n=== SCRAPING DRIP CAMPAIGNS / JOURNEYS ===\n');

  // Look for drip campaign setup
  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(2000);

  // Click into individual campaigns to see their steps
  const campaignLinks = await page.locator('a[href*="campaign"]').all();

  console.log(`Found ${campaignLinks.length} campaign links to explore`);

  for (let i = 0; i < Math.min(campaignLinks.length, 10); i++) {
    try {
      const link = campaignLinks[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (href && !href.includes('youtube') && !href.includes('help')) {
        console.log(`\n  Exploring campaign: ${text?.substring(0, 40)}...`);

        await page.goto(href.startsWith('http') ? href : CONFIG.baseUrl + href);
        await sleep(2000);

        // Look for campaign steps/sequence
        const steps = await page.evaluate(() => {
          const data = {
            name: document.querySelector('h1, .campaign-name')?.innerText || '',
            steps: [],
            triggers: [],
            content: []
          };

          // Look for step elements
          document.querySelectorAll('[class*="step"], [class*="sequence"], .drip-step, tr').forEach(el => {
            const text = el.innerText.trim();
            if (text.length > 5 && text.length < 500) {
              data.steps.push(text);
            }
          });

          // Look for trigger info
          document.querySelectorAll('[class*="trigger"], [class*="condition"]').forEach(el => {
            data.triggers.push(el.innerText.trim());
          });

          return data;
        });

        if (steps.steps.length > 0 || steps.name) {
          scraped.journeys.push({
            url: href,
            name: steps.name || text,
            ...steps
          });
          await screenshot(page, `journey-${i}`);
        }
      }
    } catch (e) {
      console.log(`    Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function scrapeOptionsEmailSetup(page) {
  console.log('\n=== SCRAPING OPTIONS / EMAIL SETUP ===\n');

  await page.locator('a').filter({ hasText: /^Options$/ }).first().click();
  await sleep(2000);
  await screenshot(page, 'options-main');

  // Look for email/template related options
  const optionLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const text = a.innerText.trim();
      if (/email|template|signature|campaign|marketing/i.test(text)) {
        links.push({ text, href: a.href });
      }
    });
    return links;
  });

  console.log('Email/Template related options:');
  optionLinks.forEach(l => console.log(`  - ${l.text}`));

  scraped.metadata.emailOptions = optionLinks;

  // Explore each option
  for (const opt of optionLinks.slice(0, 5)) {
    try {
      console.log(`\n  Exploring: ${opt.text}`);
      await page.goto(opt.href);
      await sleep(2000);

      const content = await page.locator('body').textContent();
      scraped.marketingContent.push({
        source: `options-${opt.text}`,
        url: opt.href,
        content: content.substring(0, 3000)
      });

      await screenshot(page, `options-${opt.text.replace(/[^a-z0-9]/gi, '-').substring(0, 15)}`);
    } catch (e) {}
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH CONTENT SCRAPER v2');
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: false });

  let context;
  if (fs.existsSync('bntouch-auth.json')) {
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
    await login(page, context);

    // Go to dashboard first
    await page.goto(CONFIG.baseUrl + '/account5/');
    await sleep(3000);
    await screenshot(page, 'dashboard');

    // Scrape each section
    await scrapePendingCampaignsWidget(page);
    await scrapeCampaignsTab(page);
    await scrapeMarketingTab(page);
    await scrapeEmailTemplates(page);
    await scrapeContentLibrary(page);
    await scrapeDripCampaigns(page);
    await scrapeOptionsEmailSetup(page);

    // Save results
    const outputFile = 'bntouch-scraped-content.json';
    fs.writeFileSync(outputFile, JSON.stringify(scraped, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nResults saved to: ${outputFile}`);
    console.log(`\nSummary:`);
    console.log(`  - Campaigns: ${scraped.campaigns.length}`);
    console.log(`  - Email Templates: ${scraped.emailTemplates.length}`);
    console.log(`  - Marketing Content sections: ${scraped.marketingContent.length}`);
    console.log(`  - Journeys/Drip campaigns: ${scraped.journeys.length}`);
    console.log(`  - Content Library items: ${scraped.contentLibrary.length}`);

    console.log('\nBrowser staying open for 20 seconds...');
    await sleep(20000);

  } catch (e) {
    console.error('Error:', e.message);
    await screenshot(page, 'error');
  } finally {
    fs.writeFileSync('bntouch-scraped-content.json', JSON.stringify(scraped, null, 2));
    await browser.close();
  }
}

main().catch(console.error);
