require('dotenv').config();
const https = require('https');

// LENDWISE MORTGAGE account
const LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const API_KEY = process.env.GHL_API_KEY_LENDWISE;

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
  console.log('SEARCHING FOR EMAIL SIGNATURES - LENDWISE MORTGAGE');
  console.log('='.repeat(60));
  console.log('Location ID:', LOCATION_ID);

  // Try various signature-related endpoints
  const endpoints = [
    `/locations/${LOCATION_ID}/emails/signatures`,
    `/locations/${LOCATION_ID}/signatures`,
    `/locations/${LOCATION_ID}/email-signatures`,
    `/locations/${LOCATION_ID}/settings/signatures`,
    `/locations/${LOCATION_ID}/templates`,
    `/locations/${LOCATION_ID}/templates/email`,
    `/emails/templates?locationId=${LOCATION_ID}`,
    `/locations/${LOCATION_ID}`,
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Testing: ${endpoint} ---`);
    const result = await apiRequest(endpoint);
    console.log(`Status: ${result.status}`);

    if (result.status === 200) {
      // Pretty print the response
      console.log(JSON.stringify(result.data, null, 2).substring(0, 2000));
    } else {
      console.log('Error:', result.data?.message || result.data);
    }
  }
}

main();
