/**
 * Fix Paul Tropp Contacts - Update names and tags from enriched data
 * Location ID: 7leHITJukh8Kzfv2Sbp3
 */

const fs = require('fs');

const API_KEY = 'pit-a1519c2d-93b3-44e0-ac10-1267f56e5a56';
const LOCATION_ID = '7leHITJukh8Kzfv2Sbp3';
const BASE_URL = 'https://services.leadconnectorhq.com';
const ENRICHED_FILE = '/mnt/c/Users/dyoun/Downloads/Enriched/All-Contacts-Enriched.csv';

// Rate limiting - GHL allows ~100 requests per minute
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 35000; // 35 seconds between batches of 50

let stats = {
  processed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  notFound: 0
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCSV(filePath) {
  console.log('Loading enriched data...');
  const content = fs.readFileSync(filePath, 'utf8');
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

    // Index by email (lowercase)
    if (obj.Email) {
      lookup[obj.Email.toLowerCase()] = {
        firstName: obj['First Name'] || '',
        lastName: obj['Last Name'] || '',
        profession: obj.Profession || 'Unknown',
        confidence: obj['Name Confidence'] || 'none',
        state: obj.State || ''
      };
    }
  }

  console.log(`Loaded ${Object.keys(lookup).length} enriched contacts`);
  return lookup;
}

async function getContacts(startAfterId = null, startAfter = null) {
  let url = `${BASE_URL}/contacts/?locationId=${LOCATION_ID}&limit=100`;
  if (startAfterId && startAfter) {
    url += `&startAfterId=${startAfterId}&startAfter=${startAfter}`;
  }

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Version': '2021-07-28'
    }
  });

  return res.json();
}

async function updateContact(contactId, updates) {
  const res = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  return res.json();
}

function buildTags(enriched, existingTags = []) {
  const tags = new Set(existingTags.map(t => t.toLowerCase()));

  // Profession tag
  const professionMap = {
    'Realtor': 'realtor',
    'Lender': 'lender',
    'Attorney': 'attorney',
    'Title/Escrow': 'title-escrow',
    'Appraiser': 'appraiser',
    'Builder': 'builder',
    'Insurance': 'insurance',
    'Unknown': 'personal-email'
  };

  if (enriched.profession && professionMap[enriched.profession]) {
    tags.add(professionMap[enriched.profession]);
  }

  // State tag (for realtors)
  if (enriched.state && enriched.state !== 'Unknown' && enriched.profession === 'Realtor') {
    tags.add(`state-${enriched.state.toLowerCase()}`);
  }

  // Name confidence tag
  if (enriched.confidence === 'high') {
    tags.add('name-verified');
  } else if (enriched.confidence === 'medium') {
    tags.add('name-possible');
  } else if (enriched.firstName || enriched.lastName) {
    tags.add('name-possible');
  } else {
    tags.add('name-unknown');
  }

  // Keep "real estate" tag if present
  if (existingTags.includes('real estate')) {
    tags.add('real estate');
  }

  return Array.from(tags);
}

async function processContacts(enrichedLookup) {
  console.log('\nStarting contact updates...');
  console.log('This will take a while due to API rate limits (~100/min)');
  console.log('Estimated time: ~72 minutes for 435k contacts\n');

  let startAfterId = null;
  let startAfter = null;
  let pageNum = 0;
  let updateBatch = [];

  while (true) {
    pageNum++;
    const data = await getContacts(startAfterId, startAfter);

    if (!data.contacts || data.contacts.length === 0) {
      console.log('No more contacts to process');
      break;
    }

    for (const contact of data.contacts) {
      stats.processed++;
      const email = (contact.email || '').toLowerCase();
      const enriched = enrichedLookup[email];

      if (!enriched) {
        stats.notFound++;
        continue;
      }

      // Check if update needed
      const currentName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim().toLowerCase();
      const enrichedName = `${enriched.firstName} ${enriched.lastName}`.trim().toLowerCase();
      const namesDontMatch = currentName !== enrichedName && enrichedName !== '';

      // Build new tags
      const newTags = buildTags(enriched, contact.tags || []);
      const tagsChanged = JSON.stringify(newTags.sort()) !== JSON.stringify((contact.tags || []).sort());

      if (namesDontMatch || tagsChanged) {
        updateBatch.push({
          id: contact.id,
          updates: {
            firstName: enriched.firstName || contact.firstName || '',
            lastName: enriched.lastName || contact.lastName || '',
            tags: newTags
          }
        });
      } else {
        stats.skipped++;
      }

      // Process batch when full
      if (updateBatch.length >= BATCH_SIZE) {
        console.log(`Page ${pageNum} | Processed: ${stats.processed} | Updating batch of ${updateBatch.length}...`);

        for (const item of updateBatch) {
          try {
            await updateContact(item.id, item.updates);
            stats.updated++;
          } catch (err) {
            stats.errors++;
          }
        }

        updateBatch = [];
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Progress update
    const pct = ((stats.processed / 435947) * 100).toFixed(1);
    console.log(`Progress: ${stats.processed}/435,947 (${pct}%) | Updated: ${stats.updated} | Skipped: ${stats.skipped}`);

    // Get next page
    if (data.meta && data.meta.startAfterId) {
      startAfterId = data.meta.startAfterId;
      startAfter = data.meta.startAfter;
    } else {
      break;
    }

    await sleep(1000); // Rate limit between pages
  }

  // Process remaining batch
  if (updateBatch.length > 0) {
    console.log(`Final batch: ${updateBatch.length} updates`);
    for (const item of updateBatch) {
      try {
        await updateContact(item.id, item.updates);
        stats.updated++;
      } catch (err) {
        stats.errors++;
      }
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Paul Tropp Contact Fixer');
  console.log('Updating names and tags from enriched data');
  console.log('='.repeat(60));

  const enrichedLookup = parseCSV(ENRICHED_FILE);

  await processContacts(enrichedLookup);

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (no changes): ${stats.skipped}`);
  console.log(`Not in enriched data: ${stats.notFound}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(60));

  // Save stats
  fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/Enriched/update-stats.json', JSON.stringify(stats, null, 2));
}

main().catch(console.error);
