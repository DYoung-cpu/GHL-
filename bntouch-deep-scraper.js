/**
 * BNTouch Deep Content Scraper
 * Extracts actual email content, campaign steps, and Content Exchange library
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

const scraped = {
  contentExchange: [],
  campaignDetails: [],
  emailContent: [],
  triggers: [],
  templates: [],
  metadata: {
    scrapedAt: new Date().toISOString()
  }
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `screenshots/deep-${name}.png`, fullPage: true });
  console.log(`  [Screenshot: ${name}]`);
}

async function login(page, context) {
  await page.goto(CONFIG.baseUrl);
  await sleep(2000);

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

async function scrapeContentExchange(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING CONTENT EXCHANGE (Pre-built Marketing Library)');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/marketing/ce/');
  await sleep(3000);
  await screenshot(page, 'content-exchange-main');

  // Get all available content categories
  const categories = await page.evaluate(() => {
    const cats = [];
    document.querySelectorAll('a, .category, .folder, [class*="category"]').forEach(el => {
      const text = el.innerText?.trim();
      const href = el.href;
      if (text && text.length > 2 && text.length < 100) {
        cats.push({ name: text, url: href });
      }
    });
    return cats;
  });

  console.log(`Found ${categories.length} items in Content Exchange`);

  // Look for content library grid/list
  const contentItems = await page.locator('.content-item, .ce-item, tr, .card').allTextContents();
  contentItems.forEach((item, i) => {
    if (item.trim().length > 10 && item.trim().length < 500) {
      scraped.contentExchange.push({
        content: item.trim(),
        index: i
      });
    }
  });

  // Try to expand/view available content
  const viewLinks = await page.locator('a[href*="ce"], a[href*="content"]').all();
  console.log(`Found ${viewLinks.length} content links to explore`);

  for (let i = 0; i < Math.min(viewLinks.length, 20); i++) {
    try {
      const href = await viewLinks[i].getAttribute('href');
      const text = await viewLinks[i].textContent();

      if (href && !href.includes('#') && !href.includes('youtube')) {
        const fullUrl = href.startsWith('http') ? href : CONFIG.baseUrl + href;
        await page.goto(fullUrl);
        await sleep(1500);

        // Extract content
        const pageContent = await page.evaluate(() => ({
          title: document.querySelector('h1, h2, .title')?.innerText || '',
          body: document.querySelector('.content, .email-body, .preview, article')?.innerHTML || '',
          text: document.body.innerText.substring(0, 3000)
        }));

        if (pageContent.title || pageContent.body) {
          scraped.contentExchange.push({
            name: text?.trim() || pageContent.title,
            url: fullUrl,
            ...pageContent
          });
          console.log(`  Content: ${(text || pageContent.title).substring(0, 50)}...`);
        }
      }
    } catch (e) {}
  }
}

async function scrapeCampaignDetails(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING INDIVIDUAL CAMPAIGN DETAILS');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Get all campaign edit links
  const campaignLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="campaign"]').forEach(a => {
      const href = a.href;
      const text = a.innerText?.trim();
      // Look for edit or show links
      if (href && (href.includes('edit=') || href.includes('show='))) {
        links.push({ text, href });
      }
    });
    return links;
  });

  console.log(`Found ${campaignLinks.length} campaigns to scrape details from`);

  // Scrape first 30 campaigns
  for (let i = 0; i < Math.min(campaignLinks.length, 30); i++) {
    const campaign = campaignLinks[i];
    console.log(`\n[${i + 1}/${Math.min(campaignLinks.length, 30)}] ${campaign.text?.substring(0, 50)}...`);

    try {
      // Go to campaign edit/view page
      await page.goto(campaign.href);
      await sleep(2000);

      // Extract campaign structure
      const details = await page.evaluate(() => {
        const data = {
          name: document.querySelector('h1, h2, .campaign-name, input[name*="name"]')?.value ||
                document.querySelector('h1, h2, .campaign-name')?.innerText || '',
          steps: [],
          triggers: [],
          emails: []
        };

        // Look for campaign steps/sequence
        document.querySelectorAll('tr, .step, .sequence-item, [class*="step"]').forEach(el => {
          const text = el.innerText?.trim();
          if (text && text.length > 5 && text.length < 500) {
            data.steps.push(text);
          }
        });

        // Look for email content previews
        document.querySelectorAll('.email-content, .preview, [class*="template"], textarea').forEach(el => {
          const content = el.value || el.innerHTML || el.innerText;
          if (content && content.length > 20) {
            data.emails.push(content.substring(0, 2000));
          }
        });

        // Look for trigger info
        document.querySelectorAll('[class*="trigger"], select[name*="trigger"]').forEach(el => {
          data.triggers.push(el.innerText || el.value);
        });

        return data;
      });

      if (details.name || details.steps.length > 0) {
        scraped.campaignDetails.push({
          ...campaign,
          ...details
        });

        if (i < 10) {
          await screenshot(page, `campaign-${i}`);
        }
      }

      // If there are step links, try to get email content
      const stepLinks = await page.locator('a[href*="step"], a[href*="email"]').all();
      for (let j = 0; j < Math.min(stepLinks.length, 5); j++) {
        try {
          const stepHref = await stepLinks[j].getAttribute('href');
          if (stepHref && !stepHref.includes('#')) {
            await page.goto(stepHref.startsWith('http') ? stepHref : CONFIG.baseUrl + stepHref);
            await sleep(1000);

            const emailContent = await page.evaluate(() => {
              return {
                subject: document.querySelector('input[name*="subject"]')?.value || '',
                body: document.querySelector('textarea, .email-body, .content, [name*="body"]')?.value ||
                      document.querySelector('.email-body, .content')?.innerHTML || '',
                preview: document.body.innerText.substring(0, 1500)
              };
            });

            if (emailContent.subject || emailContent.body) {
              scraped.emailContent.push({
                campaign: campaign.text,
                step: j + 1,
                ...emailContent
              });
            }
          }
        } catch (e) {}
      }

    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function scrapeCampaignTriggers(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING CAMPAIGN TRIGGERS');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/marketing/triggers/');
  await sleep(3000);
  await screenshot(page, 'triggers-main');

  const triggers = await page.evaluate(() => {
    const data = [];
    document.querySelectorAll('tr, .trigger-item, [class*="trigger"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 10 && text.length < 500) {
        data.push(text);
      }
    });
    return data;
  });

  console.log(`Found ${triggers.length} trigger configurations`);
  scraped.triggers = triggers;
}

async function scrapeEmailTemplates(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING EMAIL TEMPLATES');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/marketing/templates/');
  await sleep(3000);
  await screenshot(page, 'templates-main');

  // Get all template items
  const templateData = await page.evaluate(() => {
    const templates = [];

    // Look for template listings
    document.querySelectorAll('tr, .template-item, [class*="template"]').forEach(el => {
      const name = el.querySelector('a, .name, td:first-child')?.innerText?.trim();
      const link = el.querySelector('a')?.href;
      if (name && name.length > 2) {
        templates.push({ name, link });
      }
    });

    return templates;
  });

  console.log(`Found ${templateData.length} templates`);

  // Get actual template content
  for (let i = 0; i < Math.min(templateData.length, 20); i++) {
    const template = templateData[i];
    if (template.link) {
      try {
        await page.goto(template.link);
        await sleep(1500);

        const content = await page.evaluate(() => ({
          subject: document.querySelector('input[name*="subject"]')?.value || '',
          body: document.querySelector('textarea, .template-body, .content')?.value ||
                document.querySelector('.template-body, .content')?.innerHTML || '',
          name: document.querySelector('input[name*="name"]')?.value || ''
        }));

        scraped.templates.push({
          ...template,
          ...content
        });

        console.log(`  Template: ${template.name?.substring(0, 50)}`);

      } catch (e) {}
    }
  }
}

async function scrapePreviewEmails(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING EMAIL PREVIEWS FROM PENDING CAMPAIGNS');
  console.log('='.repeat(60) + '\n');

  // These are the preview URLs we found earlier
  const previewUrls = [
    '/account5/preview/html/index.php?id=2521806&campaign=297792', // Happy Thanksgiving
    '/account5/preview/html/index.php?id=2521638&campaign=297778', // Borrower Birthdays
    '/account5/preview/html/index.php?id=2521425&campaign=297753'  // BNTouch Newsletter
  ];

  for (const url of previewUrls) {
    try {
      console.log(`Fetching preview: ${url}`);
      await page.goto(CONFIG.baseUrl + url);
      await sleep(2000);

      // Get the email HTML content
      const emailHtml = await page.content();
      const emailText = await page.locator('body').textContent();

      scraped.emailContent.push({
        previewUrl: url,
        html: emailHtml,
        text: emailText.substring(0, 3000)
      });

      await screenshot(page, `preview-${previewUrls.indexOf(url)}`);

    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH DEEP CONTENT SCRAPER');
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

    await scrapeContentExchange(page);
    await scrapeCampaignTriggers(page);
    await scrapeEmailTemplates(page);
    await scrapeCampaignDetails(page);
    await scrapePreviewEmails(page);

    // Save results
    const outputFile = 'bntouch-deep-content.json';
    fs.writeFileSync(outputFile, JSON.stringify(scraped, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('DEEP SCRAPING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nResults saved to: ${outputFile}`);
    console.log(`\nSummary:`);
    console.log(`  - Content Exchange items: ${scraped.contentExchange.length}`);
    console.log(`  - Campaign Details: ${scraped.campaignDetails.length}`);
    console.log(`  - Email Content pieces: ${scraped.emailContent.length}`);
    console.log(`  - Triggers: ${scraped.triggers.length}`);
    console.log(`  - Templates: ${scraped.templates.length}`);

    console.log('\nBrowser staying open for 15 seconds...');
    await sleep(15000);

  } catch (e) {
    console.error('Error:', e.message);
    await screenshot(page, 'error');
  } finally {
    fs.writeFileSync('bntouch-deep-content.json', JSON.stringify(scraped, null, 2));
    await browser.close();
  }
}

main().catch(console.error);
