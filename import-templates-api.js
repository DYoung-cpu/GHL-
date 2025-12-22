require('dotenv').config();
const https = require('https');
const fs = require('fs');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_KEY = process.env.GHL_API_KEY;

// Load templates from JSON files
const emailData = JSON.parse(fs.readFileSync('./templates/email-templates.json', 'utf8'));
const smsData = JSON.parse(fs.readFileSync('./templates/sms-templates.json', 'utf8'));

// Flatten email templates
const emailTemplates = [];
Object.keys(emailData.templates).forEach(category => {
  emailData.templates[category].forEach(template => {
    emailTemplates.push({
      name: `[${category.replace(/_/g, ' ')}] ${template.name}`,
      subject: template.subject,
      body: template.body,
      type: 'email'
    });
  });
});

// Flatten SMS templates
const smsTemplates = [];
Object.keys(smsData.templates).forEach(category => {
  smsData.templates[category].forEach(template => {
    smsTemplates.push({
      name: `[SMS] ${template.name}`,
      body: template.message,
      type: 'sms'
    });
  });
});

console.log(`Loaded ${emailTemplates.length} email templates`);
console.log(`Loaded ${smsTemplates.length} SMS templates`);

function createSnippet(snippet) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: snippet.name,
      type: snippet.type,
      body: snippet.body
    });

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/locations/${LOCATION_ID}/templates/snippets`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ success: true, name: snippet.name });
        } else {
          resolve({ success: false, name: snippet.name, status: res.statusCode, error: data.substring(0, 100) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, name: snippet.name, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('IMPORTING TEMPLATES TO MISSION CONTROL');
  console.log('='.repeat(60));
  console.log('Location:', LOCATION_ID);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // Import Email Templates
  console.log('\n--- EMAIL TEMPLATES ---');
  for (let i = 0; i < emailTemplates.length; i++) {
    const template = emailTemplates[i];
    const result = await createSnippet(template);
    if (result.success) {
      successCount++;
      process.stdout.write(`✅ ${i+1}/${emailTemplates.length} `);
    } else {
      failCount++;
      console.log(`\n❌ Failed: ${result.name} - ${result.status || result.error}`);
    }
    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  // Import SMS Templates
  console.log('\n\n--- SMS TEMPLATES ---');
  for (let i = 0; i < smsTemplates.length; i++) {
    const template = smsTemplates[i];
    const result = await createSnippet(template);
    if (result.success) {
      successCount++;
      process.stdout.write(`✅ ${i+1}/${smsTemplates.length} `);
    } else {
      failCount++;
      console.log(`\n❌ Failed: ${result.name} - ${result.status || result.error}`);
    }
    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));
}

main();
