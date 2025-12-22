require('dotenv').config();
const https = require('https');

// Old LENDWISE MORTGAGE account
const OLD_LOCATION_ID = 'e6yMsslzphNw8bgqRgtV';
const OLD_API_KEY = process.env.GHL_API_KEY_LENDWISE;

function apiRequest(path, apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
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
  console.log('SEARCHING LENDWISE MORTGAGE FOR EMAIL SIGNATURE');
  console.log('='.repeat(60));
  console.log('Location ID:', OLD_LOCATION_ID);
  console.log('');

  // Get all snippets/templates
  console.log('\n--- ALL SNIPPETS ---');
  const snippets = await apiRequest(`/locations/${OLD_LOCATION_ID}/templates/snippets`, OLD_API_KEY);

  if (snippets.status === 200 && snippets.data.snippets) {
    console.log(`Found ${snippets.data.snippets.length} snippets:\n`);

    snippets.data.snippets.forEach((s, i) => {
      console.log(`${i+1}. ${s.name}`);
      console.log(`   Type: ${s.type}`);

      // Check if this looks like an email signature
      const isSignature = s.name.toLowerCase().includes('signature') ||
                         s.name.toLowerCase().includes('sign') ||
                         (s.body && s.body.includes('David')) ||
                         (s.body && s.body.includes('LENDWISE'));

      if (isSignature) {
        console.log('   *** POSSIBLE EMAIL SIGNATURE ***');
        console.log('   Body preview:', (s.body || '').substring(0, 300));
      }
      console.log('');
    });

    // Also check for any snippet containing HTML
    console.log('\n--- SNIPPETS WITH HTML ---');
    const htmlSnippets = snippets.data.snippets.filter(s =>
      s.body && (s.body.includes('<') || s.body.includes('html'))
    );

    if (htmlSnippets.length > 0) {
      htmlSnippets.forEach(s => {
        console.log(`\nName: ${s.name}`);
        console.log('Full Body:');
        console.log(s.body);
        console.log('-'.repeat(40));
      });
    } else {
      console.log('No HTML snippets found');
    }

  } else {
    console.log('Error fetching snippets:', snippets.status);
    console.log(snippets.data);
  }

  // Also check custom values
  console.log('\n--- CUSTOM VALUES ---');
  const cvResult = await apiRequest(`/locations/${OLD_LOCATION_ID}/customValues`, OLD_API_KEY);

  if (cvResult.status === 200 && cvResult.data.customValues) {
    console.log(`Found ${cvResult.data.customValues.length} custom values:`);
    cvResult.data.customValues.forEach(cv => {
      console.log(`\n- ${cv.name}:`);
      console.log(`  ${cv.value}`);
    });
  }
}

main();
