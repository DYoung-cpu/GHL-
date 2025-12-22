/**
 * API Explorer - Discover ALL available endpoints
 */
require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE_URL = 'https://services.leadconnectorhq.com';

async function testEndpoint(name, endpoint, method = 'GET', body = null) {
  try {
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
    const status = response.status;

    if (response.ok) {
      const data = await response.json();
      const keys = Object.keys(data);
      const count = Array.isArray(data) ? data.length :
                   (data[keys[0]] && Array.isArray(data[keys[0]])) ? data[keys[0]].length : 'N/A';
      console.log(`✓ ${name}: ${status} - Keys: [${keys.join(', ')}] Count: ${count}`);
      return { success: true, data, status };
    } else {
      const errorText = await response.text();
      console.log(`✗ ${name}: ${status} - ${errorText.substring(0, 100)}`);
      return { success: false, status, error: errorText };
    }
  } catch (error) {
    console.log(`✗ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GHL API ENDPOINT EXPLORER - Complete Review');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('LOCATION-BASED ENDPOINTS\n');

  // Workflows
  console.log('--- WORKFLOWS ---');
  await testEndpoint('List Workflows', `/workflows/?locationId=${LOCATION_ID}`);

  // Try to get a specific workflow with full details
  const wfResponse = await fetch(`${BASE_URL}/workflows/?locationId=${LOCATION_ID}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Version': '2021-07-28' }
  });
  const wfData = await wfResponse.json();
  if (wfData.workflows?.[0]) {
    const wfId = wfData.workflows[0].id;
    await testEndpoint('Get Single Workflow', `/workflows/${wfId}`);

    // Check if there are trigger/action sub-endpoints
    await testEndpoint('Workflow Triggers?', `/workflows/${wfId}/triggers`);
    await testEndpoint('Workflow Actions?', `/workflows/${wfId}/actions`);
    await testEndpoint('Workflow Steps?', `/workflows/${wfId}/steps`);
  }

  // Tags
  console.log('\n--- TAGS ---');
  await testEndpoint('List Tags', `/locations/${LOCATION_ID}/tags`);

  // Contacts
  console.log('\n--- CONTACTS ---');
  await testEndpoint('Search Contacts', `/contacts/?locationId=${LOCATION_ID}&limit=5`);

  // Pipelines
  console.log('\n--- PIPELINES & OPPORTUNITIES ---');
  await testEndpoint('List Pipelines', `/opportunities/pipelines?locationId=${LOCATION_ID}`);

  // Calendars
  console.log('\n--- CALENDARS ---');
  await testEndpoint('List Calendars', `/calendars/?locationId=${LOCATION_ID}`);

  // Custom Fields
  console.log('\n--- CUSTOM FIELDS ---');
  await testEndpoint('List Custom Fields', `/locations/${LOCATION_ID}/customFields`);
  await testEndpoint('List Custom Values', `/locations/${LOCATION_ID}/customValues`);

  // Templates/Snippets
  console.log('\n--- TEMPLATES ---');
  await testEndpoint('Email Templates', `/locations/${LOCATION_ID}/templates/email`);
  await testEndpoint('SMS Templates', `/locations/${LOCATION_ID}/templates/sms`);

  // Forms
  console.log('\n--- FORMS ---');
  await testEndpoint('List Forms', `/forms/?locationId=${LOCATION_ID}`);
  await testEndpoint('List Form Submissions', `/forms/submissions?locationId=${LOCATION_ID}&limit=5`);

  // Conversations
  console.log('\n--- CONVERSATIONS ---');
  await testEndpoint('Search Conversations', `/conversations/search?locationId=${LOCATION_ID}&limit=5`);

  // Campaigns
  console.log('\n--- CAMPAIGNS ---');
  await testEndpoint('List Campaigns', `/campaigns/?locationId=${LOCATION_ID}`);

  // Users
  console.log('\n--- USERS ---');
  await testEndpoint('List Users', `/users/?locationId=${LOCATION_ID}`);

  // Funnels
  console.log('\n--- FUNNELS ---');
  await testEndpoint('List Funnels', `/funnels/?locationId=${LOCATION_ID}`);
  await testEndpoint('List Funnel Pages', `/funnels/page?locationId=${LOCATION_ID}`);

  // Surveys
  console.log('\n--- SURVEYS ---');
  await testEndpoint('List Surveys', `/surveys/?locationId=${LOCATION_ID}`);

  // Social Planner
  console.log('\n--- SOCIAL ---');
  await testEndpoint('Social Media Posts', `/social-media-posting/posts?locationId=${LOCATION_ID}`);

  // Invoices/Payments
  console.log('\n--- PAYMENTS ---');
  await testEndpoint('List Invoices', `/invoices/?locationId=${LOCATION_ID}&limit=5`);
  await testEndpoint('List Products', `/products/?locationId=${LOCATION_ID}`);

  // Media
  console.log('\n--- MEDIA ---');
  await testEndpoint('List Media Files', `/medias/files?locationId=${LOCATION_ID}&limit=5`);

  // Location Settings
  console.log('\n--- LOCATION SETTINGS ---');
  await testEndpoint('Location Info', `/locations/${LOCATION_ID}`);
  await testEndpoint('Location Snapshots', `/locations/${LOCATION_ID}/snapshots`);

  // Trigger Links
  console.log('\n--- TRIGGER LINKS ---');
  await testEndpoint('List Trigger Links', `/links/?locationId=${LOCATION_ID}`);

  // Try other potential workflow endpoints
  console.log('\n--- ADDITIONAL WORKFLOW TESTS ---');
  await testEndpoint('Workflow Triggers API', `/workflows/triggers?locationId=${LOCATION_ID}`);
  await testEndpoint('Automations', `/automations/?locationId=${LOCATION_ID}`);
  await testEndpoint('Automation Rules', `/automation-rules/?locationId=${LOCATION_ID}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  EXPLORATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
