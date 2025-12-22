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
  console.log('DEEP DIVE: What Did the Snapshot Actually Add?');
  console.log('='.repeat(60));

  // Pipelines with full stage details
  const pipelines = await apiGet(`/opportunities/pipelines?locationId=${LOCATION_ID}`);
  console.log('\n📊 PIPELINES WITH STAGES:');
  if (pipelines.pipelines) {
    pipelines.pipelines.forEach(p => {
      console.log(`\n  ${p.name}:`);
      if (p.stages) {
        p.stages.forEach((s, i) => {
          console.log(`    ${i+1}. ${s.name}`);
        });
      }
    });
  }

  // ALL Tags
  const tags = await apiGet(`/locations/${LOCATION_ID}/tags`);
  console.log('\n\n🏷️ ALL TAGS:');
  if (tags.tags) {
    tags.tags.forEach(t => {
      console.log(`  - ${t.name}`);
    });
  }

  // ALL Custom Fields
  const customFields = await apiGet(`/locations/${LOCATION_ID}/customFields`);
  console.log('\n\n📝 ALL CUSTOM FIELDS:');
  if (customFields.customFields) {
    customFields.customFields.forEach(cf => {
      console.log(`  - ${cf.name} (${cf.dataType})`);
    });
  }

  // ALL Custom Values
  const customValues = await apiGet(`/locations/${LOCATION_ID}/customValues`);
  console.log('\n\n🔧 ALL CUSTOM VALUES:');
  if (customValues.customValues) {
    customValues.customValues.forEach(cv => {
      const val = cv.value || '(empty)';
      const shortVal = val.length > 50 ? val.substring(0, 50) + '...' : val;
      console.log(`  - ${cv.name}: "${shortVal}"`);
    });
  }

  // Check for forms
  const forms = await apiGet(`/forms?locationId=${LOCATION_ID}`);
  console.log('\n\n📋 FORMS:');
  if (forms.forms) {
    forms.forms.forEach(f => {
      console.log(`  - ${f.name}`);
    });
  } else if (forms.length) {
    forms.forEach(f => {
      console.log(`  - ${f.name}`);
    });
  } else {
    console.log('  (none found via API or different endpoint needed)');
  }

  // Check for surveys
  const surveys = await apiGet(`/surveys?locationId=${LOCATION_ID}`);
  console.log('\n\n📊 SURVEYS:');
  if (surveys.surveys) {
    surveys.surveys.forEach(s => {
      console.log(`  - ${s.name}`);
    });
  } else {
    console.log('  (none found)');
  }

  // Look for things like "approved", "submitted", "documentation"
  console.log('\n\n' + '='.repeat(60));
  console.log('SEARCHING FOR MORTGAGE WORKFLOW STAGES...');
  console.log('='.repeat(60));

  const searchTerms = ['approved', 'submitted', 'documentation', 'underwriting', 'closing', 'funded', 'pre-approval', 'application'];

  // Search in pipeline stages
  console.log('\nIn Pipeline Stages:');
  if (pipelines.pipelines) {
    pipelines.pipelines.forEach(p => {
      if (p.stages) {
        p.stages.forEach(s => {
          const stageLower = s.name.toLowerCase();
          searchTerms.forEach(term => {
            if (stageLower.includes(term)) {
              console.log(`  Found "${term}" in ${p.name}: ${s.name}`);
            }
          });
        });
      }
    });
  }

  // Search in tags
  console.log('\nIn Tags:');
  if (tags.tags) {
    tags.tags.forEach(t => {
      const tagLower = t.name.toLowerCase();
      searchTerms.forEach(term => {
        if (tagLower.includes(term)) {
          console.log(`  Found "${term}": ${t.name}`);
        }
      });
    });
  }

  // Search in custom fields
  console.log('\nIn Custom Fields:');
  if (customFields.customFields) {
    customFields.customFields.forEach(cf => {
      const cfLower = cf.name.toLowerCase();
      searchTerms.forEach(term => {
        if (cfLower.includes(term)) {
          console.log(`  Found "${term}": ${cf.name}`);
        }
      });
    });
  }
}

main().catch(console.error);
