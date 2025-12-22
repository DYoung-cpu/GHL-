require('dotenv').config();
const https = require('https');

const AGENCY_API_KEY = process.env.GHL_AGENCY_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_BASE = 'services.leadconnectorhq.com';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${AGENCY_API_KEY}`,
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

async function testAgencyAPI() {
  console.log('='.repeat(60));
  console.log('TESTING AGENCY-LEVEL API KEY');
  console.log('='.repeat(60));

  // Test 1: Get locations (sub-accounts)
  console.log('\n1. GET LOCATIONS (Sub-Accounts)');
  console.log('-'.repeat(40));
  try {
    const result = await apiRequest('GET', '/locations/search');
    if (result.status === 200 && result.data.locations) {
      console.log(`   SUCCESS: Found ${result.data.locations.length} locations`);
      result.data.locations.forEach(loc => {
        console.log(`   - ${loc.name} (ID: ${loc.id})`);
        if (loc.companyId) {
          console.log(`     CompanyId: ${loc.companyId}`);
        }
      });
    } else {
      console.log(`   Status: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // Test 2: Get single location details
  console.log('\n2. GET LOCATION DETAILS');
  console.log('-'.repeat(40));
  try {
    const result = await apiRequest('GET', `/locations/${LOCATION_ID}`);
    if (result.status === 200) {
      console.log(`   SUCCESS: Got location details`);
      console.log(`   Name: ${result.data.location?.name || result.data.name}`);
      console.log(`   CompanyId: ${result.data.location?.companyId || result.data.companyId || 'NOT FOUND'}`);
      // Store companyId for user creation test
      global.companyId = result.data.location?.companyId || result.data.companyId;
    } else {
      console.log(`   Status: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // Test 3: Get users at location
  console.log('\n3. GET USERS');
  console.log('-'.repeat(40));
  try {
    const result = await apiRequest('GET', `/users/?locationId=${LOCATION_ID}`);
    if (result.status === 200) {
      const users = result.data.users || result.data;
      console.log(`   SUCCESS: Found ${Array.isArray(users) ? users.length : 'N/A'} users`);
      if (Array.isArray(users)) {
        users.slice(0, 5).forEach(user => {
          console.log(`   - ${user.name || user.firstName + ' ' + user.lastName} (${user.email})`);
        });
      }
    } else {
      console.log(`   Status: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // Test 4: Try to create a test user (the key test!)
  console.log('\n4. CREATE USER TEST');
  console.log('-'.repeat(40));

  if (!global.companyId) {
    console.log('   Trying to get companyId first...');
    // Try agency endpoint
    const agencyResult = await apiRequest('GET', '/companies/');
    console.log('   Companies response:', JSON.stringify(agencyResult.data, null, 2).substring(0, 300));
  }

  const testUser = {
    companyId: global.companyId || 'test',
    firstName: 'Test',
    lastName: 'APIUser',
    email: `test.api.${Date.now()}@lendwisemtg.com`,
    password: 'TempPass123!',
    phone: '+15551234567',
    type: 'account',
    role: 'user',
    locationIds: [LOCATION_ID],
    permissions: {
      campaignsEnabled: true,
      contactsEnabled: true,
      workflowsEnabled: true,
      opportunitiesEnabled: true,
      dashboardStatsEnabled: true
    }
  };

  console.log('   Attempting to create user:', testUser.email);

  try {
    const result = await apiRequest('POST', '/users/', testUser);
    if (result.status === 200 || result.status === 201) {
      console.log('   SUCCESS: User created!');
      console.log('   User ID:', result.data.id || result.data.userId);
      console.log('   THIS MEANS WE CAN AUTOMATE USER CREATION!');
    } else {
      console.log(`   Status: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2));
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // Test 5: What scopes do we have?
  console.log('\n5. CHECK AVAILABLE ENDPOINTS');
  console.log('-'.repeat(40));

  const endpoints = [
    { name: 'Companies', path: '/companies/' },
    { name: 'Agency', path: '/agency/' },
    { name: 'SaaS Locations', path: '/saas-api/locations' },
    { name: 'Location Tags', path: `/locations/${LOCATION_ID}/tags` }
  ];

  for (const ep of endpoints) {
    try {
      const result = await apiRequest('GET', ep.path);
      console.log(`   ${ep.name}: ${result.status} ${result.status === 200 ? 'OK' : ''}`);
    } catch (err) {
      console.log(`   ${ep.name}: ERROR`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Agency API Key saved to: GHL_AGENCY_API_KEY in .env');
  console.log('CompanyId found:', global.companyId || 'NOT YET - may need different scopes');
}

testAgencyAPI();
