/**
 * BNTouch Complete Content Scraper
 * Extracts all journeys, campaigns, email templates, SMS templates, and marketing content
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

// Data storage
const scraped = {
  campaigns: [],
  emailTemplates: [],
  smsTemplates: [],
  marketingContent: [],
  journeys: [],
  metadata: {
    scrapedAt: new Date().toISOString(),
    account: 'lendwisemtg'
  }
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const filename = `screenshots/bntouch-scrape-${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  [Screenshot: ${name}]`);
  return filename;
}

async function login(page, context) {
  console.log('Logging into BNTouch...');
  await page.goto(CONFIG.baseUrl);
  await sleep(3000);

  if (await page.locator('input[name="username"]').count() > 0) {
    await page.locator('input[name="username"]').fill(CONFIG.username);
    await page.locator('input[type="password"]').fill(CONFIG.password);
    await page.locator('button:has-text("Login")').click();
    await sleep(5000);
  }

  // Save auth state
  await context.storageState({ path: 'bntouch-auth.json' });
  console.log('Logged in successfully!\n');
}

async function scrapeCampaigns(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING CAMPAIGNS');
  console.log('='.repeat(50));

  // Navigate to Campaigns
  await page.locator('a:has-text("Campaigns")').first().click();
  await sleep(3000);
  await screenshot(page, 'campaigns-list');

  // Get all campaign rows
  const campaignRows = await page.locator('table tr, .campaign-row, [class*="campaign"]').all();
  console.log(`Found ${campaignRows.length} potential campaign elements`);

  // Try to find campaign links
  const campaignLinks = await page.locator('a[href*="campaign"]').all();
  console.log(`Found ${campaignLinks.length} campaign links`);

  for (let i = 0; i < campaignLinks.length && i < 50; i++) {
    try {
      const linkText = await campaignLinks[i].textContent();
      const href = await campaignLinks[i].getAttribute('href');

      if (linkText && linkText.trim().length > 2) {
        console.log(`  Campaign: ${linkText.trim()}`);
        scraped.campaigns.push({
          name: linkText.trim(),
          url: href,
          index: i
        });
      }
    } catch (e) {}
  }

  // Look for pending campaigns widget content
  const pendingCampaigns = await page.locator('.campaign, [class*="pending"] tr').allTextContents();
  pendingCampaigns.forEach((text, i) => {
    if (text.trim().length > 5 && text.trim().length < 200) {
      scraped.campaigns.push({
        name: text.trim().split('\n')[0],
        source: 'pending-widget',
        fullText: text.trim()
      });
    }
  });
}

async function scrapeMarketingSection(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING MARKETING SECTION');
  console.log('='.repeat(50));

  // Click Marketing in main nav
  await page.locator('a:has-text("Marketing")').first().click();
  await sleep(3000);
  await screenshot(page, 'marketing-main');

  // Look for sub-sections
  const marketingSubLinks = await page.locator('a').filter({ hasText: /template|email|sms|flyer|letter|content|library/i }).all();

  console.log(`Found ${marketingSubLinks.length} marketing sub-sections`);

  for (const link of marketingSubLinks) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  Sub-section: ${text?.trim()} -> ${href}`);
  }

  // Get current page content structure
  const pageContent = await page.content();

  // Look for template listings
  const templateItems = await page.locator('[class*="template"], [class*="item"], .list-item, tr').allTextContents();

  templateItems.forEach((item, i) => {
    const text = item.trim();
    if (text.length > 10 && text.length < 500 && !text.includes('<!DOCTYPE')) {
      scraped.marketingContent.push({
        content: text,
        section: 'marketing-main',
        index: i
      });
    }
  });
}

async function scrapeEmailTemplates(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING EMAIL TEMPLATES');
  console.log('='.repeat(50));

  // Try different paths to email templates
  const emailPaths = [
    '/account5/email-templates',
    '/account5/templates/email',
    '/account5/marketing/email',
    '/account5/campaign/templates'
  ];

  for (const path of emailPaths) {
    try {
      await page.goto(CONFIG.baseUrl + path);
      await sleep(2000);

      const hasContent = await page.locator('table, .template, .list').count() > 0;
      if (hasContent) {
        console.log(`Found email templates at: ${path}`);
        await screenshot(page, 'email-templates');
        break;
      }
    } catch (e) {}
  }

  // Also try clicking through UI
  await page.goto(CONFIG.baseUrl + '/account5/');
  await sleep(2000);

  // Look for Email Templates link
  const emailLink = page.locator('a').filter({ hasText: /email template/i }).first();
  if (await emailLink.count() > 0) {
    await emailLink.click();
    await sleep(3000);
    await screenshot(page, 'email-templates-ui');
  }

  // Scrape any visible templates
  const templates = await page.locator('[class*="template"], .email-item, tr').allTextContents();
  templates.forEach((t, i) => {
    if (t.trim().length > 5) {
      scraped.emailTemplates.push({
        content: t.trim(),
        index: i
      });
    }
  });
}

async function scrapeCampaignDetails(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING CAMPAIGN DETAILS (JOURNEYS)');
  console.log('='.repeat(50));

  // Go to campaign/marketing area
  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);
  await screenshot(page, 'campaign-area');

  // Look for journey/drip campaign sections
  const sections = await page.locator('a, button').filter({
    hasText: /journey|drip|sequence|automation|workflow/i
  }).all();

  console.log(`Found ${sections.length} journey-related sections`);

  // Get all visible campaign content
  const allText = await page.locator('body').textContent();

  // Parse campaign names from the pending campaigns we saw earlier
  const campaignMatches = allText.match(/Campaign[^:]*:[^\n]+/g) || [];
  campaignMatches.forEach(match => {
    scraped.journeys.push({
      raw: match.trim(),
      source: 'page-content'
    });
  });

  // Look for campaign step details
  const steps = await page.locator('[class*="step"], [class*="sequence"], .drip-item').allTextContents();
  steps.forEach((step, i) => {
    if (step.trim().length > 5) {
      scraped.journeys.push({
        stepContent: step.trim(),
        index: i
      });
    }
  });
}

async function scrapeOptionsAndSettings(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING OPTIONS & SETTINGS');
  console.log('='.repeat(50));

  // Go to Options
  await page.locator('a:has-text("Options")').first().click();
  await sleep(3000);
  await screenshot(page, 'options-main');

  // Look for template/content related settings
  const optionLinks = await page.locator('a').allTextContents();
  const relevantOptions = optionLinks.filter(text =>
    /template|email|sms|campaign|marketing|content|signature/i.test(text)
  );

  console.log('Relevant option sections:');
  relevantOptions.forEach(opt => {
    console.log(`  - ${opt.trim()}`);
  });

  scraped.metadata.optionSections = relevantOptions;
}

async function deepScrapeCampaignLibrary(page) {
  console.log('\n' + '='.repeat(50));
  console.log('DEEP SCRAPING CAMPAIGN LIBRARY');
  console.log('='.repeat(50));

  // Navigate to campaign/marketing
  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Map all links on the page
  const allLinks = await page.locator('a').all();
  const linkData = [];

  for (const link of allLinks) {
    try {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      if (text && href && text.trim().length > 2) {
        linkData.push({ text: text.trim(), href });
      }
    } catch (e) {}
  }

  console.log(`Found ${linkData.length} links on campaign page`);

  // Filter for template/content links
  const contentLinks = linkData.filter(l =>
    /template|content|library|email|sms|flyer|letter|drip|journey|sequence/i.test(l.text) ||
    /template|content|library/i.test(l.href || '')
  );

  console.log(`\nContent-related links:`);
  contentLinks.forEach(link => {
    console.log(`  ${link.text} -> ${link.href}`);
  });

  // Click each content link and scrape
  for (const link of contentLinks.slice(0, 10)) {
    try {
      console.log(`\nExploring: ${link.text}`);

      if (link.href && link.href.startsWith('http')) {
        await page.goto(link.href);
      } else if (link.href) {
        await page.goto(CONFIG.baseUrl + link.href);
      } else {
        await page.locator(`a:has-text("${link.text}")`).first().click();
      }

      await sleep(2000);
      await screenshot(page, `content-${link.text.replace(/[^a-z0-9]/gi, '-').substring(0, 20)}`);

      // Scrape content from this page
      const pageText = await page.locator('body').textContent();
      const tables = await page.locator('table').allTextContents();

      scraped.marketingContent.push({
        section: link.text,
        url: link.href,
        contentSample: pageText.substring(0, 2000),
        tables: tables.slice(0, 5)
      });

    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

async function scrapeIntelligenceSection(page) {
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING INTELLIGENCE SECTION');
  console.log('='.repeat(50));

  // The Intelligence section might have pre-built content
  await page.locator('a:has-text("Intelligence")').first().click().catch(() => {});
  await sleep(3000);
  await screenshot(page, 'intelligence');

  const content = await page.locator('body').textContent();
  scraped.metadata.intelligenceContent = content.substring(0, 5000);
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH COMPLETE CONTENT SCRAPER');
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: false });

  // Try to use saved auth
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
    // Login
    await login(page, context);

    // Scrape all sections
    await scrapeCampaigns(page);
    await scrapeMarketingSection(page);
    await scrapeEmailTemplates(page);
    await scrapeCampaignDetails(page);
    await deepScrapeCampaignLibrary(page);
    await scrapeOptionsAndSettings(page);
    await scrapeIntelligenceSection(page);

    // Save results
    const outputFile = 'bntouch-scraped-content.json';
    fs.writeFileSync(outputFile, JSON.stringify(scraped, null, 2));
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SCRAPING COMPLETE!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nResults saved to: ${outputFile}`);
    console.log(`\nSummary:`);
    console.log(`  - Campaigns: ${scraped.campaigns.length}`);
    console.log(`  - Email Templates: ${scraped.emailTemplates.length}`);
    console.log(`  - SMS Templates: ${scraped.smsTemplates.length}`);
    console.log(`  - Marketing Content: ${scraped.marketingContent.length}`);
    console.log(`  - Journeys: ${scraped.journeys.length}`);

    // Keep browser open briefly
    console.log('\nBrowser staying open for 30 seconds...');
    await sleep(30000);

  } catch (e) {
    console.error('Error:', e.message);
    await screenshot(page, 'error');
  } finally {
    // Save whatever we got
    fs.writeFileSync('bntouch-scraped-content.json', JSON.stringify(scraped, null, 2));
    await browser.close();
  }
}

main().catch(console.error);
