require('dotenv').config();
const https = require('https');

const AGENCY_API_KEY = process.env.GHL_AGENCY_API_KEY;

const options = {
  hostname: 'services.leadconnectorhq.com',
  path: '/locations/search',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AGENCY_API_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      if (parsed.locations) {
        console.log('\n=== ALL LOCATIONS ===\n');
        parsed.locations.forEach(loc => {
          console.log('Name:', loc.name);
          console.log('Location ID:', loc.id);
          console.log('Address:', loc.address || 'N/A');
          console.log('---');
        });
      } else {
        console.log(JSON.stringify(parsed, null, 2));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log(data);
    }
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(JSON.stringify({ limit: 100 }));
req.end();
