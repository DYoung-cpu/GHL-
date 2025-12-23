/**
 * Create a TEXT custom field to hold the Email Index PDF link
 * Then update Marc's contact with the clickable URL
 */

const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const CONTACT_ID = '0tUVXbe1ovBoUiUSBkZM';

// Index PDF URL
const INDEX_URL = 'https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/6762adce-23d6-4af3-bbf2-7fd706378016.pdf';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SETUP EMAIL INDEX LINK ON CONTACT');
  console.log('='.repeat(60));

  // Step 1: Check existing custom fields
  console.log('\n[1] Checking existing custom fields...');
  const fieldsResult = await apiRequest('GET', `/locations/${LOCATION_ID}/customFields`);

  const emailLinkField = fieldsResult.data.customFields?.find(f => f.name === 'Email Index Link');
  let fieldId = emailLinkField?.id;

  if (!fieldId) {
    // Create the field
    console.log('\n[2] Creating "Email Index Link" custom field...');
    const createResult = await apiRequest('POST', `/locations/${LOCATION_ID}/customFields`, {
      name: 'Email Index Link',
      dataType: 'TEXT',
      model: 'contact',
      placeholder: 'Click to view email archive'
    });

    if (createResult.status === 200 || createResult.status === 201) {
      fieldId = createResult.data.customField?.id;
      console.log('    Created field:', fieldId);
    } else {
      console.log('    Create result:', JSON.stringify(createResult.data, null, 2));
    }
  } else {
    console.log('    Field already exists:', fieldId);
  }

  if (fieldId) {
    // Step 3: Update contact with the link
    console.log('\n[3] Updating Marc Shenkman contact with index link...');
    const updateResult = await apiRequest('PUT', `/contacts/${CONTACT_ID}`, {
      customFields: [
        { id: fieldId, value: INDEX_URL }
      ]
    });

    if (updateResult.status === 200) {
      console.log('    Contact updated successfully!');
    } else {
      console.log('    Update result:', JSON.stringify(updateResult.data, null, 2));
    }
  }

  // Also add the URL to notes for easy access
  console.log('\n[4] Adding note with clickable link...');
  const noteResult = await apiRequest('POST', `/contacts/${CONTACT_ID}/notes`, {
    body: `📧 EMAIL ARCHIVE INDEX\n\nClick to view all email correspondence with Marc Shenkman:\n${INDEX_URL}\n\n(25 emails archived, organized by topic)`
  });

  if (noteResult.status === 200 || noteResult.status === 201) {
    console.log('    Note added with archive link!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('  COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nTo access the email archive:');
  console.log('  1. Go to Marc Shenkman\'s contact in GHL');
  console.log('  2. Look for "Email Index Link" custom field');
  console.log('  3. Or check the Notes section');
  console.log('  4. Click the URL to open the index with all email links\n');
  console.log('Direct URL:', INDEX_URL);
}

main().catch(console.error);
