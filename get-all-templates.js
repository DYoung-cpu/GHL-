require('dotenv').config();
const https = require('https');
const fs = require('fs');

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
  console.log('ALL TEMPLATES FROM LENDWISE MORTGAGE');
  console.log('='.repeat(60));

  const result = await apiRequest(`/locations/${LOCATION_ID}/templates`);

  if (result.status === 200 && result.data.templates) {
    console.log(`Found ${result.data.templates.length} templates:\n`);

    // List all templates
    result.data.templates.forEach((t, i) => {
      console.log(`${i+1}. "${t.name}" (${t.type})`);

      // Check for signature
      const lowerName = t.name.toLowerCase();
      if (lowerName.includes('signature') || lowerName.includes('sign')) {
        console.log('   *** SIGNATURE FOUND ***');
        console.log('   ID:', t.id);
        if (t.template?.html) {
          console.log('   HTML Length:', t.template.html.length);
          console.log('\n--- FULL HTML ---\n');
          console.log(t.template.html);
          console.log('\n--- END HTML ---\n');

          // Save to file
          fs.writeFileSync('david-signature.html', t.template.html);
          console.log('   Saved to: david-signature.html');
        }
        if (t.template?.body) {
          console.log('   Body:', t.template.body);
        }
      }
    });

    // Also save all templates as JSON for reference
    fs.writeFileSync('lendwise-all-templates.json', JSON.stringify(result.data.templates, null, 2));
    console.log('\nAll templates saved to: lendwise-all-templates.json');

  } else {
    console.log('Error:', result.status);
    console.log(result.data);
  }
}

main();
