/**
 * Check if parsed data can enrich existing GHL contacts
 */

const fs = require('fs');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

// Load our parsed data
const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
const lines = csv.split('\n').slice(1);
const parsedData = {};

lines.forEach(line => {
  if (line.trim() === '') return;
  const parts = line.split(',');
  const email = (parts[4] || '').replace(/"/g, '').toLowerCase();
  const firstName = (parts[2] || '').replace(/"/g, '').trim();
  const lastName = (parts[3] || '').replace(/"/g, '').trim();
  const phone = (parts[5] || '').replace(/"/g, '').trim();
  if (email) {
    parsedData[email] = { firstName, lastName, phone };
  }
});

// Load matching emails
const matchingEmails = JSON.parse(fs.readFileSync('./data/emails-already-in-ghl.json', 'utf-8'));

// Fetch GHL contact by search
async function fetchContact(email) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'services.leadconnectorhq.com',
      path: '/contacts/search?query=' + encodeURIComponent(email) + '&locationId=' + LOCATION_ID,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Comparing parsed data vs GHL for ' + matchingEmails.length + ' matches...\n');

  let canEnrichCount = 0;
  const results = [];

  for (const email of matchingEmails) {
    const ghl = await fetchContact(email);
    const parsed = parsedData[email];

    if (!ghl || !ghl.contacts || !ghl.contacts.length) continue;

    const ghlContact = ghl.contacts[0];
    const ghlPhone = ghlContact.phone || '';
    const ghlFirst = ghlContact.firstName || '';
    const ghlLast = ghlContact.lastName || '';

    const parsedPhone = parsed?.phone || '';
    const parsedFirst = parsed?.firstName || '';
    const parsedLast = parsed?.lastName || '';

    const canAddPhone = parsedPhone && parsedPhone.length > 5 && !ghlPhone;
    const canAddFirstName = parsedFirst && !ghlFirst;
    const canAddLastName = parsedLast && !ghlLast;

    if (canAddPhone || canAddFirstName || canAddLastName) {
      canEnrichCount++;
      results.push({
        email,
        ghlName: (ghlFirst + ' ' + ghlLast).trim() || '(empty)',
        ghlPhone: ghlPhone || '(empty)',
        parsedName: (parsedFirst + ' ' + parsedLast).trim() || '(empty)',
        parsedPhone: parsedPhone || '(empty)',
        canAdd: [
          canAddPhone ? 'PHONE' : null,
          canAddFirstName ? 'FIRST NAME' : null,
          canAddLastName ? 'LAST NAME' : null
        ].filter(Boolean).join(', ')
      });
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('=== ENRICHMENT POTENTIAL ===');
  console.log('Total matching contacts: ' + matchingEmails.length);
  console.log('Can be enriched: ' + canEnrichCount);
  console.log('');

  if (results.length > 0) {
    console.log('=== CONTACTS THAT CAN BE ENRICHED ===\n');
    results.forEach(r => {
      console.log(r.email);
      console.log('  GHL:    "' + r.ghlName + '" | Phone: ' + r.ghlPhone);
      console.log('  Parsed: "' + r.parsedName + '" | Phone: ' + r.parsedPhone);
      console.log('  Can add: ' + r.canAdd);
      console.log('');
    });
  } else {
    console.log('No contacts need enrichment - GHL already has all the data we parsed.');
  }
}

main().catch(console.error);
