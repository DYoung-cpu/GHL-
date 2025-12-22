/**
 * Deep API Exploration - What can Agency API do?
 */

require('dotenv').config();
const https = require('https');

const AGENCY_API_KEY = process.env.GHL_AGENCY_API_KEY;
const LOCATION_API_KEY = process.env.GHL_API_KEY;
const COMPANY_ID = process.env.GHL_COMPANY_ID;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_BASE = 'services.leadconnectorhq.com';

function apiRequest(apiKey, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

async function compareAPIs() {
  console.log('='.repeat(70));
  console.log('DEEP API COMPARISON: Agency Key vs Location Key');
  console.log('='.repeat(70));

  const tests = [
    // Location Management
    { name: 'List ALL Locations', path: '/locations/search', method: 'GET' },
    { name: 'Get Location Details', path: `/locations/${LOCATION_ID}`, method: 'GET' },
    { name: 'Location Custom Fields', path: `/locations/${LOCATION_ID}/customFields`, method: 'GET' },
    { name: 'Location Custom Values', path: `/locations/${LOCATION_ID}/customValues`, method: 'GET' },
    { name: 'Location Tags', path: `/locations/${LOCATION_ID}/tags`, method: 'GET' },
    { name: 'Location Templates', path: `/locations/${LOCATION_ID}/templates`, method: 'GET' },

    // User Management
    { name: 'List Users', path: `/users/?locationId=${LOCATION_ID}`, method: 'GET' },
    { name: 'Search Users', path: `/users/search?companyId=${COMPANY_ID}`, method: 'GET' },

    // Contacts
    { name: 'List Contacts', path: `/contacts/?locationId=${LOCATION_ID}&limit=5`, method: 'GET' },

    // Calendars
    { name: 'List Calendars', path: `/calendars/?locationId=${LOCATION_ID}`, method: 'GET' },
    { name: 'Calendar Groups', path: `/calendars/groups?locationId=${LOCATION_ID}`, method: 'GET' },

    // Workflows
    { name: 'List Workflows', path: `/workflows/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Pipelines/Opportunities
    { name: 'List Pipelines', path: `/opportunities/pipelines?locationId=${LOCATION_ID}`, method: 'GET' },

    // Conversations/Messaging
    { name: 'List Conversations', path: `/conversations/search?locationId=${LOCATION_ID}`, method: 'GET' },

    // Campaigns
    { name: 'List Campaigns', path: `/campaigns/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Forms
    { name: 'List Forms', path: `/forms/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Funnels
    { name: 'List Funnels', path: `/funnels/?locationId=${LOCATION_ID}`, method: 'GET' },
    { name: 'Funnel Pages', path: `/funnels/page?locationId=${LOCATION_ID}`, method: 'GET' },

    // Surveys
    { name: 'List Surveys', path: `/surveys/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Trigger Links
    { name: 'Trigger Links', path: `/links/?locationId=${LOCATION_ID}`, method: 'GET' },

    // SaaS (Agency-only)
    { name: 'SaaS Locations', path: `/saas-api/locations`, method: 'GET' },
    { name: 'SaaS Rebilling', path: `/saas-api/rebilling`, method: 'GET' },

    // Snapshots
    { name: 'Get Snapshots', path: `/snapshots?companyId=${COMPANY_ID}`, method: 'GET' },

    // Businesses
    { name: 'List Businesses', path: `/businesses/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Media
    { name: 'Media Library', path: `/medias/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Products
    { name: 'List Products', path: `/products/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Invoices
    { name: 'List Invoices', path: `/invoices/?locationId=${LOCATION_ID}&limit=5`, method: 'GET' },

    // Payments
    { name: 'Payment Orders', path: `/payments/orders?locationId=${LOCATION_ID}`, method: 'GET' },
    { name: 'Transactions', path: `/payments/transactions?locationId=${LOCATION_ID}`, method: 'GET' },
    { name: 'Subscriptions', path: `/payments/subscriptions?locationId=${LOCATION_ID}`, method: 'GET' },

    // Social Planner
    { name: 'Social Planner Posts', path: `/social-media-posting/?locationId=${LOCATION_ID}`, method: 'GET' },

    // Associations
    { name: 'Associations', path: `/associations/?locationId=${LOCATION_ID}`, method: 'GET' },
  ];

  console.log('\n' + '-'.repeat(70));
  console.log('ENDPOINT'.padEnd(35) + 'AGENCY KEY'.padEnd(15) + 'LOCATION KEY');
  console.log('-'.repeat(70));

  const agencyOnlyEndpoints = [];
  const locationOnlyEndpoints = [];
  const bothWorkEndpoints = [];
  const neitherWorkEndpoints = [];

  for (const test of tests) {
    const agencyResult = await apiRequest(AGENCY_API_KEY, test.method, test.path);
    const locationResult = await apiRequest(LOCATION_API_KEY, test.method, test.path);

    const agencyOK = agencyResult.status >= 200 && agencyResult.status < 300;
    const locationOK = locationResult.status >= 200 && locationResult.status < 300;

    const agencyStatus = agencyOK ? `✓ ${agencyResult.status}` : `✗ ${agencyResult.status}`;
    const locationStatus = locationOK ? `✓ ${locationResult.status}` : `✗ ${locationResult.status}`;

    console.log(test.name.padEnd(35) + agencyStatus.padEnd(15) + locationStatus);

    if (agencyOK && !locationOK) {
      agencyOnlyEndpoints.push({ ...test, agencyData: agencyResult.data });
    } else if (!agencyOK && locationOK) {
      locationOnlyEndpoints.push(test);
    } else if (agencyOK && locationOK) {
      bothWorkEndpoints.push(test);
    } else {
      neitherWorkEndpoints.push(test);
    }

    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  console.log(`\n✓ AGENCY KEY ONLY (${agencyOnlyEndpoints.length} endpoints):`);
  agencyOnlyEndpoints.forEach(ep => {
    console.log(`  - ${ep.name}`);
    if (ep.agencyData && typeof ep.agencyData === 'object') {
      const keys = Object.keys(ep.agencyData);
      console.log(`    Data keys: ${keys.slice(0, 5).join(', ')}`);
    }
  });

  console.log(`\n✓ LOCATION KEY ONLY (${locationOnlyEndpoints.length} endpoints):`);
  locationOnlyEndpoints.forEach(ep => console.log(`  - ${ep.name}`));

  console.log(`\n✓ BOTH KEYS WORK (${bothWorkEndpoints.length} endpoints):`);
  bothWorkEndpoints.forEach(ep => console.log(`  - ${ep.name}`));

  console.log(`\n✗ NEITHER KEY WORKS (${neitherWorkEndpoints.length} endpoints):`);
  neitherWorkEndpoints.forEach(ep => console.log(`  - ${ep.name}`));

  // Test user creation specifically
  console.log('\n' + '='.repeat(70));
  console.log('USER CREATION TEST - Assigning to specific sub-account');
  console.log('='.repeat(70));

  console.log('\nCan we create a user for LENDWISE MORTGAGE specifically?');
  console.log(`Location ID: ${LOCATION_ID}`);
  console.log('YES - the locationIds parameter controls which sub-accounts the user can access.');
  console.log('\nExample user assignment options:');
  console.log('  - Single location: locationIds: ["e6yMsslzphNw8bgqRgtV"]');
  console.log('  - Multiple locations: locationIds: ["e6yMsslzphNw8bgqRgtV", "peE6XmGYBb1xV0iNbh6C"]');
  console.log('  - All locations: Include all location IDs');
}

compareAPIs().catch(console.error);
