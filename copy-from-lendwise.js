require('dotenv').config();
const https = require('https');

// Old LENDWISE MORTGAGE account
const OLD_LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const OLD_API_KEY = process.env.GHL_API_KEY_LENDWISE;

// New Mission Control account
const NEW_LOCATION_ID = process.env.GHL_LOCATION_ID;
const NEW_API_KEY = process.env.GHL_API_KEY;

function apiRequest(path, apiKey, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('COPYING DATA FROM LENDWISE MORTGAGE TO MISSION CONTROL');
  console.log('='.repeat(60));

  // Get Custom Values from old account
  console.log('\n--- FETCHING FROM LENDWISE MORTGAGE ---');
  const oldCV = await apiRequest(`/locations/${OLD_LOCATION_ID}/customValues`, OLD_API_KEY);

  if (oldCV.status === 200 && oldCV.data.customValues) {
    console.log(`Found ${oldCV.data.customValues.length} custom values in old account:`);
    oldCV.data.customValues.forEach(cv => {
      console.log(`  - ${cv.name}: "${(cv.value || '').substring(0, 50)}..."`);
    });

    // Look for email signature specifically
    const emailSig = oldCV.data.customValues.find(cv =>
      cv.name.toLowerCase().includes('signature') ||
      cv.name.toLowerCase().includes('email_sig')
    );

    if (emailSig) {
      console.log('\n--- FOUND EMAIL SIGNATURE ---');
      console.log(emailSig.value);
    }
  } else {
    console.log('Could not fetch from old account:', oldCV.status);
    console.log(oldCV.data);
  }

  // Also get snippets (email templates)
  console.log('\n--- FETCHING SNIPPETS FROM LENDWISE MORTGAGE ---');
  const snippets = await apiRequest(`/locations/${OLD_LOCATION_ID}/templates/snippets`, OLD_API_KEY);

  if (snippets.status === 200 && snippets.data.snippets) {
    console.log(`Found ${snippets.data.snippets.length} snippets in old account`);

    // Find email signature snippet
    const sigSnippet = snippets.data.snippets.find(s =>
      s.name.toLowerCase().includes('signature')
    );

    if (sigSnippet) {
      console.log('\n--- FOUND SIGNATURE SNIPPET ---');
      console.log('Name:', sigSnippet.name);
      console.log('Content:', sigSnippet.body?.substring(0, 200));
    }

    // List first 10 snippets
    console.log('\nFirst 10 snippets:');
    snippets.data.snippets.slice(0, 10).forEach(s => {
      console.log(`  - ${s.name} (${s.type})`);
    });
  }
}

main();
