/**
 * Fetch all GHL contacts and compare with parsed emails
 */

const https = require('https');
const fs = require('fs');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

async function fetchPage(startAfterId = null) {
  return new Promise((resolve, reject) => {
    let path = `/contacts/?locationId=${LOCATION_ID}&limit=100`;
    if (startAfterId) path += `&startAfterId=${startAfterId}`;

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Fetching GHL contacts...');

  const allContacts = [];
  let startAfterId = null;
  let page = 0;

  while (true) {
    page++;
    const result = await fetchPage(startAfterId);
    const contacts = result.contacts || [];
    allContacts.push(...contacts);

    console.log(`Page ${page}: ${contacts.length} contacts (total: ${allContacts.length})`);

    if (contacts.length < 100) break;

    // Get last contact ID for pagination
    startAfterId = contacts[contacts.length - 1].id;

    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\nTotal GHL contacts: ' + allContacts.length);

  // Extract emails
  const ghlEmails = new Set();
  allContacts.forEach(c => {
    if (c.email) ghlEmails.add(c.email.toLowerCase());
  });

  console.log('Unique emails in GHL: ' + ghlEmails.size);

  // Save GHL emails
  fs.writeFileSync('./data/ghl-existing-emails.json', JSON.stringify(Array.from(ghlEmails), null, 2));

  // Load parsed emails from CSV
  const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
  const lines = csv.split('\n').slice(1); // skip header
  const parsedEmails = new Set();

  lines.forEach(line => {
    if (line.trim() === '') return;
    const parts = line.split(',');
    const email = (parts[4] || '').replace(/"/g, '').toLowerCase();
    if (email) parsedEmails.add(email);
  });

  console.log('Parsed emails from mbox: ' + parsedEmails.size);

  // Find matches
  const matches = [];
  const newContacts = [];

  parsedEmails.forEach(email => {
    if (ghlEmails.has(email)) {
      matches.push(email);
    } else {
      newContacts.push(email);
    }
  });

  console.log('\n=== COMPARISON ===');
  console.log('Already in GHL: ' + matches.length);
  console.log('New (not in GHL): ' + newContacts.length);

  // Save results
  fs.writeFileSync('./data/matching-emails.json', JSON.stringify(matches, null, 2));
  fs.writeFileSync('./data/new-emails.json', JSON.stringify(newContacts, null, 2));

  console.log('\nSaved matching-emails.json and new-emails.json');
}

main().catch(console.error);
