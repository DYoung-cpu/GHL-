/**
 * Direct API Verification - No Browser Required
 */

require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;  // Mission Control API key
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_BASE = 'https://services.leadconnectorhq.com';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};

async function fetchAPI(endpoint) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log(`   Fetching: ${url}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.log(`   Error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Mission Control - Transfer Verification');
  console.log('='.repeat(60));
  console.log(`\nAPI Key: ${API_KEY?.substring(0, 20)}...`);
  console.log(`Location ID: ${LOCATION_ID}\n`);

  // === WORKFLOWS ===
  console.log('📋 WORKFLOWS:');
  const workflows = await fetchAPI(`/workflows/?locationId=${LOCATION_ID}`);
  if (workflows?.workflows) {
    console.log(`   Found: ${workflows.workflows.length} workflows\n`);
    workflows.workflows.forEach(w => {
      console.log(`   - ${w.name} (${w.status || 'draft'})`);
    });
  } else {
    console.log('   Could not fetch workflows');
  }

  // === CUSTOM FIELDS ===
  console.log('\n📋 CUSTOM FIELDS:');
  const fields = await fetchAPI(`/locations/${LOCATION_ID}/customFields`);
  if (fields?.customFields) {
    console.log(`   Found: ${fields.customFields.length} custom fields\n`);
    fields.customFields.slice(0, 15).forEach(f => {
      console.log(`   - ${f.name} (${f.fieldKey})`);
    });
    if (fields.customFields.length > 15) {
      console.log(`   ... and ${fields.customFields.length - 15} more`);
    }
  } else {
    console.log('   Could not fetch custom fields');
  }

  // === TAGS ===
  console.log('\n📋 TAGS:');
  const tags = await fetchAPI(`/locations/${LOCATION_ID}/tags`);
  if (tags?.tags) {
    console.log(`   Found: ${tags.tags.length} tags\n`);
    tags.tags.forEach(t => {
      console.log(`   - ${t.name}`);
    });
  } else {
    console.log('   Could not fetch tags');
  }

  // === PIPELINES ===
  console.log('\n📋 PIPELINES:');
  const pipelines = await fetchAPI(`/opportunities/pipelines?locationId=${LOCATION_ID}`);
  if (pipelines?.pipelines) {
    console.log(`   Found: ${pipelines.pipelines.length} pipelines\n`);
    pipelines.pipelines.forEach(p => {
      console.log(`   - ${p.name} (${p.stages?.length || 0} stages)`);
    });
  } else {
    console.log('   Could not fetch pipelines');
  }

  // === CALENDARS ===
  console.log('\n📋 CALENDARS:');
  const calendars = await fetchAPI(`/calendars/?locationId=${LOCATION_ID}`);
  if (calendars?.calendars) {
    console.log(`   Found: ${calendars.calendars.length} calendars\n`);
    calendars.calendars.forEach(c => {
      console.log(`   - ${c.name}`);
    });
  } else {
    console.log('   Could not fetch calendars');
  }

  // === CONTACTS (sample check) ===
  console.log('\n📋 CONTACTS:');
  const contacts = await fetchAPI(`/contacts/?locationId=${LOCATION_ID}&limit=1`);
  if (contacts?.contacts !== undefined) {
    console.log(`   Sample check passed - contacts endpoint accessible`);
    console.log(`   Total in response: ${contacts.contacts?.length || 0}`);
  } else {
    console.log('   Could not fetch contacts');
  }

  // === SUMMARY ===
  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));

  const expected = {
    workflows: 13,
    customFields: 53,
    tags: 11,
    pipelines: 2,
    calendars: 2
  };

  const actual = {
    workflows: workflows?.workflows?.length || 0,
    customFields: fields?.customFields?.length || 0,
    tags: tags?.tags?.length || 0,
    pipelines: pipelines?.pipelines?.length || 0,
    calendars: calendars?.calendars?.length || 0
  };

  console.log('\n   EXPECTED (from snapshot) vs ACTUAL:\n');
  console.log(`   Workflows:     ${expected.workflows} expected | ${actual.workflows} actual ${actual.workflows >= expected.workflows ? '✅' : '⚠️'}`);
  console.log(`   Custom Fields: ${expected.customFields} expected | ${actual.customFields} actual ${actual.customFields >= expected.customFields ? '✅' : '⚠️'}`);
  console.log(`   Tags:          ${expected.tags} expected | ${actual.tags} actual ${actual.tags >= expected.tags ? '✅' : '⚠️'}`);
  console.log(`   Pipelines:     ${expected.pipelines} expected | ${actual.pipelines} actual ${actual.pipelines >= expected.pipelines ? '✅' : '⚠️'}`);
  console.log(`   Calendars:     ${expected.calendars} expected | ${actual.calendars} actual ${actual.calendars >= expected.calendars ? '✅' : '⚠️'}`);

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
