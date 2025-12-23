/**
 * Compare GHL contacts with parsed emails - FIXED pagination
 */

const https = require('https');
const fs = require('fs');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

async function fetchAllContacts() {
  const allContacts = [];
  let startAfterId = null;
  let page = 0;
  const maxPages = 20; // Safety limit - 942 contacts = ~10 pages max

  while (page < maxPages) {
    page++;

    const result = await new Promise((resolve, reject) => {
      let path = `/contacts/?locationId=${LOCATION_ID}&limit=100`;
      if (startAfterId) path += `&startAfterId=${startAfterId}`;

      const req = https.request({
        hostname: 'services.leadconnectorhq.com',
        path: path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    const contacts = result.contacts || [];
    allContacts.push(...contacts);
    console.log(`Page ${page}: ${contacts.length} contacts (total: ${allContacts.length})`);

    if (contacts.length < 100) break; // Last page
    startAfterId = contacts[contacts.length - 1].id;

    await new Promise(r => setTimeout(r, 100));
  }

  return allContacts;
}

async function main() {
  console.log('Fetching GHL contacts...');
  const ghlContacts = await fetchAllContacts();

  // Extract emails
  const ghlEmails = new Set();
  ghlContacts.forEach(c => {
    if (c.email) ghlEmails.add(c.email.toLowerCase());
  });

  console.log('\nGHL contacts: ' + ghlContacts.length);
  console.log('GHL unique emails: ' + ghlEmails.size);

  // Load parsed emails
  const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  const parsedEmails = [];

  lines.forEach(line => {
    if (line.trim() === '') return;
    const parts = line.split(',');
    const email = (parts[4] || '').replace(/"/g, '').toLowerCase();
    if (email) parsedEmails.push(email);
  });

  console.log('Parsed emails: ' + parsedEmails.length);

  // Compare
  const alreadyInGHL = [];
  const notInGHL = [];

  parsedEmails.forEach(email => {
    if (ghlEmails.has(email)) {
      alreadyInGHL.push(email);
    } else {
      notInGHL.push(email);
    }
  });

  console.log('\n=== COMPARISON RESULTS ===');
  console.log('Already in GHL: ' + alreadyInGHL.length);
  console.log('NOT in GHL (new): ' + notInGHL.length);

  // Save results
  fs.writeFileSync('./data/emails-already-in-ghl.json', JSON.stringify(alreadyInGHL, null, 2));
  fs.writeFileSync('./data/emails-new-to-ghl.json', JSON.stringify(notInGHL, null, 2));

  // Show sample of matches
  console.log('\nSample of emails already in GHL:');
  alreadyInGHL.slice(0, 10).forEach(e => console.log('  ' + e));
}

main().catch(console.error);
