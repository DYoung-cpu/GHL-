require('dotenv').config();
const https = require('https');

const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_KEY = process.env.GHL_API_KEY;

// David Young's info for LENDWISE MORTGAGE
const customValues = [
  { name: 'company_name', value: 'LENDWISE MORTGAGE' },
  { name: 'loan_officer_name', value: 'David Young' },
  { name: 'loan_officer_first_name', value: 'David' },
  { name: 'loan_officer_last_name', value: 'Young' },
  { name: 'loan_officer_email', value: 'david@lendwisemtg.com' },
  { name: 'loan_officer_phone', value: '(310) 954-7772' },
  { name: 'loan_officer_nmls', value: '285395' }, // Placeholder - update with real NMLS
  { name: 'company_nmls', value: '1984419' }, // Placeholder - update with real Company NMLS
  { name: 'company_address', value: '21800 Oxnard St #220, Woodland Hills, CA 91367' },
  { name: 'company_website', value: 'https://www.lendwisemtg.com' },
  { name: 'calendar_link', value: 'https://www.lendwisemtg.com/calendar' }, // Placeholder
  { name: 'email_signature', value: `David Young
Loan Officer | LENDWISE MORTGAGE
Phone: (310) 954-7772
NMLS# 285395
www.lendwisemtg.com` },
];

function createCustomValue(cv) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: cv.name,
      value: cv.value
    });

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/locations/${LOCATION_ID}/customValues`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Created: ${cv.name}`);
        } else {
          console.log(`❌ Failed: ${cv.name} - ${res.statusCode}`);
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) console.log(`   ${parsed.message}`);
          } catch {}
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ Error: ${cv.name} - ${e.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(50));
  console.log('CREATING CUSTOM VALUES FOR DAVID YOUNG');
  console.log('='.repeat(50));
  console.log('Location:', LOCATION_ID);
  console.log('');

  for (const cv of customValues) {
    await createCustomValue(cv);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '='.repeat(50));
  console.log('DONE! Custom values created.');
  console.log('');
  console.log('These can be used in templates as:');
  console.log('  {{custom_values.company_name}}');
  console.log('  {{custom_values.loan_officer_name}}');
  console.log('  {{custom_values.loan_officer_phone}}');
  console.log('  etc.');
  console.log('='.repeat(50));
}

main();
