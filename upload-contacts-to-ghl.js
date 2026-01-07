const fs = require('fs');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

// Parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Load CSV file
function loadCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.toLowerCase().replace(/ /g, '_')] = values[i] || '';
    });
    return obj;
  });
}

// Create or update contact in GHL
async function upsertContact(contact) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      locationId: LOCATION_ID,
      email: contact.email,
      firstName: contact.first_name || contact.firstName || '',
      lastName: contact.last_name || contact.lastName || '',
      phone: contact.phone || '',
      tags: contact.tags ? [contact.tags] : []
    });

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: '/contacts/upsert',
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
        try {
          const json = JSON.parse(data);
          if (json.contact) {
            resolve({ success: true, id: json.contact.id, new: json.new });
          } else {
            resolve({ success: false, error: json.message || json.error || data });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  const uploadDir = '/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready';

  // Files to upload in order
  const files = [
    { file: 'borrower.csv', tag: 'borrower' },
    { file: 'prospect.csv', tag: 'prospect' },
    { file: 'lo-recruit.csv', tag: 'lo-recruit' },
    { file: 'client-lo.csv', tag: 'client-lo' },
    { file: 'vendor.csv', tag: 'vendor' },
    { file: 'realtor.csv', tag: 'realtor' },
    { file: 'priority-financial.csv', tag: 'priority financial' }  // Use existing tag with space
  ];

  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  console.log('=== UPLOADING CONTACTS TO GHL ===\n');

  for (const { file, tag } of files) {
    const filePath = `${uploadDir}/${file}`;

    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} - not found`);
      continue;
    }

    const contacts = loadCSV(filePath);
    console.log(`\n${file}: ${contacts.length} contacts (tag: ${tag})`);

    let fileCreated = 0, fileUpdated = 0, fileFailed = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      // Skip if no email
      if (!contact.email) continue;

      // Ensure tag is set
      contact.tags = tag;

      process.stdout.write(`\r  [${i + 1}/${contacts.length}] ${contact.email.substring(0, 40).padEnd(40)}`);

      const result = await upsertContact(contact);

      if (result.success) {
        if (result.new) {
          fileCreated++;
          stats.created++;
        } else {
          fileUpdated++;
          stats.updated++;
        }
      } else {
        fileFailed++;
        stats.failed++;
        stats.errors.push({ email: contact.email, error: result.error });
      }

      stats.total++;

      // Rate limit - 100ms between calls
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n  Created: ${fileCreated} | Updated: ${fileUpdated} | Failed: ${fileFailed}`);
  }

  console.log('\n\n=== UPLOAD COMPLETE ===');
  console.log(`Total processed: ${stats.total}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.slice(0, 10).forEach(e => {
      console.log(`  ${e.email}: ${e.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  // Save results
  fs.writeFileSync('data/ghl-upload-results.json', JSON.stringify(stats, null, 2));
  console.log('\nResults saved to: data/ghl-upload-results.json');
}

main().catch(console.error);
