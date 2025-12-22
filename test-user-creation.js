/**
 * Test User Creation - Understanding Requirements
 */
require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE_URL = 'https://services.leadconnectorhq.com';

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return {
    ok: response.ok,
    status: response.status,
    data: await response.json()
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  USER CREATION REQUIREMENTS ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check current users (to understand the structure)
  console.log('1. Current Users in Location:');
  const users = await apiCall(`/users/?locationId=${LOCATION_ID}`);
  if (users.ok) {
    users.data.users?.forEach(u => {
      console.log(`   - ${u.firstName} ${u.lastName} (${u.email})`);
      console.log(`     Role: ${u.role}, Type: ${u.type}`);
      console.log(`     Company ID: ${u.companyId || 'N/A'}`);
      console.log(`     Permissions: ${JSON.stringify(u.permissions || {}).substring(0, 80)}...`);
      console.log('');
    });
  }

  // 2. Try to get company/agency info
  console.log('\n2. Checking for Company/Agency Info:');
  const companyEndpoints = [
    `/companies/`,
    `/agencies/`,
    `/locations/${LOCATION_ID}/company`,
    `/saas/locations/${LOCATION_ID}`
  ];

  for (const endpoint of companyEndpoints) {
    const result = await apiCall(endpoint);
    console.log(`   ${endpoint}: ${result.status} ${result.ok ? '✓' : '✗'}`);
    if (result.ok) {
      console.log(`     Data: ${JSON.stringify(result.data).substring(0, 200)}...`);
    }
  }

  // 3. Try different user creation payloads
  console.log('\n3. Testing User Creation Variations:');

  const variations = [
    {
      name: 'With companyId from existing user',
      payload: async () => {
        const companyId = users.data.users?.[0]?.companyId;
        return {
          companyId: companyId,
          firstName: 'Test',
          lastName: 'NewUser',
          email: 'testcreate@lendwisemtg.com',
          password: 'TestPass123!',
          type: 'account',
          role: 'user',
          locationIds: [LOCATION_ID]
        };
      }
    },
    {
      name: 'With locationId only',
      payload: async () => ({
        firstName: 'Test',
        lastName: 'NewUser2',
        email: 'testcreate2@lendwisemtg.com',
        password: 'TestPass123!',
        type: 'account',
        role: 'user',
        locationIds: [LOCATION_ID],
        permissions: {}
      })
    }
  ];

  for (const v of variations) {
    const payload = await v.payload();
    console.log(`\n   Testing: ${v.name}`);
    console.log(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 300)}`);

    const result = await apiCall('/users/', 'POST', payload);
    if (result.ok) {
      console.log(`   ✓ SUCCESS! User ID: ${result.data.id}`);
    } else {
      console.log(`   ✗ FAILED: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.data)}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
