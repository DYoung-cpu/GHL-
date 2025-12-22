require('dotenv').config();
const https = require('https');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_KEY = process.env.GHL_API_KEY;

function apiRequest(path, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
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
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('MISSION CONTROL - SNAPSHOT CONTENTS');
  console.log('='.repeat(60));
  console.log('Location ID:', LOCATION_ID);
  console.log('');

  // Get Workflows
  console.log('\n--- WORKFLOWS ---');
  const wfResult = await apiRequest(`/workflows/?locationId=${LOCATION_ID}`);
  if (wfResult.status === 200 && wfResult.data.workflows) {
    console.log(`Found ${wfResult.data.workflows.length} workflows:\n`);
    wfResult.data.workflows.forEach((wf, i) => {
      console.log(`${i+1}. ${wf.name}`);
      console.log(`   Status: ${wf.status} | ID: ${wf.id}`);
    });
  } else {
    console.log('Error:', wfResult);
  }

  // Get Tags
  console.log('\n--- TAGS ---');
  const tagResult = await apiRequest(`/locations/${LOCATION_ID}/tags`);
  if (tagResult.status === 200 && tagResult.data.tags) {
    console.log(`Found ${tagResult.data.tags.length} tags:`);
    tagResult.data.tags.slice(0, 20).forEach(tag => {
      console.log(`  - ${tag.name}`);
    });
    if (tagResult.data.tags.length > 20) {
      console.log(`  ... and ${tagResult.data.tags.length - 20} more`);
    }
  }

  // Get Custom Values
  console.log('\n--- CUSTOM VALUES ---');
  const cvResult = await apiRequest(`/locations/${LOCATION_ID}/customValues`);
  if (cvResult.status === 200 && cvResult.data.customValues) {
    if (cvResult.data.customValues.length === 0) {
      console.log('No custom values found - we need to create them!');
    } else {
      console.log(`Found ${cvResult.data.customValues.length} custom values:`);
      cvResult.data.customValues.forEach(cv => {
        console.log(`  - ${cv.name}: "${cv.value || '(empty)'}"`);
      });
    }
  }

  // Get Custom Fields
  console.log('\n--- CUSTOM FIELDS ---');
  const cfResult = await apiRequest(`/locations/${LOCATION_ID}/customFields`);
  if (cfResult.status === 200 && cfResult.data.customFields) {
    console.log(`Found ${cfResult.data.customFields.length} custom fields:`);
    cfResult.data.customFields.slice(0, 15).forEach(cf => {
      console.log(`  - ${cf.name} (${cf.dataType})`);
    });
    if (cfResult.data.customFields.length > 15) {
      console.log(`  ... and ${cfResult.data.customFields.length - 15} more`);
    }
  }

  // Get Pipelines
  console.log('\n--- PIPELINES ---');
  const pipResult = await apiRequest(`/opportunities/pipelines?locationId=${LOCATION_ID}`);
  if (pipResult.status === 200 && pipResult.data.pipelines) {
    console.log(`Found ${pipResult.data.pipelines.length} pipelines:`);
    pipResult.data.pipelines.forEach(pip => {
      console.log(`  - ${pip.name} (${pip.stages?.length || 0} stages)`);
      if (pip.stages) {
        pip.stages.forEach(stage => {
          console.log(`      └─ ${stage.name}`);
        });
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('EXPLORATION COMPLETE');
  console.log('='.repeat(60));
}

main();
