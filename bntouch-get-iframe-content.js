/**
 * BNTouch Iframe Content Extractor
 * Fetches actual email HTML from iframe sources
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  username: 'lendwisemtg',
  password: 'SGG78696G',
  baseUrl: 'https://www.bntouchmortgage.net'
};

const extractedEmails = [];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function login(page, context) {
  await page.goto(CONFIG.baseUrl);
  await sleep(2000);
  if (await page.locator('input[name="username"]').count() > 0) {
    await page.locator('input[name="username"]').fill(CONFIG.username);
    await page.locator('input[type="password"]').fill(CONFIG.password);
    await page.locator('button:has-text("Login")').click();
    await sleep(5000);
  }
  await context.storageState({ path: 'bntouch-auth.json' });
}

async function extractIframeContent(page, previewUrl, name) {
  console.log(`\nExtracting: ${name}`);
  console.log(`  URL: ${previewUrl}`);

  await page.goto(previewUrl);
  await sleep(2000);

  // Get iframe src
  const iframeSrc = await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    return iframe?.src || null;
  });

  if (iframeSrc) {
    console.log(`  Iframe src: ${iframeSrc}`);

    // Navigate directly to iframe content
    await page.goto(iframeSrc);
    await sleep(2000);

    // Get the full HTML
    const html = await page.content();
    const bodyHtml = await page.locator('body').innerHTML();

    // Save to file
    const filename = `extracted-emails/${name.replace(/[^a-z0-9]/gi, '-')}-content.html`;
    fs.writeFileSync(filename, html);
    console.log(`  Saved: ${filename} (${html.length} chars)`);

    // Take screenshot
    await page.screenshot({ path: `extracted-emails/${name.replace(/[^a-z0-9]/gi, '-')}.png`, fullPage: true });

    extractedEmails.push({
      name,
      previewUrl,
      iframeSrc,
      html,
      bodyHtml,
      chars: html.length
    });

    return html;
  } else {
    console.log(`  No iframe found`);
    return null;
  }
}

async function getAllCampaignPreviews(page) {
  console.log('\n=== GETTING ALL CAMPAIGN PREVIEW URLS ===\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Find all campaign preview links
  const previewLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="preview"]').forEach(a => {
      const row = a.closest('tr');
      const name = row?.querySelector('td a')?.innerText?.trim() || '';
      if (a.href.includes('preview/html')) {
        links.push({ name, url: a.href });
      }
    });
    return links;
  });

  console.log(`Found ${previewLinks.length} preview links`);
  return previewLinks;
}

async function extractFromCampaignSteps(page) {
  console.log('\n=== EXTRACTING FROM CAMPAIGN STEPS ===\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Get campaigns with "show" links (can view steps)
  const campaignUrls = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll('a[href*="show="]').forEach(a => {
      const name = a.innerText?.trim() || '';
      if (name && !name.includes('Spanish')) {
        urls.push({ name, url: a.href });
      }
    });
    return urls.slice(0, 30);
  });

  console.log(`Found ${campaignUrls.length} campaigns to extract steps from`);

  for (const campaign of campaignUrls) {
    console.log(`\n${campaign.name}`);
    await page.goto(campaign.url);
    await sleep(2000);

    // Look for step preview links
    const stepPreviews = await page.evaluate(() => {
      const steps = [];
      document.querySelectorAll('a[href*="preview"]').forEach(a => {
        if (a.href.includes('preview/html') || a.href.includes('preview/')) {
          const row = a.closest('tr');
          const stepNum = row?.querySelector('td')?.innerText?.trim() || '';
          steps.push({ step: stepNum, url: a.href });
        }
      });
      return steps;
    });

    console.log(`  Found ${stepPreviews.length} step previews`);

    for (let i = 0; i < Math.min(stepPreviews.length, 5); i++) {
      const step = stepPreviews[i];
      await page.goto(step.url);
      await sleep(1500);

      // Get iframe src
      const iframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe?.src || null;
      });

      if (iframeSrc) {
        await page.goto(iframeSrc);
        await sleep(1000);

        const html = await page.content();

        if (html.length > 1000) {
          const filename = `extracted-emails/${campaign.name.replace(/[^a-z0-9]/gi, '-')}-step${i + 1}.html`;
          fs.writeFileSync(filename, html);
          console.log(`    Step ${i + 1}: ${html.length} chars -> ${filename}`);

          extractedEmails.push({
            campaign: campaign.name,
            step: i + 1,
            html,
            chars: html.length
          });
        }
      }
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH IFRAME CONTENT EXTRACTOR');
  console.log('='.repeat(60) + '\n');

  fs.mkdirSync('extracted-emails', { recursive: true });

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

    // First, get the pending campaign previews we know about
    const knownPreviews = [
      { name: 'Happy-Thanksgiving-2023', url: '/account5/preview/html/index.php?id=2521806&campaign=297792' },
      { name: 'Borrower-Birthdays', url: '/account5/preview/html/index.php?id=2521638&campaign=297778' },
      { name: 'BNTouch-Newsletter', url: '/account5/preview/html/index.php?id=2521425&campaign=297753' }
    ];

    for (const preview of knownPreviews) {
      await extractIframeContent(page, CONFIG.baseUrl + preview.url, preview.name);
    }

    // Get all campaign previews from the campaigns list
    const allPreviews = await getAllCampaignPreviews(page);
    for (const preview of allPreviews.slice(0, 50)) {
      if (preview.url && !preview.name.includes('Spanish')) {
        await extractIframeContent(page, preview.url, preview.name || 'unknown');
      }
    }

    // Extract from campaign steps
    await extractFromCampaignSteps(page);

    // Save summary
    fs.writeFileSync('extracted-emails/summary.json', JSON.stringify(extractedEmails, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nTotal emails extracted: ${extractedEmails.length}`);

    // List what we got
    console.log('\nExtracted files:');
    extractedEmails.forEach(e => {
      console.log(`  - ${e.name || e.campaign}: ${e.chars} chars`);
    });

    await sleep(5000);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    fs.writeFileSync('extracted-emails/summary.json', JSON.stringify(extractedEmails, null, 2));
    await browser.close();
  }
}

main().catch(console.error);
