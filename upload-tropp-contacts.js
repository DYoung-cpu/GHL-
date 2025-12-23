/**
 * Upload Enriched Contacts to Paul Tropp's GHL Account
 * Location ID: 7leHITJukh8Kzfv2Sbp3
 * Tags contacts by profession, state, and name confidence
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'pit-a1519c2d-93b3-44e0-ac10-1267f56e5a56';
const LOCATION_ID = '7leHITJukh8Kzfv2Sbp3';
const BASE_URL = 'https://services.leadconnectorhq.com';

const ENRICHED_DIR = '/mnt/c/Users/dyoun/Downloads/Enriched';

// Rate limiting
const BATCH_SIZE = 100;
const DELAY_MS = 1000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createOrUpdateContact(contact) {
  try {
    // First try to find existing contact by email
    const searchRes = await fetch(`${BASE_URL}/contacts/search/duplicate?locationId=${LOCATION_ID}&email=${encodeURIComponent(contact.email)}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28'
      }
    });

    const searchData = await searchRes.json();

    if (searchData.contact) {
      // Update existing contact
      const updateRes = await fetch(`${BASE_URL}/contacts/${searchData.contact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          tags: contact.tags
        })
      });
      return { action: 'updated', id: searchData.contact.id };
    } else {
      // Create new contact
      const createRes = await fetch(`${BASE_URL}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: LOCATION_ID,
          email: contact.email,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          tags: contact.tags
        })
      });
      const createData = await createRes.json();
      return { action: 'created', id: createData.contact?.id };
    }
  } catch (err) {
    return { action: 'error', error: err.message };
  }
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
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
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}

async function uploadFile(filename, professionTag, extraTags = []) {
  const filePath = path.join(ENRICHED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${filename} - not found`);
    return { processed: 0, created: 0, updated: 0, errors: 0 };
  }

  console.log(`\nProcessing ${filename}...`);
  const contacts = parseCSV(filePath);
  console.log(`  Found ${contacts.length} contacts`);

  let created = 0, updated = 0, errors = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    for (const c of batch) {
      const tags = [professionTag, ...extraTags];

      // Add state tag if present
      if (c.state && c.state !== 'Unknown') {
        tags.push(`state-${c.state}`);
      }

      // Add name confidence tag
      if (c.nameConfidence === 'high') {
        tags.push('name-verified');
      } else if (c.nameConfidence === 'medium') {
        tags.push('name-possible');
      } else {
        tags.push('name-unknown');
      }

      const result = await createOrUpdateContact({
        email: c.email,
        firstName: c.firstName || c.first_name || '',
        lastName: c.lastName || c.last_name || '',
        tags: tags
      });

      if (result.action === 'created') created++;
      else if (result.action === 'updated') updated++;
      else errors++;
    }

    process.stdout.write(`  Progress: ${Math.min(i + BATCH_SIZE, contacts.length)}/${contacts.length}\r`);
    await sleep(DELAY_MS);
  }

  console.log(`  Done: ${created} created, ${updated} updated, ${errors} errors`);
  return { processed: contacts.length, created, updated, errors };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Uploading Enriched Contacts to Paul Tropp GHL');
  console.log('Location:', LOCATION_ID);
  console.log('='.repeat(60));

  // Check what files exist
  const files = fs.readdirSync(ENRICHED_DIR);
  console.log('\nFound enriched files:', files.join(', '));

  const totals = { processed: 0, created: 0, updated: 0, errors: 0 };

  // Upload by profession - start with smaller files to test
  const uploads = [
    ['Attorneys-Enriched.csv', 'attorney'],
    ['Lenders-Enriched.csv', 'lender'],
    ['Appraisers-Enriched.csv', 'appraiser'],
    ['Builders-Enriched.csv', 'builder'],
    ['Insurance-Enriched.csv', 'insurance'],
    ['Title-Escrow-Enriched.csv', 'title-escrow'],
    ['Realtors-With-Names.csv', 'realtor', ['ready-to-use']],
  ];

  for (const [file, tag, extra] of uploads) {
    const result = await uploadFile(file, tag, extra || []);
    totals.processed += result.processed;
    totals.created += result.created;
    totals.updated += result.updated;
    totals.errors += result.errors;
  }

  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log(`Total Processed: ${totals.processed}`);
  console.log(`Created: ${totals.created}`);
  console.log(`Updated: ${totals.updated}`);
  console.log(`Errors: ${totals.errors}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
