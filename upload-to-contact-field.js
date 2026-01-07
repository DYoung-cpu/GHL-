/**
 * Upload file directly to contact's FILE_UPLOAD custom field
 */

const fs = require('fs');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const CONTACT_ID = '0tUVXbe1ovBoUiUSBkZM';
const CUSTOM_FIELD_KEY = 'contact.email_archive';

async function uploadFileToContact(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15);

    // Build multipart body properly
    const parts = [];

    // Location ID
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="locationId"\r\n\r\n${LOCATION_ID}\r\n`));

    // Contact ID
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="contactId"\r\n\r\n${CONTACT_ID}\r\n`));

    // File
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`));
    parts.push(fileContent);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBody = Buffer.concat(parts);

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: '/forms/upload-custom-files',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    };

    console.log('Sending to:', options.path);
    console.log('Body length:', fullBody.length);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

// Alternative: Just update the contact with the existing media URL
async function updateContactWithMediaUrl(mediaUrl) {
  return new Promise((resolve, reject) => {
    // For FILE_UPLOAD fields, we need to provide the URL in the custom fields array
    const body = JSON.stringify({
      customFields: [
        {
          id: 'IDG4ezy2HF8qSSFbCR2s',
          field_value: mediaUrl
        }
      ]
    });

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/contacts/${CONTACT_ID}`,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Update status:', res.statusCode);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  ATTACH EMAIL INDEX TO CONTACT');
  console.log('='.repeat(60));

  // The index PDF URL we already uploaded
  const indexUrl = 'https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/6762adce-23d6-4af3-bbf2-7fd706378016.pdf';

  console.log('\nMethod 1: Try forms upload endpoint...');
  const result1 = await uploadFileToContact(
    '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_Email_Index.pdf',
    'Marc_Shenkman_Email_Index.pdf'
  );
  console.log('Result:', JSON.stringify(result1, null, 2));

  console.log('\nMethod 2: Update contact with media URL...');
  const result2 = await updateContactWithMediaUrl(indexUrl);
  console.log('Result:', JSON.stringify(result2, null, 2));
}

main().catch(console.error);
