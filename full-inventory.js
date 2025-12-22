/**
 * Full Inventory - Get complete list of workflows, tags, custom fields
 * Identify duplicates and items to clean up
 */

require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_BASE = 'https://services.leadconnectorhq.com';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};

async function fetchAPI(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    console.log(`Error fetching ${endpoint}: ${response.status}`);
    return null;
  }
  return await response.json();
}

// Core 15 workflow names we want to keep
const CORE_WORKFLOWS = [
  'New Lead Nurture Sequence',
  'Appointment Reminder Sequence',
  'Missed Appointment Follow-Up',
  'Pre-Qualification Process Workflow',
  'Pre-Qualification Complete Notification',
  'Application Process Updates',
  'Underwriting Status Updates',
  'Conditional Approval Celebration',
  'Clear to Close Celebration',
  'Closing Countdown Sequence',
  'Post-Close Nurture & Referral Sequence',
  'Realtor Partner Updates',
  'Rate Drop Alert Campaign',
  'Birthday Wishes',
  'Stale Lead Re-engagement'
];

// Pre-existing workflows that might be useful to keep
const LEGACY_WORKFLOWS = [
  'Internet Purchase Lead',
  'Internet Refi Lead',
  'Live Transfer',
  'Live Transfer Purchase',
  'Live Transfer Refi',
  'CA HELOC Email',
  'HELOC Email',
  'Purchase Pipeline',
  'Refi Pipeline',
  'Shopping around'
];

