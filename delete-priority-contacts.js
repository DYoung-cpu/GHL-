const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
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
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function searchContacts(searchAfter) {
  const body = {
    locationId: LOCATION_ID,
    filters: [
      {
        field: 'tags',
        operator: 'contains',
        value: 'priority financial'
      }
    ],
    pageLimit: 100
  };

  if (searchAfter) {
    body.searchAfter = searchAfter;
  }

  const result = await apiRequest('POST', '/contacts/search', body);
  return result.data;
}

async function deleteContact(id) {
  const result = await apiRequest('DELETE', '/contacts/' + id);
  return result.status === 200 || result.status === 204;
}

async function main() {
  console.log('=== DELETING PRIORITY FINANCIAL CONTACTS ===\n');

  let allContactIds = [];
  let searchAfter = null;
  let page = 1;

  // First, collect all contact IDs
  console.log('Collecting contact IDs...');
  while (true) {
    const result = await searchContacts(searchAfter);
    const contacts = result.contacts || [];

    if (contacts.length === 0) break;

    allContactIds = allContactIds.concat(contacts.map(function(c) { return c.id; }));
    console.log('  Page ' + page + ': Found ' + contacts.length + ' contacts (Total: ' + allContactIds.length + ')');

    // Get searchAfter from last contact
    const lastContact = contacts[contacts.length - 1];
    searchAfter = lastContact.searchAfter;

    if (contacts.length < 100) break;
    page++;

    // Small delay
    await new Promise(function(r) { setTimeout(r, 100); });
  }

  console.log('\nTotal contacts to delete: ' + allContactIds.length + '\n');

  if (allContactIds.length === 0) {
    console.log('No contacts found with "priority financial" tag.');
    return;
  }

  // Delete each contact
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < allContactIds.length; i++) {
    const id = allContactIds[i];
    process.stdout.write('\rDeleting: [' + (i + 1) + '/' + allContactIds.length + ']');

    const success = await deleteContact(id);
    if (success) {
      deleted++;
    } else {
      failed++;
    }

    // Rate limit - 50ms between calls
    await new Promise(function(r) { setTimeout(r, 50); });
  }

  console.log('\n\n=== DELETION COMPLETE ===');
  console.log('Deleted: ' + deleted);
  console.log('Failed: ' + failed);
}

main().catch(console.error);
