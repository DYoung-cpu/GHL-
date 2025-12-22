/**
 * BNTouch Content Exchange Extractor
 * Downloads all campaign content, email HTML, and templates
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

const contentLibrary = {
  campaigns: [],
  emails: [],
  sms: [],
  metadata: {
    scrapedAt: new Date().toISOString(),
    totalCampaigns: 0
  }
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
}

async function scrapeContentExchangeCategories(page) {
  console.log('\n=== SCRAPING CONTENT EXCHANGE CATEGORIES ===\n');

  const categories = [
    { name: 'All Campaigns', url: '/account5/marketing/ce?showTitle=latest' },
    { name: 'New Lead Marketing', url: '/account5/marketing/ce?showTitle=new_lead' },
    { name: 'Prospect Marketing', url: '/account5/marketing/ce?showTitle=propect' },
    { name: 'In-Processing Marketing', url: '/account5/marketing/ce?showTitle=in_processing' },
    { name: 'Post Funded Marketing', url: '/account5/marketing/ce?showTitle=funded' },
    { name: 'Long Term Marketing', url: '/account5/marketing/ce?showTitle=long_term' },
    { name: 'Partner Marketing', url: '/account5/marketing/ce?showTitle=partner' },
    { name: 'Holidays and Special Events', url: '/account5/marketing/ce?showTitle=holidays' },
    { name: 'Current Market Specials', url: '/account5/marketing/ce?showTitle=current_market' }
  ];

  const allCampaignUrls = new Set();

  for (const category of categories) {
    console.log(`\nCategory: ${category.name}`);
    await page.goto(CONFIG.baseUrl + category.url);
    await sleep(2000);

    // Get all campaign preview links
    const campaignLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href*="previewCampaign"]').forEach(a => {
        links.push({
          name: a.innerText?.trim() || '',
          url: a.href
        });
      });
      return links;
    });

    console.log(`  Found ${campaignLinks.length} campaigns`);
    campaignLinks.forEach(c => allCampaignUrls.add(JSON.stringify(c)));

    // Check for pagination - get more pages
    let pageNum = 1;
    while (pageNum < 10) {
      const nextPage = page.locator(`a[href*="page=${pageNum + 1}"]`).first();
      if (await nextPage.count() > 0) {
        await nextPage.click();
        await sleep(2000);
        pageNum++;

        const moreLinks = await page.evaluate(() => {
          const links = [];
          document.querySelectorAll('a[href*="previewCampaign"]').forEach(a => {
            links.push({
              name: a.innerText?.trim() || '',
              url: a.href
            });
          });
          return links;
        });
        moreLinks.forEach(c => allCampaignUrls.add(JSON.stringify(c)));
        console.log(`    Page ${pageNum}: +${moreLinks.length} campaigns`);
      } else {
        break;
      }
    }
  }

  return [...allCampaignUrls].map(s => JSON.parse(s));
}

async function scrapeCampaignContent(page, campaign, index, total) {
  console.log(`\n[${index + 1}/${total}] ${campaign.name.substring(0, 50)}...`);

  try {
    await page.goto(campaign.url);
    await sleep(2000);

    // Extract campaign details
    const campaignData = await page.evaluate(() => {
      const data = {
        name: '',
        description: '',
        steps: [],
        category: '',
        downloads: 0
      };

      // Get campaign name
      const title = document.querySelector('h1, h2, .campaign-title, .title');
      data.name = title?.innerText?.trim() || '';

      // Get description
      const desc = document.querySelector('.description, .campaign-description, p');
      data.description = desc?.innerText?.trim() || '';

      // Get campaign info
      document.querySelectorAll('.marketing__ce-item-info li, .info li').forEach(li => {
        const text = li.innerText?.trim();
        if (text) {
          if (text.includes('Steps:')) data.stepsCount = text;
          if (text.includes('Downloads:')) data.downloads = parseInt(text.replace(/\D/g, '')) || 0;
          if (text.includes('Maximum')) data.maxDate = text;
        }
      });

      return data;
    });

    // Now get the actual email content - click on preview/view steps
    const stepLinks = await page.locator('a[href*="step"], .step-preview, [data-step-id]').all();
    console.log(`  Found ${stepLinks.length} steps`);

    const steps = [];

    // Try to get step previews
    for (let i = 0; i < Math.min(stepLinks.length, 20); i++) {
      try {
        const stepId = await stepLinks[i].getAttribute('data-step-id');
        if (stepId) {
          // Try to load step preview
          const previewUrl = `${CONFIG.baseUrl}/account5/marketing/ce/preview?stepId=${stepId}`;

          const stepPage = await page.context().newPage();
          await stepPage.goto(previewUrl);
          await sleep(1500);

          const stepContent = await stepPage.evaluate(() => {
            return {
              subject: document.querySelector('.subject, [class*="subject"]')?.innerText || '',
              body: document.querySelector('.email-body, .content, body')?.innerHTML || '',
              text: document.body?.innerText?.substring(0, 3000) || ''
            };
          });

          if (stepContent.body || stepContent.text) {
            steps.push({
              stepId,
              stepNumber: i + 1,
              ...stepContent
            });
          }

          await stepPage.close();
        }
      } catch (e) {}
    }

    // Also try to get email content from the current page
    const emailPreviews = await page.evaluate(() => {
      const emails = [];
      document.querySelectorAll('.email-preview, .step-content, iframe').forEach((el, i) => {
        if (el.tagName === 'IFRAME') {
          // Can't access iframe content due to cross-origin
        } else {
          emails.push({
            index: i,
            html: el.innerHTML,
            text: el.innerText?.substring(0, 2000)
          });
        }
      });
      return emails;
    });

    campaignData.steps = steps;
    campaignData.emailPreviews = emailPreviews;
    campaignData.url = campaign.url;

    contentLibrary.campaigns.push(campaignData);

    // Save progress periodically
    if ((index + 1) % 10 === 0) {
      fs.writeFileSync('bntouch-content-library.json', JSON.stringify(contentLibrary, null, 2));
      console.log(`  [Saved progress: ${index + 1} campaigns]`);
    }

    return campaignData;

  } catch (e) {
    console.log(`  Error: ${e.message.substring(0, 50)}`);
    return null;
  }
}

async function downloadCampaign(page, campaignId) {
  // Try to download/add campaign to account (this copies the content)
  try {
    const downloadUrl = `${CONFIG.baseUrl}/account5/marketing/ce?downloadCampaign=${campaignId}`;
    await page.goto(downloadUrl);
    await sleep(2000);
    return true;
  } catch (e) {
    return false;
  }
}

async function scrapeMyDownloadedCampaigns(page) {
  console.log('\n=== SCRAPING DOWNLOADED CAMPAIGNS (Full Content) ===\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Get all campaigns with edit access
  const editLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="edit="]').forEach(a => {
      const row = a.closest('tr');
      const name = row?.querySelector('td:first-child a')?.innerText || '';
      links.push({
        name: name.trim(),
        editUrl: a.href
      });
    });
    return links;
  });

  console.log(`Found ${editLinks.length} editable campaigns`);

  for (let i = 0; i < editLinks.length; i++) {
    const campaign = editLinks[i];
    console.log(`\n[${i + 1}/${editLinks.length}] ${campaign.name.substring(0, 40)}...`);

    try {
      await page.goto(campaign.editUrl);
      await sleep(2000);

      // Get all steps
      const steps = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll('tr.step-row, .campaign-step, [class*="step"]').forEach((row, i) => {
          const stepData = {
            index: i,
            text: row.innerText?.substring(0, 500)
          };

          // Look for edit links within step
          const editLink = row.querySelector('a[href*="edit"]');
          if (editLink) stepData.editUrl = editLink.href;

          data.push(stepData);
        });
        return data;
      });

      // For each step, get the actual email content
      for (const step of steps.slice(0, 30)) {
        if (step.editUrl) {
          try {
            await page.goto(step.editUrl);
            await sleep(1500);

            const emailContent = await page.evaluate(() => {
              return {
                subject: document.querySelector('input[name*="subject"]')?.value ||
                         document.querySelector('.subject')?.innerText || '',
                body: document.querySelector('textarea[name*="body"]')?.value ||
                      document.querySelector('.mce-content-body')?.innerHTML ||
                      document.querySelector('[class*="editor"]')?.innerHTML || '',
                smsText: document.querySelector('textarea[name*="sms"]')?.value || '',
                fromName: document.querySelector('input[name*="from"]')?.value || '',
                delay: document.querySelector('input[name*="delay"], select[name*="delay"]')?.value || ''
              };
            });

            if (emailContent.subject || emailContent.body || emailContent.smsText) {
              contentLibrary.emails.push({
                campaign: campaign.name,
                stepIndex: step.index,
                ...emailContent
              });
              console.log(`    Step ${step.index + 1}: ${emailContent.subject?.substring(0, 40) || 'SMS'}`);
            }
          } catch (e) {}
        }
      }

    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH CONTENT LIBRARY EXTRACTOR');
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

    // First, get all campaign URLs from Content Exchange
    const allCampaigns = await scrapeContentExchangeCategories(page);
    console.log(`\nTotal unique campaigns found: ${allCampaigns.length}`);
    contentLibrary.metadata.totalCampaigns = allCampaigns.length;

    // Scrape each campaign's content
    for (let i = 0; i < allCampaigns.length; i++) {
      await scrapeCampaignContent(page, allCampaigns[i], i, allCampaigns.length);
    }

    // Also scrape campaigns already in the account (full edit access)
    await scrapeMyDownloadedCampaigns(page);

    // Save final results
    fs.writeFileSync('bntouch-content-library.json', JSON.stringify(contentLibrary, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nSaved to: bntouch-content-library.json`);
    console.log(`\nSummary:`);
    console.log(`  - Campaigns scraped: ${contentLibrary.campaigns.length}`);
    console.log(`  - Email templates: ${contentLibrary.emails.length}`);
    console.log(`  - SMS templates: ${contentLibrary.sms.length}`);

    await sleep(10000);

  } catch (e) {
    console.error('Error:', e.message);
    fs.writeFileSync('bntouch-content-library.json', JSON.stringify(contentLibrary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
