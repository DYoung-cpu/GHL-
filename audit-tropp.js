/**
 * Audit Paul Tropp contacts - check for name/email mismatches
 */

const fs = require('fs');

const API_KEY = 'pit-a1519c2d-93b3-44e0-ac10-1267f56e5a56';
const LOCATION_ID = '7leHITJukh8Kzfv2Sbp3';
const BASE_URL = 'https://services.leadconnectorhq.com';
const ENRICHED_FILE = '/mnt/c/Users/dyoun/Downloads/Enriched/All-Contacts-Enriched.csv';

// Load ALL enriched data
function loadEnrichedData() {
  console.log('Loading enriched data (this takes a moment)...');
  const content = fs.readFileSync(ENRICHED_FILE, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const lookup = {};

  for (let i = 1; i < lines.length; i++) {
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

  console.log(`Loaded ${Object.keys(lookup).length} contacts\n`);
  return lookup;
}

async function auditContacts(enriched) {
  const stats = {
    total: 0,
    correctNames: 0,
    wrongNames: 0,
    noEnrichedName: 0,
    notInEnriched: 0,
    hasCorrectTags: 0,
    missingTags: 0
  };

  const mismatches = [];

  console.log('Auditing GHL contacts...\n');

  let startAfterId = null;
  let startAfter = null;
  let pages = 0;

  while (pages < 5) { // Check first 500 contacts
    pages++;
    let url = `${BASE_URL}/contacts/?locationId=${LOCATION_ID}&limit=100`;
    if (startAfterId) {
      url += `&startAfterId=${startAfterId}&startAfter=${startAfter}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28'
      }
    });

    const data = await res.json();

    if (!data.contacts || data.contacts.length === 0) break;

    for (const c of data.contacts) {
      stats.total++;
      const email = (c.email || '').toLowerCase();
      const enrichedData = enriched[email];

      if (!enrichedData) {
        stats.notInEnriched++;
        continue;
      }

      const ghlName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
      const enrichedName = `${enrichedData.firstName} ${enrichedData.lastName}`.trim().toLowerCase();

      // Check if enriched has a name
      if (!enrichedData.firstName && !enrichedData.lastName) {
        stats.noEnrichedName++;
      } else if (ghlName === enrichedName) {
        stats.correctNames++;
      } else {
        stats.wrongNames++;
        if (mismatches.length < 10) {
          mismatches.push({
            email: c.email,
            ghlName: `${c.firstName} ${c.lastName}`,
            enrichedName: `${enrichedData.firstName} ${enrichedData.lastName}`,
            tags: c.tags
          });
        }
      }

      // Check tags
      const tags = c.tags || [];
      const hasProfession = tags.some(t => ['realtor', 'lender', 'attorney', 'personal-email'].includes(t));
      const hasConfidence = tags.some(t => ['name-verified', 'name-possible', 'name-unknown'].includes(t));

      if (hasProfession && hasConfidence) {
        stats.hasCorrectTags++;
      } else {
        stats.missingTags++;
      }
    }

    startAfterId = data.meta?.startAfterId;
    startAfter = data.meta?.startAfter;

    process.stdout.write(`Checked ${stats.total} contacts...\r`);
  }

  console.log('\n\n=== AUDIT RESULTS ===\n');
  console.log(`Total checked: ${stats.total}`);
  console.log(`Correct names: ${stats.correctNames} (${((stats.correctNames/stats.total)*100).toFixed(1)}%)`);
  console.log(`Wrong names (need update): ${stats.wrongNames}`);
  console.log(`No enriched name available: ${stats.noEnrichedName}`);
  console.log(`Not in enriched data: ${stats.notInEnriched}`);
  console.log(`Has correct tags: ${stats.hasCorrectTags} (${((stats.hasCorrectTags/stats.total)*100).toFixed(1)}%)`);
  console.log(`Missing tags: ${stats.missingTags}`);

  if (mismatches.length > 0) {
    console.log('\n=== SAMPLE MISMATCHES ===\n');
    mismatches.forEach(m => {
      console.log(`Email: ${m.email}`);
      console.log(`  GHL Name: "${m.ghlName}"`);
      console.log(`  Should be: "${m.enrichedName}"`);
      console.log(`  Tags: ${m.tags.join(', ')}`);
      console.log();
    });
  }
}

async function main() {
  const enriched = loadEnrichedData();
  await auditContacts(enriched);
}

main().catch(console.error);
