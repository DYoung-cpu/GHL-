const fs = require('fs');
const https = require('https');

// Mission Control - David Young (CORRECT key with Contacts scope)
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
    console.log(`  ✓ Tag created: ${name}`);
    return result.data.tag || result.data;
  } else if (result.status === 400 && result.data?.message?.includes('already exists')) {
    console.log(`  ✓ Tag already exists: ${name}`);
    // Get existing tags to find the ID
    const tags = await apiRequest('GET', `/locations/${LOCATION_ID}/tags`);
    const existing = tags.data?.tags?.find(t => t.name === name);
    return existing;
  } else {
    console.log(`  ✗ Failed: ${result.status} - ${JSON.stringify(result.data)}`);
    return null;
  }
}

async function createCustomField(name, fieldType, options = null) {
  console.log(`Creating custom field: ${name}`);
  const body = {
    name,
    dataType: fieldType,
    position: 0
  };
  if (options) body.picklistOptions = options;

  const result = await apiRequest('POST', `/locations/${LOCATION_ID}/customFields`, body);
  if (result.status === 200 || result.status === 201) {
    console.log(`  ✓ Field created: ${name}`);
    return result.data.customField || result.data;
  } else if (result.data?.message?.includes('already exists')) {
    console.log(`  ✓ Field already exists: ${name}`);
    return null;
  } else {
    console.log(`  ✗ Failed: ${result.status} - ${JSON.stringify(result.data)}`);
    return null;
  }
}

async function getCustomFields() {
  const result = await apiRequest('GET', `/locations/${LOCATION_ID}/customFields`);
  return result.data?.customFields || [];
}

async function createContact(contact, tags) {
  const body = {
    locationId: LOCATION_ID,
    email: contact.email,
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    phone: contact.phone || '',
    address1: contact.address || '',
    city: contact.city || '',
    state: contact.state || '',
    postalCode: contact.zip || '',
    tags: tags,
    source: 'Past Client Import',
    customFields: []
  };

  // Add custom field values if we have them
  if (contact.loanAmount) {
    body.customFields.push({ key: 'loan_amount', value: contact.loanAmount.toString() });
  }
  if (contact.loanRate) {
    body.customFields.push({ key: 'loan_rate', value: contact.loanRate.toString() });
  }
  if (contact.loanProduct) {
    body.customFields.push({ key: 'loan_product', value: contact.loanProduct });
  }
  if (contact.notes) {
    body.customFields.push({ key: 'client_notes', value: contact.notes });
  }

  const result = await apiRequest('POST', '/contacts/', body);
  return result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PAST CLIENT IMPORT - Mission Control');
  console.log('='.repeat(60));

  // Step 1: Create "Past Client" tag
  console.log('\n--- STEP 1: Create Tag ---');
  const pastClientTag = await createTag('Past Client');

  // Step 2: Create custom fields for loan data
  console.log('\n--- STEP 2: Create Custom Fields ---');
  await createCustomField('Loan Amount', 'TEXT');
  await createCustomField('Loan Rate', 'TEXT');
  await createCustomField('Loan Product', 'TEXT');
  await createCustomField('Funded Date', 'TEXT');
  await createCustomField('Client Notes', 'LARGE_TEXT');
  await createCustomField('Data Source', 'TEXT');

  // Get custom fields to map keys
  const fields = await getCustomFields();
  console.log(`\nCustom fields available: ${fields.length}`);

  // Step 3: Load contacts
  console.log('\n--- STEP 3: Load Contacts ---');
  const contacts = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json', 'utf-8'));
  console.log(`Total contacts to import: ${contacts.length}`);

  // Step 4: Import contacts
  console.log('\n--- STEP 4: Import Contacts ---');
  const tags = ['Past Client'];

  let success = 0;
  let failed = 0;
  let duplicates = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    // Progress update every 50
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${contacts.length} (${success} success, ${duplicates} duplicates, ${failed} failed)`);
    }

    try {
      const result = await createContact(contact, tags);

      if (result.status === 200 || result.status === 201) {
        success++;
      } else if (result.status === 400 && result.data?.message?.includes('duplicate')) {
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
  console.log(`Total: ${contacts.length}`);
}

main().catch(console.error);
