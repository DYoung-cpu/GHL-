const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

function apiRequest(method, path) {
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
    req.end();
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'POST',
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
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== HAPPY NEW YEAR EMAIL CAMPAIGN TRACKING ===');
  console.log('Location:', LOCATION_ID);
  console.log('Time:', new Date().toISOString());
  console.log('');

  // 1. Check conversations/messages from today
  console.log('--- Recent Email Activity ---');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get conversations
  const convResult = await apiRequest('GET', `/conversations/search?locationId=${LOCATION_ID}&limit=50`);
  if (convResult.status === 200 && convResult.data.conversations) {
    console.log('Recent conversations:', convResult.data.conversations.length);
  }

  // 2. Search for contacts with email engagement tags
  console.log('\n--- Email Engagement Tags ---');
  
  const engagementTags = ['email.engaged', 'email.clicked', 'email.replied', 'email.bounced'];
  
  for (const tag of engagementTags) {
    const result = await apiPost('/contacts/search', {
      locationId: LOCATION_ID,
      filters: [{ field: 'tags', operator: 'contains', value: tag }],
      pageLimit: 1
    });
    
    if (result.status === 200 && result.data.total !== undefined) {
      console.log(`  ${tag}: ${result.data.total} contacts`);
    }
  }

  // 3. Get bulk email/campaign stats if available
  console.log('\n--- Checking Campaigns Endpoint ---');
  const campaignsResult = await apiRequest('GET', `/campaigns/?locationId=${LOCATION_ID}`);
  console.log('Campaigns status:', campaignsResult.status);
  if (campaignsResult.data && campaignsResult.data.campaigns) {
    console.log('Campaigns found:', campaignsResult.data.campaigns.length);
    campaignsResult.data.campaigns.slice(0, 5).forEach(c => {
      console.log(`  - ${c.name}: ${c.status}`);
    });
  }

  // 4. Check email stats endpoint
  console.log('\n--- Checking Email Stats ---');
  const statsResult = await apiRequest('GET', `/locations/${LOCATION_ID}/email/stats`);
  console.log('Stats status:', statsResult.status);
  if (statsResult.status === 200) {
    console.log('Email Stats:', JSON.stringify(statsResult.data, null, 2));
  }

  // 5. Get recent messages sent
  console.log('\n--- Recent Outbound Emails (last 2 hours) ---');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  // Search contacts to find who got emails
  const recentSearch = await apiPost('/contacts/search', {
    locationId: LOCATION_ID,
    filters: [{ field: 'dateUpdated', operator: 'gte', value: twoHoursAgo }],
    pageLimit: 100
  });
  
  if (recentSearch.status === 200 && recentSearch.data.contacts) {
    console.log('Contacts updated in last 2 hours:', recentSearch.data.contacts.length);
  }

  // 6. Check bulk actions/emails endpoint
  console.log('\n--- Checking Bulk Actions ---');
  const bulkResult = await apiRequest('GET', `/locations/${LOCATION_ID}/bulk-actions`);
  console.log('Bulk actions status:', bulkResult.status);
  if (bulkResult.data) {
    console.log('Bulk data:', JSON.stringify(bulkResult.data, null, 2).slice(0, 500));
  }

  // 7. Get contact count to know total audience
  console.log('\n--- Total Contact Base ---');
  const totalResult = await apiPost('/contacts/search', {
    locationId: LOCATION_ID,
    pageLimit: 1
  });
  
  if (totalResult.status === 200) {
    console.log('Total contacts in account:', totalResult.data.total || 'N/A');
  }

  // 8. Check for past-client tag
  console.log('\n--- Past Client Segment ---');
  const pastClientResult = await apiPost('/contacts/search', {
    locationId: LOCATION_ID,
    filters: [{ field: 'tags', operator: 'contains', value: 'past-client' }],
    pageLimit: 1
  });
  
  if (pastClientResult.status === 200) {
    console.log('Contacts with "past-client" tag:', pastClientResult.data.total || 0);
  }

  // Also check borrower tag
  const borrowerResult = await apiPost('/contacts/search', {
    locationId: LOCATION_ID,
    filters: [{ field: 'tags', operator: 'contains', value: 'borrower' }],
    pageLimit: 1
  });
  
  if (borrowerResult.status === 200) {
    console.log('Contacts with "borrower" tag:', borrowerResult.data.total || 0);
  }

  console.log('\n=== END TRACKING REPORT ===');
}

main().catch(console.error);
