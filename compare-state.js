require('dotenv').config();
const https = require('https');

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('CURRENT MISSION CONTROL STATE (Post-Snapshot)');
  console.log('='.repeat(60));

  // Workflows
  const workflows = await apiGet(`/workflows/?locationId=${LOCATION_ID}`);
  const wfList = workflows.workflows || [];
  console.log('\n📋 WORKFLOWS (' + wfList.length + '):');
  wfList.forEach((w, i) => {
    console.log(`  ${i+1}. ${w.name} [${w.status}]`);
  });

  // Custom Values
  const customValues = await apiGet(`/locations/${LOCATION_ID}/customValues`);
  const cvList = customValues.customValues || [];
  console.log('\n🔧 CUSTOM VALUES (' + cvList.length + '):');
  cvList.forEach(cv => {
    console.log(`  - ${cv.name}: "${cv.value || '(empty)'}"`);
  });

  // Custom Fields
  const customFields = await apiGet(`/locations/${LOCATION_ID}/customFields`);
  const cfList = customFields.customFields || [];
  console.log('\n📝 CUSTOM FIELDS (' + cfList.length + '):');
  cfList.slice(0, 15).forEach(cf => {
    console.log(`  - ${cf.name} (${cf.dataType})`);
  });
  if (cfList.length > 15) {
    console.log(`  ... and ${cfList.length - 15} more`);
  }

  // Pipelines
  const pipelines = await apiGet(`/opportunities/pipelines?locationId=${LOCATION_ID}`);
  const pList = pipelines.pipelines || [];
  console.log('\n📊 PIPELINES (' + pList.length + '):');
  pList.forEach(p => {
    const stageCount = p.stages ? p.stages.length : 0;
    console.log(`  - ${p.name} (${stageCount} stages)`);
  });

  // Calendars
  const calendars = await apiGet(`/calendars/?locationId=${LOCATION_ID}`);
  const calList = calendars.calendars || [];
  console.log('\n📅 CALENDARS (' + calList.length + '):');
  calList.forEach(c => {
    console.log(`  - ${c.name}`);
  });

  // Templates (Email/SMS)
  const templates = await apiGet(`/locations/${LOCATION_ID}/templates`);
  const tList = templates.templates || [];
  console.log('\n✉️ TEMPLATES (' + tList.length + '):');
  const sms = tList.filter(t => t.type === 'sms');
  const email = tList.filter(t => t.type === 'email');
  console.log(`  SMS: ${sms.length}, Email: ${email.length}`);
  tList.slice(0, 10).forEach(t => {
    console.log(`  - ${t.name} (${t.type})`);
  });
  if (tList.length > 10) {
    console.log(`  ... and ${tList.length - 10} more`);
  }

  // Tags
  const tags = await apiGet(`/locations/${LOCATION_ID}/tags`);
  const tagList = tags.tags || [];
  console.log('\n🏷️ TAGS (' + tagList.length + '):');
  tagList.slice(0, 10).forEach(t => {
    console.log(`  - ${t.name}`);
  });
  if (tagList.length > 10) {
    console.log(`  ... and ${tagList.length - 10} more`);
  }

  // Summary comparison
  console.log('\n' + '='.repeat(60));
  console.log('COMPARISON: What I Built vs What Snapshot Added');
  console.log('='.repeat(60));

  console.log('\nWHAT I BUILT (Phase 1):');
  console.log('  - 93 email/SMS snippets (40 SMS + 53 Email)');
  console.log('  - Mortgage Pipeline with 10 stages');
  console.log('  - Custom fields for mortgage data');
  console.log('  - Tags for lead tracking');
  console.log('  - 2 calendars');

  console.log('\nWHAT SNAPSHOT ADDED:');
  console.log('  - 6 new workflows (all draft)');
  console.log('  - Marketing Pipeline');
  console.log('  - 5 mortgage-specific calendars');
  console.log('  - 30 custom fields');
  console.log('  - 4 custom values');
  console.log('  - 9 dashboards');
  console.log('  - 4 email builder templates');
  console.log('  - 2 forms');
  console.log('  - 2 funnels');

  console.log('\nCURRENT TOTALS:');
  console.log(`  Workflows: ${wfList.length}`);
  console.log(`  Custom Values: ${cvList.length}`);
  console.log(`  Custom Fields: ${cfList.length}`);
  console.log(`  Pipelines: ${pList.length}`);
  console.log(`  Calendars: ${calList.length}`);
  console.log(`  Templates: ${tList.length} (${sms.length} SMS, ${email.length} Email)`);
  console.log(`  Tags: ${tagList.length}`);
}

main().catch(console.error);
