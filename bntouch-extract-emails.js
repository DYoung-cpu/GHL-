/**
 * BNTouch Email Content Extractor
 * Extracts actual email HTML by clicking into campaign steps
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
    console.log('Logging in...');
    await page.locator('input[name="username"]').fill(CONFIG.username);
    await page.locator('input[type="password"]').fill(CONFIG.password);
    await page.locator('button:has-text("Login")').click();
    await sleep(5000);
  }
  await context.storageState({ path: 'bntouch-auth.json' });
}

async function extractEmailFromCampaignPreview(page, campaignId, campaignName) {
  console.log(`\nExtracting: ${campaignName} (ID: ${campaignId})`);

  const previewUrl = `${CONFIG.baseUrl}/account5/marketing/ce?previewCampaign=${campaignId}`;
  await page.goto(previewUrl);
  await sleep(3000);

  // Look for step preview images/buttons - these should show the actual email
  const stepElements = await page.locator('[data-step-id], .step-preview, .marketing__ce-item-image').all();
  console.log(`  Found ${stepElements.length} step elements`);

  for (let i = 0; i < stepElements.length; i++) {
    try {
      const stepId = await stepElements[i].getAttribute('data-step-id');
      console.log(`  Step ${i + 1}: ${stepId}`);

      if (stepId) {
        // Click to view the step preview
        await stepElements[i].click();
        await sleep(2000);

        // Check for modal/popup with email content
        const modalContent = await page.locator('.modal-body, .preview-content, .email-preview').first();
        if (await modalContent.count() > 0) {
          const html = await modalContent.innerHTML();
          extractedEmails.push({
            campaign: campaignName,
            campaignId,
            stepIndex: i + 1,
            stepId,
            html,
            type: 'modal'
          });
          console.log(`    Captured modal content (${html.length} chars)`);

          // Close modal
          await page.keyboard.press('Escape');
          await sleep(500);
        }

        // Check for iframes
        const iframes = await page.locator('iframe').all();
        for (const iframe of iframes) {
          try {
            const frame = await iframe.contentFrame();
            if (frame) {
              const frameHtml = await frame.content();
              if (frameHtml.length > 500) {
                extractedEmails.push({
                  campaign: campaignName,
                  campaignId,
                  stepIndex: i + 1,
                  stepId,
                  html: frameHtml,
                  type: 'iframe'
                });
                console.log(`    Captured iframe content (${frameHtml.length} chars)`);
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.log(`    Error: ${e.message.substring(0, 50)}`);
    }
  }
}

async function extractFromDirectPreviewUrls(page) {
  console.log('\n=== EXTRACTING FROM DIRECT PREVIEW URLS ===\n');

  // These are preview URLs we found earlier for pending emails
  const previewUrls = [
    { name: 'Happy Thanksgiving', url: '/account5/preview/html/index.php?id=2521806&campaign=297792' },
    { name: 'Borrower Birthdays', url: '/account5/preview/html/index.php?id=2521638&campaign=297778' },
    { name: 'BNTouch Newsletter', url: '/account5/preview/html/index.php?id=2521425&campaign=297753' }
  ];

  for (const preview of previewUrls) {
    console.log(`Fetching: ${preview.name}`);
    await page.goto(CONFIG.baseUrl + preview.url);
    await sleep(2000);

    const html = await page.content();
    const bodyText = await page.locator('body').innerHTML();

    extractedEmails.push({
      campaign: preview.name,
      url: preview.url,
      fullHtml: html,
      bodyHtml: bodyText,
      type: 'direct-preview'
    });

    // Save individual email file
    const filename = `extracted-emails/${preview.name.replace(/[^a-z0-9]/gi, '-')}.html`;
    fs.mkdirSync('extracted-emails', { recursive: true });
    fs.writeFileSync(filename, html);
    console.log(`  Saved: ${filename} (${html.length} chars)`);
  }
}

async function extractFromScreenshotServer(page) {
  console.log('\n=== TRYING SCREENSHOT SERVER PREVIEWS ===\n');

  // BNTouch uses a screenshot server for email previews
  // Try to access step previews directly

  const campaignIds = [
    { id: '400', name: 'Thanksgiving Day 2017-2026' },
    { id: '406', name: 'Happy Holidays 2017-2026' },
    { id: '1696', name: 'Happy Thanksgiving 2023-2032' },
    { id: '348', name: 'The Adviser Series (Blue)' },
    { id: '1700', name: 'Time Change Reminders' }
  ];

  for (const campaign of campaignIds) {
    console.log(`\nCampaign: ${campaign.name}`);
    await page.goto(`${CONFIG.baseUrl}/account5/marketing/ce?previewCampaign=${campaign.id}`);
    await sleep(3000);

    // Get step IDs from the page
    const stepIds = await page.evaluate(() => {
      const ids = [];
      document.querySelectorAll('[data-step-id]').forEach(el => {
        ids.push(el.getAttribute('data-step-id'));
      });
      return ids;
    });

    console.log(`  Found ${stepIds.length} step IDs: ${stepIds.slice(0, 3).join(', ')}...`);

    // Try to get content from each step
    for (let i = 0; i < Math.min(stepIds.length, 5); i++) {
      const stepId = stepIds[i];

      // Try various preview URL patterns
      const previewUrls = [
        `${CONFIG.baseUrl}/account5/marketing/ce/step-preview?id=${stepId}`,
        `${CONFIG.baseUrl}/account5/marketing/ce/preview?stepId=${stepId}`,
        `https://ss.prettyfiles.com/${stepId}.png` // Screenshot server
      ];

      for (const url of previewUrls) {
        try {
          const response = await page.goto(url, { timeout: 5000 });
          if (response && response.status() === 200) {
            const content = await page.content();
            if (content.length > 500 && !content.includes('404')) {
              extractedEmails.push({
                campaign: campaign.name,
                stepId,
                stepIndex: i + 1,
                url,
                html: content,
                type: 'step-preview'
              });
              console.log(`    Step ${i + 1}: Got content from ${url.substring(0, 50)}...`);
              break;
            }
          }
        } catch (e) {}
      }
    }
  }
}

async function extractFromEditableCampaigns(page) {
  console.log('\n=== EXTRACTING FROM EDITABLE CAMPAIGNS ===\n');

  await page.goto(CONFIG.baseUrl + '/account5/campaign');
  await sleep(3000);

  // Get campaigns that we can edit (have full access)
  const editableUrls = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll('a[href*="edit="]').forEach(a => {
      const row = a.closest('tr');
      const name = row?.querySelector('a')?.innerText?.trim() || '';
      if (name.includes('CE:') || name.includes('Happy') || name.includes('Birthday')) {
        urls.push({ name, editUrl: a.href });
      }
    });
    return urls.slice(0, 20);
  });

  console.log(`Found ${editableUrls.length} editable campaigns to extract`);

  for (const campaign of editableUrls) {
    console.log(`\n${campaign.name}`);
    await page.goto(campaign.editUrl);
    await sleep(2000);

    // Look for step edit links
    const stepLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href*="step"], a[href*="edit"]').forEach(a => {
        if (a.href.includes('step') || a.href.includes('email')) {
          links.push(a.href);
        }
      });
      return [...new Set(links)].slice(0, 10);
    });

    console.log(`  Found ${stepLinks.length} step links`);

    for (const stepUrl of stepLinks) {
      try {
        await page.goto(stepUrl);
        await sleep(1500);

        // Extract email content from edit form
        const emailData = await page.evaluate(() => {
          return {
            subject: document.querySelector('input[name*="subject"], input[name*="Subject"]')?.value || '',
            body: document.querySelector('textarea[name*="body"], textarea[name*="content"], .mce-content-body')?.value ||
                  document.querySelector('.mce-content-body')?.innerHTML ||
                  document.querySelector('[id*="editor"], [class*="editor"]')?.innerHTML || '',
            fromName: document.querySelector('input[name*="from"]')?.value || '',
            html: document.body.innerHTML
          };
        });

        if (emailData.subject || emailData.body) {
          extractedEmails.push({
            campaign: campaign.name,
            stepUrl,
            subject: emailData.subject,
            body: emailData.body,
            fromName: emailData.fromName,
            type: 'edit-form'
          });
          console.log(`    Subject: ${emailData.subject?.substring(0, 50) || '(no subject)'}`);
        }
      } catch (e) {}
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  BNTOUCH EMAIL CONTENT EXTRACTOR');
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

    // Method 1: Direct preview URLs (best quality)
    await extractFromDirectPreviewUrls(page);

    // Method 2: From editable campaigns
    await extractFromEditableCampaigns(page);

    // Method 3: Screenshot server previews
    await extractFromScreenshotServer(page);

    // Save all extracted emails
    fs.writeFileSync('extracted-emails/all-emails.json', JSON.stringify(extractedEmails, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nTotal emails extracted: ${extractedEmails.length}`);
    console.log(`Files saved to: extracted-emails/`);

    // Summary by type
    const byType = {};
    extractedEmails.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });
    console.log('\nBy type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    await sleep(10000);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    fs.writeFileSync('extracted-emails/all-emails.json', JSON.stringify(extractedEmails, null, 2));
    await browser.close();
  }
}

main().catch(console.error);
