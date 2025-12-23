/**
 * Import OneNation Contacts to GHL
 * Imports contacts extracted from dyoung@onenationhomeloans.com mbox
 */

const fs = require('fs');
const https = require('https');

// Mission Control - David Young
const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
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
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createTag(name) {
  console.log(`Creating tag: ${name}`);
  const result = await apiRequest('POST', `/locations/${LOCATION_ID}/tags`, { name });
  if (result.status === 200 || result.status === 201) {
    console.log(`  Tag created: ${name}`);
    return result.data.tag || result.data;
  } else if (result.status === 400 && result.data?.message?.includes('already exists')) {
    console.log(`  Tag already exists: ${name}`);
    return { name };
  } else {
    console.log(`  Failed: ${result.status} - ${JSON.stringify(result.data)}`);
    return null;
  }
}

async function createContact(contact, tags) {
  // Clean up the name (remove quotes, encoding artifacts)
  let firstName = (contact.firstName || '').replace(/^['"]|['"]$/g, '').trim();
  let lastName = (contact.lastName || '').replace(/^['"]|['"]$/g, '').trim();

  // Skip if name is garbage
  if (firstName.includes('��') || firstName.includes('=?')) firstName = '';
  if (lastName.includes('��') || lastName.includes('=?')) lastName = '';

  const body = {
    locationId: LOCATION_ID,
    email: contact.email,
    firstName: firstName,
    lastName: lastName,
    phone: contact.phone || '',
    tags: tags,
    source: 'OneNation Email Import',
    customFields: []
  };

  // Add title if available
  if (contact.title) {
    body.customFields.push({ key: 'job_title', value: contact.title });
  }

  // Add company if available
  if (contact.company) {
    body.customFields.push({ key: 'company_name', value: contact.company });
  }

  const result = await apiRequest('POST', '/contacts/', body);
  return result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('ONENATION CONTACT IMPORT - David Young GHL');
  console.log('='.repeat(60));

  // Step 1: Create tags
  console.log('\n--- STEP 1: Create Tags ---');
  await createTag('OneNation Contact');
  await createTag('Email Import');

  // Step 2: Load contacts
  console.log('\n--- STEP 2: Load Contacts ---');
  const data = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts-final.json', 'utf-8'));
  console.log(`Total contacts to import: ${data.contacts.length}`);

  // Filter to only personal email domains (likely clients, not business colleagues)
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'me.com', 'msn.com', 'sbcglobal.net', 'att.net', 'verizon.net', 'comcast.net'];
  const clientContacts = data.contacts.filter(c => personalDomains.some(d => c.email.includes(d)));
  console.log(`Personal email contacts (importing): ${clientContacts.length}`);

  // Step 3: Import contacts
  console.log('\n--- STEP 3: Import Contacts ---');
  const tags = ['OneNation Contact', 'Email Import'];

  let success = 0;
  let failed = 0;
  let duplicates = 0;

  for (let i = 0; i < clientContacts.length; i++) {
    const contact = clientContacts[i];

    // Progress update every 25
    if (i % 25 === 0) {
      console.log(`Progress: ${i}/${clientContacts.length} (${success} success, ${duplicates} duplicates, ${failed} failed)`);
    }

    try {
      const result = await createContact(contact, tags);

      if (result.status === 200 || result.status === 201) {
        success++;
      } else if (result.status === 400 && result.data?.message?.includes('duplicate')) {
        duplicates++;
      } else if (result.status === 422 && result.data?.message?.includes('Duplicate')) {
        duplicates++;
      } else {
        failed++;
        if (failed <= 5) {
          console.log(`  Failed ${contact.email}: ${result.status} - ${JSON.stringify(result.data).substring(0, 100)}`);
        }
      }
    } catch (err) {
      failed++;
      console.log(`  Error ${contact.email}: ${err.message}`);
    }

    // Rate limiting - 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Success: ${success}`);
  console.log(`Duplicates: ${duplicates}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total processed: ${clientContacts.length}`);
}

main().catch(console.error);
