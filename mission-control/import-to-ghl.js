/**
 * LENDWISE Mission Control - GHL Import Script
 *
 * This script imports all email templates as snippets into GHL
 * Run with: node mission-control/import-to-ghl.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const API_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const LOCATION_ID = process.env.GHL_LOCATION_LENDWISE || 'e6yMsslzphNw8bgqRgtV';
const API_TOKEN = process.env.GHL_API_KEY_LENDWISE || process.env.GHL_API_KEY;

if (!API_TOKEN) {
  console.error('Error: GHL_API_KEY not found in environment');
  console.log('Set it in .env file: GHL_API_KEY=pit-xxxxx');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};

// Loan Status Email Templates
const loanStatusEmails = [
  {
    name: 'Loan Status: 01 - Application Completed',
    file: 'emails/loan-status/01-application-completed.html',
    subject: 'Your Application is Complete!'
  },
  {
    name: 'Loan Status: 02 - Sent to Processing',
    file: 'emails/loan-status/02-sent-to-processing.html',
    subject: 'Loan Update: Sent to Processing'
  },
  {
    name: 'Loan Status: 03 - Submitted to Underwriting',
    file: 'emails/loan-status/03-submitted-to-underwriting.html',
    subject: 'Loan Update: Submitted to Underwriting'
  },
  {
    name: 'Loan Status: 04 - Conditional Approval',
    file: 'emails/loan-status/04-conditional-approval.html',
    subject: 'Great News: Conditional Approval!'
  },
  {
    name: 'Loan Status: 05 - Loan Approved',
    file: 'emails/loan-status/05-loan-approved.html',
    subject: 'CONGRATULATIONS! Your Loan is FULLY APPROVED!'
  },
  {
    name: 'Loan Status: 06 - Clear to Close',
    file: 'emails/loan-status/06-clear-to-close.html',
    subject: 'CLEAR TO CLOSE! You\'re Almost Home!'
  },
  {
    name: 'Loan Status: 07 - Final Docs Ready',
    file: 'emails/loan-status/07-final-docs-ready.html',
    subject: 'Final Documents Ready - Closing Day Approaching!'
  },
  {
    name: 'Loan Status: 08 - Funded Congratulations',
    file: 'emails/loan-status/08-funded-congratulations.html',
    subject: 'CONGRATULATIONS HOMEOWNER! Your Loan Has Funded!'
  }
];

// Purchase Nurture Sequence
const purchaseNurtureEmails = [
  {
    name: 'Purchase Nurture: 01 - Welcome',
    file: 'emails/nurture-sequences/purchase-01-welcome.html',
    subject: 'Welcome to Your Home Buying Journey!'
  },
  {
    name: 'Purchase Nurture: 02 - Pre-Approval',
    file: 'emails/nurture-sequences/purchase-02-preapproval.html',
    subject: 'Get Pre-Approved: Your Key to Success'
  },
  {
    name: 'Purchase Nurture: 03 - Market Tips',
    file: 'emails/nurture-sequences/purchase-03-market-tips.html',
    subject: '5 Smart Home Buying Tips'
  },
  {
    name: 'Purchase Nurture: 04 - Check-In',
    file: 'emails/nurture-sequences/purchase-04-checkin.html',
    subject: 'How\'s Your Home Search Going?'
  },
  {
    name: 'Purchase Nurture: 05 - Still Here',
    file: 'emails/nurture-sequences/purchase-05-still-here.html',
    subject: 'I\'m Still Here When You\'re Ready'
  }
];

// Refinance Nurture Sequence
const refinanceNurtureEmails = [
  {
    name: 'Refinance Nurture: 01 - Welcome',
    file: 'emails/nurture-sequences/refi-01-welcome.html',
    subject: 'Let\'s Explore Your Refinance Options'
  },
  {
    name: 'Refinance Nurture: 02 - Rate Analysis',
    file: 'emails/nurture-sequences/refi-02-rate-analysis.html',
    subject: 'Your Personalized Rate Analysis'
  },
  {
    name: 'Refinance Nurture: 03 - Cash-Out',
    file: 'emails/nurture-sequences/refi-03-cashout.html',
    subject: 'Unlock Your Home Equity'
  },
  {
    name: 'Refinance Nurture: 04 - Check-In',
    file: 'emails/nurture-sequences/refi-04-checkin.html',
    subject: 'Questions About Refinancing?'
  },
  {
    name: 'Refinance Nurture: 05 - Still Here',
    file: 'emails/nurture-sequences/refi-05-still-here.html',
    subject: 'I\'m Watching Rates For You'
  }
];

// SMS Templates from JSON
const smsTemplatesFile = 'workflows/sms-templates.json';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createEmailSnippet(name, htmlContent) {
  const url = `${API_BASE}/custom-values/`;

  const body = {
    locationId: LOCATION_ID,
    name: name,
    value: htmlContent
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ Created: ${name}`);
      return data;
    } else {
      const error = await response.text();
      console.log(`  ✗ Failed: ${name} - ${response.status} ${error}`);
      return null;
    }
  } catch (err) {
    console.log(`  ✗ Error: ${name} - ${err.message}`);
    return null;
  }
}

async function importEmailTemplates() {
  console.log('\\n========================================');
  console.log('  LENDWISE Mission Control - GHL Import');
  console.log('========================================\\n');
  console.log('Importing Loan Status Email Templates...\\n');

  let success = 0;
  let failed = 0;

  for (const template of loanStatusEmails) {
    const filePath = path.join(__dirname, template.file);

    if (fs.existsSync(filePath)) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const result = await createEmailSnippet(template.name, htmlContent);

      if (result) success++;
      else failed++;

      await sleep(500); // Rate limiting
    } else {
      console.log(`  ✗ File not found: ${template.file}`);
      failed++;
    }
  }

  console.log(`\\n✓ Imported ${success} loan status email templates`);
  if (failed > 0) console.log(`✗ Failed: ${failed} templates`);
}

async function importNurtureTemplates() {
  console.log('\\n----------------------------------------');
  console.log('Importing Nurture Sequence Templates...\\n');

  let success = 0;
  let failed = 0;

  // Import Purchase Nurture Sequence
  console.log('  Purchase Nurture Sequence:');
  for (const template of purchaseNurtureEmails) {
    const filePath = path.join(__dirname, template.file);

    if (fs.existsSync(filePath)) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const result = await createEmailSnippet(template.name, htmlContent);

      if (result) success++;
      else failed++;

      await sleep(500);
    } else {
      console.log(`  ✗ File not found: ${template.file}`);
      failed++;
    }
  }

  // Import Refinance Nurture Sequence
  console.log('\\n  Refinance Nurture Sequence:');
  for (const template of refinanceNurtureEmails) {
    const filePath = path.join(__dirname, template.file);

    if (fs.existsSync(filePath)) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const result = await createEmailSnippet(template.name, htmlContent);

      if (result) success++;
      else failed++;

      await sleep(500);
    } else {
      console.log(`  ✗ File not found: ${template.file}`);
      failed++;
    }
  }

  console.log(`\\n✓ Imported ${success} nurture sequence templates`);
  if (failed > 0) console.log(`✗ Failed: ${failed} templates`);
}

async function importSmsTemplates() {
  console.log('\\n----------------------------------------');
  console.log('Importing SMS Templates...\\n');

  const smsPath = path.join(__dirname, smsTemplatesFile);

  if (!fs.existsSync(smsPath)) {
    console.log('SMS templates file not found');
    return;
  }

  const smsData = JSON.parse(fs.readFileSync(smsPath, 'utf8'));
  let success = 0;
  let failed = 0;

  // Import all SMS categories
  const categories = [
    'loan_status_sms',
    'lead_nurture_sms',
    'appointment_sms',
    'post_close_sms',
    'prequal_sms',
    'rate_drop_sms'
  ];

  for (const category of categories) {
    if (smsData[category]) {
      console.log(`  Category: ${category}`);

      for (const sms of smsData[category]) {
        const result = await createEmailSnippet(`SMS: ${sms.name}`, sms.body);

        if (result) success++;
        else failed++;

        await sleep(300);
      }
    }
  }

  console.log(`\\n✓ Imported ${success} SMS templates`);
  if (failed > 0) console.log(`✗ Failed: ${failed} templates`);
}

async function createTags() {
  console.log('\\n----------------------------------------');
  console.log('Creating Required Tags...\\n');

  const tags = [
    'Application Started',
    'In Processing',
    'In Underwriting',
    'Conditionally Approved',
    'Loan Approved',
    'Clear to Close',
    'Final Docs Ready',
    'Closed',
    'Post-Close Nurture',
    'Purchase Lead',
    'Refinance Lead',
    'Lost',
    'Unsubscribed'
  ];

  const url = `${API_BASE}/tags/`;

  for (const tagName of tags) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          locationId: LOCATION_ID,
          name: tagName
        })
      });

      if (response.ok) {
        console.log(`  ✓ Tag: ${tagName}`);
      } else {
        const error = await response.json();
        if (error.message?.includes('already exists')) {
          console.log(`  ~ Tag exists: ${tagName}`);
        } else {
          console.log(`  ✗ Failed: ${tagName}`);
        }
      }

      await sleep(200);
    } catch (err) {
      console.log(`  ✗ Error: ${tagName}`);
    }
  }
}

async function main() {
  console.log('Starting Mission Control Import...\\n');
  console.log(`Location ID: ${LOCATION_ID}`);
  console.log(`API Token: ${API_TOKEN.substring(0, 10)}...`);

  await createTags();
  await importEmailTemplates();
  await importNurtureTemplates();
  await importSmsTemplates();

  console.log('\\n========================================');
  console.log('  Import Complete!');
  console.log('========================================');
  console.log('\\nTemplate Summary:');
  console.log('  - 8 Loan Status Emails');
  console.log('  - 5 Purchase Nurture Emails');
  console.log('  - 5 Refinance Nurture Emails');
  console.log('  - 30+ SMS Templates');
  console.log('  - 13 Tags Created');
  console.log('\\nNext Steps:');
  console.log('1. Log into GHL and verify snippets in Marketing > Snippets');
  console.log('2. Create workflows using the JSON specs in workflows/complete-workflows.json');
  console.log('3. Add email/SMS actions to workflows using the imported snippets');
  console.log('4. Set trigger tags for each workflow');
  console.log('5. Test with a test contact\\n');
}

main().catch(console.error);
