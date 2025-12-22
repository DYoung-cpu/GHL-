require('dotenv').config();
const https = require('https');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const AGENCY_API_KEY = process.env.GHL_AGENCY_API_KEY;
const LOCATION_API_KEY = process.env.GHL_API_KEY;

console.log('='.repeat(50));
console.log('MISSION CONTROL API TEST');
console.log('='.repeat(50));
console.log('Location ID:', LOCATION_ID);
console.log('');

// Test getting Custom Values
function getCustomValues(apiKey, keyName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/locations/${LOCATION_ID}/customValues`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${keyName} - Custom Values:`);
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.customValues && parsed.customValues.length > 0) {
              console.log(`Found ${parsed.customValues.length} custom values:`);
              parsed.customValues.forEach(cv => {
                console.log(`  - ${cv.name}: "${cv.value || '(empty)'}"`);
              });
            } else {
              console.log('No custom values found');
            }
          } catch(e) {
            console.log('Parse error:', e.message);
          }
        } else {
          console.log('Response:', data.substring(0, 200));
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log('Error:', e.message);
      resolve();
    });
    req.end();
  });
}

// Test getting workflows
function getWorkflows(apiKey, keyName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/workflows/?locationId=${LOCATION_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${keyName} - Workflows:`);
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.workflows && parsed.workflows.length > 0) {
              console.log(`Found ${parsed.workflows.length} workflows:`);
              parsed.workflows.slice(0, 10).forEach(wf => {
                console.log(`  - ${wf.name} (${wf.status})`);
              });
              if (parsed.workflows.length > 10) {
                console.log(`  ... and ${parsed.workflows.length - 10} more`);
              }
            } else {
              console.log('No workflows found');
            }
          } catch(e) {
            console.log('Parse error:', e.message);
          }
        } else {
          console.log('Response:', data.substring(0, 200));
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log('Error:', e.message);
      resolve();
    });
    req.end();
  });
}

async function main() {
  // Try with Agency key first
  await getCustomValues(AGENCY_API_KEY, 'AGENCY KEY');
  await getWorkflows(AGENCY_API_KEY, 'AGENCY KEY');

  // Try with Location key
  await getCustomValues(LOCATION_API_KEY, 'LOCATION KEY');
}

main();
