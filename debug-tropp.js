/**
 * Debug - Check what's happening with Tropp contacts
 */

const fs = require('fs');

const API_KEY = 'pit-a1519c2d-93b3-44e0-ac10-1267f56e5a56';
const LOCATION_ID = '7leHITJukh8Kzfv2Sbp3';
const BASE_URL = 'https://services.leadconnectorhq.com';
const ENRICHED_FILE = '/mnt/c/Users/dyoun/Downloads/Enriched/All-Contacts-Enriched.csv';

function parseCSV(filePath) {
  console.log('Loading enriched data...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  console.log('Headers:', headers);

  const lookup = {};

  for (let i = 1; i < Math.min(lines.length, 1000); i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || '').replace(/"/g, '');
    });

    if (obj.Email) {
      lookup[obj.Email.toLowerCase()] = {
        firstName: obj['First Name'] || '',
        lastName: obj['Last Name'] || '',
        profession: obj.Profession || 'Unknown',
        confidence: obj['Name Confidence'] || 'none'
      };
    }
  }

  return lookup;
}

async function main() {
  // Load enriched data
  const enriched = parseCSV(ENRICHED_FILE);
  console.log('\nSample enriched entries:');
  const emails = Object.keys(enriched).slice(0, 5);
  emails.forEach(e => console.log(`  ${e}: ${JSON.stringify(enriched[e])}`));

  // Get first 5 GHL contacts
  console.log('\n\nFetching GHL contacts...');
  const res = await fetch(`${BASE_URL}/contacts/?locationId=${LOCATION_ID}&limit=10`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Version': '2021-07-28'
    }
  });

  const data = await res.json();

  console.log('\nGHL contacts vs enriched data:');
  for (const c of data.contacts) {
    const email = (c.email || '').toLowerCase();
    const match = enriched[email];

    console.log(`\nGHL Contact:`);
    console.log(`  Name: "${c.firstName} ${c.lastName}"`);
    console.log(`  Email: ${c.email}`);
    console.log(`  Tags: ${JSON.stringify(c.tags)}`);

    if (match) {
      console.log(`  Enriched match:`);
      console.log(`    Name: "${match.firstName} ${match.lastName}"`);
      console.log(`    Confidence: ${match.confidence}`);
      console.log(`    Profession: ${match.profession}`);

      const currentName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
      const enrichedName = `${match.firstName} ${match.lastName}`.trim().toLowerCase();
      console.log(`  Names match: ${currentName === enrichedName}`);
      console.log(`  Current: "${currentName}" vs Enriched: "${enrichedName}"`);
    } else {
      console.log(`  No match in enriched data!`);
    }
  }
}

main().catch(console.error);
