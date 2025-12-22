require('dotenv').config();
const https = require('https');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_KEY = process.env.GHL_API_KEY;

function apiRequest(path) {
  return new Promise((resolve) => {
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
  console.log('MISSION CONTROL - TEMPLATES CHECK');
  console.log('='.repeat(60));

  // Get templates
  const result = await apiRequest(`/locations/${LOCATION_ID}/templates`);

  if (result.status === 200 && result.data.templates) {
    console.log(`Found ${result.data.templates.length} templates:\n`);

    // Group by type
    const byType = {};
    result.data.templates.forEach(t => {
      if (!byType[t.type]) byType[t.type] = [];
      byType[t.type].push(t);
    });

    Object.keys(byType).forEach(type => {
      console.log(`\n--- ${type.toUpperCase()} (${byType[type].length}) ---`);
      byType[type].forEach((t, i) => {
        console.log(`${i+1}. ${t.name}`);
      });
    });
  } else {
    console.log('Error:', result.status);
    console.log(result.data);
  }

  // Also check for calendars
  console.log('\n\n--- CALENDARS ---');
  const calResult = await apiRequest(`/calendars/?locationId=${LOCATION_ID}`);
  if (calResult.status === 200 && calResult.data.calendars) {
    console.log(`Found ${calResult.data.calendars.length} calendars:`);
    calResult.data.calendars.forEach(c => {
      console.log(`  - ${c.name}`);
    });
  }

  // Check for forms
  console.log('\n--- FORMS ---');
  const formResult = await apiRequest(`/forms/?locationId=${LOCATION_ID}`);
  if (formResult.status === 200 && formResult.data.forms) {
    console.log(`Found ${formResult.data.forms.length} forms:`);
    formResult.data.forms.forEach(f => {
      console.log(`  - ${f.name}`);
    });
  }
}

main();
