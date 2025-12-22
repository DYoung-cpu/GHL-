// create-engagement-tags.js
// Create universal email engagement tracking tags

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const API_KEY = process.env.GHL_API_KEY;
if (!API_KEY) {
  console.error('Missing env var GHL_API_KEY');
  process.exit(1);
}

const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

const client = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

const TAGS_TO_CREATE = [
  'email.engaged',      // Any email opened
  'email.clicked',      // Any link clicked
  'email.replied',      // Replied to any email
  'email.bounced',      // Email delivery failed
];

async function main() {
  console.log('Creating universal engagement tracking tags...\n');

  // 1. Fetch existing tags
  console.log('1. Fetching existing tags...');
  const existingRes = await client.get(`/locations/${LOCATION_ID}/tags`);
  const existingTags = existingRes.data.tags || [];
  const existingNames = existingTags.map(t => t.name.toLowerCase());

  console.log(`   Found ${existingTags.length} existing tags\n`);

  // 2. Create missing tags
  const created = [];
  const skipped = [];

  for (const tagName of TAGS_TO_CREATE) {
    if (existingNames.includes(tagName.toLowerCase())) {
      const existing = existingTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      console.log(`   SKIP: "${tagName}" already exists (ID: ${existing.id})`);
      skipped.push({ name: tagName, id: existing.id });
    } else {
      try {
        const res = await client.post(`/locations/${LOCATION_ID}/tags`, {
          name: tagName,
        });
        const newTag = res.data.tag || res.data;
        console.log(`   CREATE: "${tagName}" → ID: ${newTag.id}`);
        created.push({ name: tagName, id: newTag.id });
      } catch (err) {
        console.error(`   ERROR creating "${tagName}":`, err.response?.data || err.message);
      }
    }
  }

  // 3. Update ghl-config.json with new tag IDs
  console.log('\n2. Updating ghl-config.json...');

  const cfgPath = path.join(__dirname, 'ghl-config.json');
  const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));

  if (!cfg.tags) cfg.tags = {};

  // Add all tags (created and existing)
  for (const tag of [...created, ...skipped]) {
    const key = tag.name.replace(/\./g, '_'); // email.engaged → email_engaged
    cfg.tags[tag.name] = tag.id;
  }

  await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2));
  console.log('   Config updated\n');

  // 4. Summary
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Created: ${created.length}`);
  console.log(`Skipped (already exist): ${skipped.length}`);
  console.log('\nTag IDs for workflows:');
  for (const tag of [...created, ...skipped]) {
    console.log(`  ${tag.name}: ${tag.id}`);
  }
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
