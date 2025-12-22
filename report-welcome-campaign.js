// report-welcome-campaign.js
// Report on contacts who received the "I'm at Lendwise" welcome campaign

const axios = require('axios');

const API_KEY = process.env.GHL_API_KEY;
if (!API_KEY) {
  console.error('Missing env var GHL_API_KEY');
  process.exit(1);
}

const BASE_URL = 'https://services.leadconnectorhq.com';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const SENT_TAG = 'campaign.welcome_lendwise.sent';

async function main() {
  console.log('='.repeat(60));
  console.log('CAMPAIGN REPORT: "I\'m at Lendwise" Welcome Campaign');
  console.log('Tag: campaign.welcome_lendwise.sent');
  console.log('='.repeat(60));

  // Fetch contacts with the sent tag using cursor-based pagination
  let allContacts = [];
  let startAfterId = null;
  let pageCount = 0;
  const limit = 100;

  console.log('\nFetching contacts with sent tag...');

  while (pageCount < 100) { // Safety limit of 100 pages (10,000 contacts)
    const params = {
      locationId: LOCATION_ID,
      limit,
    };

    if (startAfterId) {
      params.startAfterId = startAfterId;
    }

    const res = await client.get('/contacts/', { params });
    const contacts = res.data.contacts || [];

    if (contacts.length === 0) break;

    // Filter for contacts with the sent tag
    const withTag = contacts.filter(c => {
      const tags = (c.tags || []).map(t => t.toLowerCase());
      return tags.includes(SENT_TAG.toLowerCase());
    });

    allContacts = allContacts.concat(withTag);

    // Get last contact ID for next page
    startAfterId = contacts[contacts.length - 1].id;
    pageCount++;

    if (contacts.length < limit) break;

    // Log progress
    process.stdout.write(`  Page ${pageCount}, found ${allContacts.length} so far...\r`);
  }

  console.log('');

  // Deduplicate by contactId
  const seen = new Set();
  const uniqueContacts = allContacts.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  console.log(`Found ${uniqueContacts.length} unique contacts with tag "${SENT_TAG}"\n`);

  // Replace allContacts with deduplicated list
  allContacts = uniqueContacts;

  if (allContacts.length === 0) {
    console.log('No contacts found with this tag.');
    return;
  }

  // Process and extract relevant fields
  const reportData = allContacts.map(c => {
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)';

    // Extract state-related info from tags
    const tags = c.tags || [];
    const stateTags = tags.filter(t =>
      t.toLowerCase().startsWith('state.') ||
      t.toLowerCase().includes('_state') ||
      t.toLowerCase().startsWith('prop_') ||
      t.toLowerCase().startsWith('status_') ||
      t.toLowerCase().startsWith('loan_')
    );

    // Extract state from custom fields
    const customFields = c.customFields || [];
    const stateFields = {};

    for (const cf of customFields) {
      const fieldName = cf.key || cf.id;
      // Look for state-related fields
      if (fieldName && (
        fieldName.toLowerCase().includes('state') ||
        fieldName.toLowerCase().includes('relationship') ||
        fieldName.toLowerCase().includes('loan') ||
        fieldName.toLowerCase().includes('engagement')
      )) {
        stateFields[fieldName] = cf.value;
      }
    }

    // Also check for property state from address
    const propertyState = c.state || c.address?.state || null;

    return {
      contactId: c.id,
      fullName,
      email: c.email || '(no email)',
      propertyState,
      stateTags: stateTags.length > 0 ? stateTags : null,
      stateFields: Object.keys(stateFields).length > 0 ? stateFields : null,
      dateAdded: c.dateAdded,
    };
  });

  // Print summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total contacts sent welcome campaign: ${reportData.length}`);

  // Count by property state if available
  const byState = {};
  reportData.forEach(r => {
    const state = r.propertyState || 'Unknown';
    byState[state] = (byState[state] || 0) + 1;
  });

  if (Object.keys(byState).length > 1 || !byState['Unknown']) {
    console.log('\nBy State:');
    Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });
  }

  // Print sample
  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE DATA (up to 5 contacts)');
  console.log('='.repeat(60));

  const sample = reportData.slice(0, 5);

  console.log('\n| contactId                | fullName              | email                              | state    |');
  console.log('|--------------------------|----------------------|-----------------------------------|----------|');

  sample.forEach(r => {
    const id = r.contactId.padEnd(24).slice(0, 24);
    const name = r.fullName.padEnd(20).slice(0, 20);
    const email = r.email.padEnd(35).slice(0, 35);
    const state = (r.propertyState || '-').padEnd(8).slice(0, 8);
    console.log(`| ${id} | ${name} | ${email} | ${state} |`);
  });

  // Print detailed view of sample
  console.log('\n--- Detailed Sample ---');
  sample.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.fullName} <${r.email}>`);
    console.log(`   contactId: ${r.contactId}`);
    console.log(`   propertyState: ${r.propertyState || 'not set'}`);
    console.log(`   stateTags: ${r.stateTags ? r.stateTags.join(', ') : 'none'}`);
    console.log(`   stateFields: ${r.stateFields ? JSON.stringify(r.stateFields) : 'none'}`);
  });

  // Output JSON summary (not full data to avoid clutter)
  console.log('\n' + '='.repeat(60));
  console.log('JSON SAMPLE (first 5)');
  console.log('='.repeat(60));
  console.log(JSON.stringify(reportData.slice(0, 5), null, 2));

  if (reportData.length > 5) {
    console.log(`\n... and ${reportData.length - 5} more contacts`);
  }
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