async function main() {
  console.log('='.repeat(70));
  console.log('  FULL INVENTORY & CLEANUP ANALYSIS');
  console.log('='.repeat(70));

  // === WORKFLOWS ===
  console.log('\n' + '='.repeat(70));
  console.log('  WORKFLOWS');
  console.log('='.repeat(70));

  const workflows = await fetchAPI(`/workflows/?locationId=${LOCATION_ID}`);
  const wfList = workflows?.workflows || [];

  const wfAnalysis = {
    core: [],
    legacy: [],
    duplicates: [],
    placeholders: [],
    unknown: []
  };

  const seenNames = new Map();

  wfList.forEach(w => {
    const name = w.name;

    // Track duplicates
    if (seenNames.has(name)) {
      seenNames.get(name).push(w);
    } else {
      seenNames.set(name, [w]);
    }

    // Categorize
    if (name.startsWith('New Workflow :')) {
      wfAnalysis.placeholders.push(w);
    } else if (CORE_WORKFLOWS.some(c => name.includes(c) || c.includes(name))) {
      wfAnalysis.core.push(w);
    } else if (LEGACY_WORKFLOWS.some(l => name.includes(l))) {
      wfAnalysis.legacy.push(w);
    } else {
      wfAnalysis.unknown.push(w);
    }
  });

  // Find duplicates
  seenNames.forEach((items, name) => {
    if (items.length > 1) {
      wfAnalysis.duplicates.push({ name, count: items.length, items });
    }
  });

  console.log(`\nTotal workflows: ${wfList.length}`);
  console.log(`\n--- CORE WORKFLOWS (KEEP) ---`);
  wfAnalysis.core.forEach(w => console.log(`  [${w.status}] ${w.name} (${w.id})`));

  console.log(`\n--- LEGACY WORKFLOWS (REVIEW) ---`);
  wfAnalysis.legacy.forEach(w => console.log(`  [${w.status}] ${w.name} (${w.id})`));

  console.log(`\n--- PLACEHOLDER WORKFLOWS (DELETE) ---`);
  wfAnalysis.placeholders.forEach(w => console.log(`  [${w.status}] ${w.name} (${w.id})`));

  console.log(`\n--- UNKNOWN WORKFLOWS (REVIEW) ---`);
  wfAnalysis.unknown.forEach(w => console.log(`  [${w.status}] ${w.name} (${w.id})`));

  console.log(`\n--- DUPLICATES (DELETE EXTRAS) ---`);
  wfAnalysis.duplicates.forEach(d => {
    console.log(`  "${d.name}" appears ${d.count} times:`);
    d.items.forEach(w => console.log(`    - ${w.id} [${w.status}]`));
  });

  // === TAGS ===
  console.log('\n' + '='.repeat(70));
  console.log('  TAGS');
  console.log('='.repeat(70));

  const tags = await fetchAPI(`/locations/${LOCATION_ID}/tags`);
  const tagList = tags?.tags || [];

  console.log(`\nTotal tags: ${tagList.length}`);

  // Group by category
  const tagCategories = {
    automation: [],
    status: [],
    source: [],
    loan: [],
    property: [],
    buyer: [],
    other: []
  };

  tagList.forEach(t => {
    const name = t.name.toLowerCase();
    if (['new lead', 'application started', 'pre-qual', 'in underwriting', 'conditionally approved',
         'clear to close', 'closing scheduled', 'closed', 'realtor referral', 'appointment scheduled',
         'do not contact', 'long-term nurture', 'documents received', 'past client', 'cold lead',
         'borrower reached', 'no response'].some(a => name.includes(a.toLowerCase()))) {
      tagCategories.automation.push(t);
    } else if (name.startsWith('status_')) {
      tagCategories.status.push(t);
    } else if (name.startsWith('source_')) {
      tagCategories.source.push(t);
    } else if (name.startsWith('loan_')) {
      tagCategories.loan.push(t);
    } else if (name.startsWith('prop_')) {
      tagCategories.property.push(t);
    } else if (name.startsWith('buyer_')) {
      tagCategories.buyer.push(t);
    } else {
      tagCategories.other.push(t);
    }
  });

  console.log(`\n--- AUTOMATION TRIGGER TAGS (${tagCategories.automation.length}) ---`);
  tagCategories.automation.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- STATUS TAGS (${tagCategories.status.length}) ---`);
  tagCategories.status.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- SOURCE TAGS (${tagCategories.source.length}) ---`);
  tagCategories.source.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- LOAN TYPE TAGS (${tagCategories.loan.length}) ---`);
  tagCategories.loan.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- PROPERTY TAGS (${tagCategories.property.length}) ---`);
  tagCategories.property.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- BUYER TYPE TAGS (${tagCategories.buyer.length}) ---`);
  tagCategories.buyer.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\n--- OTHER TAGS (${tagCategories.other.length}) ---`);
  tagCategories.other.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  // === CUSTOM FIELDS ===
  console.log('\n' + '='.repeat(70));
  console.log('  CUSTOM FIELDS');
  console.log('='.repeat(70));

  const fields = await fetchAPI(`/locations/${LOCATION_ID}/customFields`);
  const fieldList = fields?.customFields || [];

  console.log(`\nTotal custom fields: ${fieldList.length}`);
  fieldList.forEach(f => console.log(`  - ${f.name} (${f.fieldKey}) [${f.dataType}]`));

  // === SUMMARY ===
  console.log('\n' + '='.repeat(70));
  console.log('  CLEANUP RECOMMENDATIONS');
  console.log('='.repeat(70));

  console.log(`
WORKFLOWS TO DELETE (${wfAnalysis.placeholders.length + wfAnalysis.duplicates.reduce((sum, d) => sum + d.count - 1, 0)}):
- ${wfAnalysis.placeholders.length} placeholder "New Workflow : [number]" entries
- ${wfAnalysis.duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicate entries (keep 1 of each)

WORKFLOWS TO REVIEW (${wfAnalysis.unknown.length}):
- Check if these should be kept or deleted

API LIMITATIONS:
- Workflows: READ-ONLY via API - must use browser automation to delete
- Tags: Can delete via API (DELETE /locations/{locationId}/tags/{tagId})
- Custom Fields: Can delete via API

NOTE: BNTouch extracted content is in:
- extracted-emails/ (141 HTML templates)
- bntouch-audit/ (complete audit data)
- mission-control/ (processed templates ready for GHL)
`);

  // Save cleanup data
  const cleanupData = {
    timestamp: new Date().toISOString(),
    workflows: {
      total: wfList.length,
      core: wfAnalysis.core.map(w => ({ id: w.id, name: w.name, status: w.status })),
      legacy: wfAnalysis.legacy.map(w => ({ id: w.id, name: w.name, status: w.status })),
      placeholders: wfAnalysis.placeholders.map(w => ({ id: w.id, name: w.name, status: w.status })),
      unknown: wfAnalysis.unknown.map(w => ({ id: w.id, name: w.name, status: w.status })),
      duplicates: wfAnalysis.duplicates
    },
    tags: {
      total: tagList.length,
      all: tagList
    },
    customFields: {
      total: fieldList.length,
      all: fieldList
    }
  };

  require('fs').writeFileSync('./cleanup-inventory.json', JSON.stringify(cleanupData, null, 2));
  console.log('\nSaved full inventory to cleanup-inventory.json');
}

main().catch(console.error);
