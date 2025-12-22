/**
 * BNTouch Complete Workflow Audit
 * Extracts ALL campaigns, triggers, loan status automations, and Encompass integrations
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

const audit = {
  campaigns: [],
  triggers: [],
  loanStatusAutomations: [],
  encompassIntegrations: [],
  workflowCategories: [],
  allSteps: [],
  metadata: {
    scrapedAt: new Date().toISOString(),
    totalCampaigns: 0,
    totalSteps: 0,
    totalTriggers: 0
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
  console.log('Logged in!\n');
}

async function scrapeAllTriggers(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING ALL CAMPAIGN TRIGGERS');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/marketing/triggers/');
  await sleep(3000);

  // Get all triggers from the table
  const triggers = await page.evaluate(() => {
    const data = [];
    document.querySelectorAll('tr').forEach((row, i) => {
      if (i === 0) return; // Skip header
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        data.push({
          index: i,
          campaignName: cells[0]?.innerText?.trim() || '',
          addCondition: cells[1]?.innerText?.trim() || '',
          removeCondition: cells[2]?.innerText?.trim() || '',
          created: cells[3]?.innerText?.trim() || ''
        });
      }
    });
    return data;
  });

  console.log(`Found ${triggers.length} triggers`);
  audit.triggers = triggers;

  // Categorize triggers by type
  const triggerTypes = {
    loanStatus: [],
    birthday: [],
    holiday: [],
    timeChange: [],
    newsletter: [],
    other: []
  };

  triggers.forEach(t => {
    const name = t.campaignName.toLowerCase();
    if (name.includes('birthday')) triggerTypes.birthday.push(t);
    else if (name.includes('happy') || name.includes('holiday') || name.includes('christmas') || name.includes('thanksgiving')) triggerTypes.holiday.push(t);
    else if (name.includes('time change')) triggerTypes.timeChange.push(t);
    else if (name.includes('newsletter')) triggerTypes.newsletter.push(t);
    else if (name.includes('processing') || name.includes('funded') || name.includes('approved') || name.includes('submitted')) triggerTypes.loanStatus.push(t);
    else triggerTypes.other.push(t);
  });

  console.log('\nTrigger breakdown:');
  console.log(`  Loan Status: ${triggerTypes.loanStatus.length}`);
  console.log(`  Birthday: ${triggerTypes.birthday.length}`);
  console.log(`  Holiday: ${triggerTypes.holiday.length}`);
  console.log(`  Time Change: ${triggerTypes.timeChange.length}`);
  console.log(`  Newsletter: ${triggerTypes.newsletter.length}`);
  console.log(`  Other: ${triggerTypes.other.length}`);

  audit.triggerTypes = triggerTypes;

  // Take screenshot
  await page.screenshot({ path: 'bntouch-audit/triggers-all.png', fullPage: true });
}

async function scrapeAllCampaignsDetailed(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING ALL CAMPAIGNS WITH FULL DETAILS');
  console.log('='.repeat(60) + '\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Get count of total campaigns
  const totalText = await page.locator('.pagination, .total, [class*="count"]').first().textContent().catch(() => '');
  console.log(`Pagination info: ${totalText}`);

  // Get all campaigns with their details
  let allCampaigns = [];
  let pageNum = 1;
  let hasMore = true;

  while (hasMore && pageNum <= 10) {
    console.log(`\nScraping campaign list page ${pageNum}...`);

    const campaigns = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('tr').forEach((row, i) => {
        if (i === 0) return; // Skip header

        const nameLink = row.querySelector('td a');
        const cells = row.querySelectorAll('td');

        if (nameLink && cells.length >= 5) {
          const showLink = row.querySelector('a[href*="show="]');
          const editLink = row.querySelector('a[href*="edit="]');

          data.push({
            name: nameLink.innerText?.trim() || '',
            showUrl: showLink?.href || '',
            editUrl: editLink?.href || '',
            steps: cells[1]?.innerText?.trim() || '',
            length: cells[2]?.innerText?.trim() || '',
            triggers: cells[4]?.innerText?.trim() || '',
            status: cells[5]?.innerText?.trim() || ''
          });
        }
      });
      return data;
    });

    allCampaigns = allCampaigns.concat(campaigns);
    console.log(`  Found ${campaigns.length} campaigns on this page`);

    // Check for next page
    const nextBtn = page.locator('a:has-text("Next"), a[href*="page=' + (pageNum + 1) + '"]').first();
    if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
      await nextBtn.click();
      await sleep(2000);
      pageNum++;
    } else {
      hasMore = false;
    }
  }

  console.log(`\nTotal campaigns found: ${allCampaigns.length}`);
  audit.campaigns = allCampaigns;
  audit.metadata.totalCampaigns = allCampaigns.length;
}

async function scrapeCampaignStepsDetailed(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING DETAILED CAMPAIGN STEPS');
  console.log('='.repeat(60) + '\n');

  // Get campaigns that have show URLs
  const campaignsToScrape = audit.campaigns.filter(c => c.showUrl).slice(0, 50);

  console.log(`Scraping details for ${campaignsToScrape.length} campaigns...\n`);

  for (let i = 0; i < campaignsToScrape.length; i++) {
    const campaign = campaignsToScrape[i];
    console.log(`[${i + 1}/${campaignsToScrape.length}] ${campaign.name}`);

    try {
      await page.goto(campaign.showUrl);
      await sleep(2000);

      // Extract step details
      const steps = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll('tr').forEach((row, i) => {
          if (i === 0) return;

          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const previewLink = row.querySelector('a[href*="preview"]');
            const editLink = row.querySelector('a[href*="edit"]');

            data.push({
              stepNum: cells[0]?.innerText?.trim() || '',
              subject: cells[1]?.innerText?.trim() || '',
              method: cells[2]?.innerText?.trim() || '', // Email, SMS, Task, etc.
              delay: cells[3]?.innerText?.trim() || '',
              recipient: cells[4]?.innerText?.trim() || '',
              previewUrl: previewLink?.href || '',
              editUrl: editLink?.href || ''
            });
          }
        });
        return data;
      });

      campaign.stepsDetail = steps;
      audit.allSteps.push(...steps.map(s => ({ ...s, campaign: campaign.name })));

      console.log(`  ${steps.length} steps: ${steps.map(s => s.method).join(', ')}`);

    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 50)}`);
    }
  }

  audit.metadata.totalSteps = audit.allSteps.length;
}

async function scrapeLoanStatusAutomations(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING LOAN STATUS AUTOMATIONS');
  console.log('='.repeat(60) + '\n');

  // Find all campaigns related to loan processing stages
  const loanKeywords = [
    'application', 'processing', 'underwriting', 'approved', 'conditional',
    'clear to close', 'funded', 'submitted', 'received', 'pre-qual',
    'pre-approval', 'appraisal', 'docs', 'closing'
  ];

  const loanCampaigns = audit.campaigns.filter(c => {
    const name = c.name.toLowerCase();
    return loanKeywords.some(k => name.includes(k));
  });

  console.log(`Found ${loanCampaigns.length} loan status related campaigns:\n`);

  loanCampaigns.forEach(c => {
    console.log(`  - ${c.name}`);
    console.log(`    Steps: ${c.steps}, Triggers: ${c.triggers}`);
  });

  audit.loanStatusAutomations = loanCampaigns;

  // Save to separate file for analysis
  fs.writeFileSync('bntouch-audit/loan-status-campaigns.json', JSON.stringify(loanCampaigns, null, 2));
}

async function scrapeEncompassIntegration(page) {
  console.log('\n' + '='.repeat(60));
  console.log('LOOKING FOR ENCOMPASS/LOS INTEGRATION');
  console.log('='.repeat(60) + '\n');

  // Check Options for Encompass settings
  await page.goto(CONFIG.baseUrl + '/account5/options/');
  await sleep(2000);

  // Look for Encompass, LOS, or integration settings
  const optionsContent = await page.content();

  const integrationKeywords = ['encompass', 'los', 'sync', 'integration', 'import', 'webhook', 'api'];
  const foundIntegrations = [];

  for (const keyword of integrationKeywords) {
    if (optionsContent.toLowerCase().includes(keyword)) {
      foundIntegrations.push(keyword);
    }
  }

  console.log('Integration keywords found in Options:', foundIntegrations);

  // Look for specific integration links
  const integrationLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const text = a.innerText?.toLowerCase() || '';
      const href = a.href?.toLowerCase() || '';
      if (text.includes('encompass') || text.includes('integration') || text.includes('sync') ||
          href.includes('encompass') || href.includes('integration') || href.includes('los')) {
        links.push({ text: a.innerText?.trim(), href: a.href });
      }
    });
    return links;
  });

  console.log('Integration links found:', integrationLinks.length);
  integrationLinks.forEach(l => console.log(`  - ${l.text}: ${l.href}`));

  await page.screenshot({ path: 'bntouch-audit/options-page.png', fullPage: true });

  // Check for Import/Export options
  await page.goto(CONFIG.baseUrl + '/account5/options/import/');
  await sleep(2000);
  await page.screenshot({ path: 'bntouch-audit/import-options.png', fullPage: true });

  const importContent = await page.evaluate(() => document.body.innerText);
  audit.encompassIntegrations = {
    keywords: foundIntegrations,
    links: integrationLinks,
    importPageContent: importContent.substring(0, 3000)
  };
}

async function scrapeContentExchangeComplete(page) {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING COMPLETE CONTENT EXCHANGE LIBRARY');
  console.log('='.repeat(60) + '\n');

  const categories = [
    { name: 'All Campaigns', url: '?showTitle=latest' },
    { name: 'New Lead Marketing', url: '?showTitle=new_lead' },
    { name: 'Prospect Marketing', url: '?showTitle=propect' },
    { name: 'In-Processing Marketing', url: '?showTitle=in_processing' },
    { name: 'Post Funded Marketing', url: '?showTitle=funded' },
    { name: 'Long Term Marketing', url: '?showTitle=long_term' },
    { name: 'Co-Branded Marketing', url: '?showTitle=co_branded' },
    { name: 'Partner Marketing', url: '?showTitle=partner' },
    { name: 'Recruiting Materials', url: '?showTitle=recruiting' },
    { name: 'Holidays and Special Events', url: '?showTitle=holidays' },
    { name: 'Current Market Specials', url: '?showTitle=current_market' }
  ];

  for (const category of categories) {
    console.log(`\nCategory: ${category.name}`);
    await page.goto(CONFIG.baseUrl + '/account5/marketing/ce' + category.url);
    await sleep(2000);

    // Get all campaigns in this category
    const campaigns = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('.marketing__ce-item, .campaign-item').forEach(item => {
        const title = item.querySelector('h3 a, .title a')?.innerText?.trim() || '';
        const description = item.querySelector('.marketing__ce-description, .description')?.innerText?.trim() || '';
        const info = {};

        item.querySelectorAll('.marketing__ce-item-info li, .info li').forEach(li => {
          const text = li.innerText?.trim();
          if (text.includes('Maximum Interval')) info.maxInterval = text;
          if (text.includes('Steps Methods')) info.stepMethods = text;
          if (text.includes('Maximum Date')) info.maxDate = text;
          if (text.includes('Steps For')) info.stepsFor = text;
        });

        if (title) {
          data.push({ title, description, ...info });
        }
      });
      return data;
    });

    console.log(`  Found ${campaigns.length} campaigns`);

    audit.workflowCategories.push({
      category: category.name,
      campaigns,
      count: campaigns.length
    });
  }
}

async function generateComparisonReport() {
  console.log('\n' + '='.repeat(60));
  console.log('GENERATING COMPARISON REPORT');
  console.log('='.repeat(60) + '\n');

  // Load GHL workflows template
  let ghlWorkflows = [];
  try {
    const ghlData = fs.readFileSync('templates/workflows-templates.json', 'utf8');
    ghlWorkflows = JSON.parse(ghlData);
  } catch (e) {
    console.log('Could not load GHL workflows template');
  }

  // Create comparison
  const comparison = {
    bntouch: {
      totalCampaigns: audit.campaigns.length,
      totalTriggers: audit.triggers.length,
      loanStatusCampaigns: audit.loanStatusAutomations.length,
      categories: audit.workflowCategories.map(c => ({ name: c.category, count: c.count }))
    },
    ghl: {
      totalWorkflows: ghlWorkflows.length,
      workflows: ghlWorkflows.map(w => w.name)
    },
    gaps: [],
    recommendations: []
  };

  // Identify gaps
  const bntouchLoanStages = [
    'Application Received', 'Application Completed', 'Pre-Approved',
    'Submitted to Processing', 'Submitted to Underwriting',
    'Approved', 'Approved With Conditions', 'Appraisal Ordered',
    'Appraisal Received', 'Final Docs Ready', 'Clear to Close', 'Funded'
  ];

  const ghlStages = ghlWorkflows.map(w => w.trigger?.value || '').filter(Boolean);

  bntouchLoanStages.forEach(stage => {
    if (!ghlStages.some(g => g.toLowerCase().includes(stage.toLowerCase()))) {
      comparison.gaps.push({
        type: 'missing_loan_stage',
        stage,
        description: `BNTouch has automation for "${stage}" but GHL may be missing this`
      });
    }
  });

  // Check for missing campaign types
  const bntouchCampaignTypes = [
    'New Lead Follow-Up', 'Partner Co-Branded', 'Realtor Trust Building',
    'Corporate Benefits', 'E-Marketing Tips', 'Previously Funded Follow-Up',
    'First Time Home Buyers', 'Refinance vs Purchase specific'
  ];

  bntouchCampaignTypes.forEach(type => {
    if (!ghlWorkflows.some(w => w.name.toLowerCase().includes(type.toLowerCase().split(' ')[0]))) {
      comparison.gaps.push({
        type: 'missing_campaign_type',
        campaignType: type,
        description: `BNTouch has "${type}" campaigns that may enhance GHL`
      });
    }
  });

  comparison.recommendations = [
    'Add loan status triggers for: Application Received, Appraisal Ordered/Received, Final Docs Ready',
    'Create Partner/Realtor specific nurture sequences',
    'Add First Time Home Buyer educational series',
    'Implement 12-year birthday/anniversary sequences',
    'Add refinance-specific vs purchase-specific follow-ups',
    'Create Encompass webhook triggers for real-time loan status updates'
  ];

  audit.comparison = comparison;

  fs.writeFileSync('bntouch-audit/comparison-report.json', JSON.stringify(comparison, null, 2));
  console.log('Comparison report saved to bntouch-audit/comparison-report.json');
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH COMPLETE WORKFLOW AUDIT');
  console.log('='.repeat(60) + '\n');

  fs.mkdirSync('bntouch-audit', { recursive: true });

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

    // 1. Get all triggers
    await scrapeAllTriggers(page);

    // 2. Get all campaigns with details
    await scrapeAllCampaignsDetailed(page);

    // 3. Get detailed steps for each campaign
    await scrapeCampaignStepsDetailed(page);

    // 4. Identify loan status automations
    await scrapeLoanStatusAutomations(page);

    // 5. Check for Encompass/LOS integration
    await scrapeEncompassIntegration(page);

    // 6. Scrape complete Content Exchange
    await scrapeContentExchangeComplete(page);

    // 7. Generate comparison report
    await generateComparisonReport();

    // Save complete audit
    fs.writeFileSync('bntouch-audit/complete-audit.json', JSON.stringify(audit, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('AUDIT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Total Campaigns: ${audit.metadata.totalCampaigns}`);
    console.log(`  Total Triggers: ${audit.triggers.length}`);
    console.log(`  Total Steps: ${audit.metadata.totalSteps}`);
    console.log(`  Loan Status Campaigns: ${audit.loanStatusAutomations.length}`);
    console.log(`  Content Exchange Categories: ${audit.workflowCategories.length}`);
    console.log(`\nFiles saved to: bntouch-audit/`);

    await sleep(5000);

  } catch (e) {
    console.error('Error:', e.message);
    fs.writeFileSync('bntouch-audit/complete-audit.json', JSON.stringify(audit, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
