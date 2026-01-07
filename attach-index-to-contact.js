/**
 * Upload Email Index PDF directly to contact's FILE_UPLOAD custom field
 * Uses the proper GHL contact file upload endpoint
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const CONTACT_ID = '0tUVXbe1ovBoUiUSBkZM';
const CUSTOM_FIELD_ID = 'IDG4ezy2HF8qSSFbCR2s';

async function uploadFileToContactField(contactId, fieldId, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    let bodyParts = [];

    // File part
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="${fieldId}"; filename="${fileName}"\r\n`);
    bodyParts.push('Content-Type: application/pdf\r\n\r\n');

    const bodyStart = Buffer.from(bodyParts.join(''), 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileContent, bodyEnd]);

    // Try the contacts update endpoint with file upload
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/contacts/${contactId}`,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    };

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

// Alternative: Use form-data with the dedicated file upload endpoint
async function uploadViaFormsEndpoint(contactId, fieldId, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="locationId"\r\n\r\n${LOCATION_ID}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="contactId"\r\n\r\n${contactId}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="customFieldId"\r\n\r\n${fieldId}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += 'Content-Type: application/pdf\r\n\r\n';

    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileContent, bodyEnd]);

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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Forms endpoint status:', res.statusCode);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  const indexPath = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_Email_Index.pdf';

  console.log('='.repeat(60));
  console.log('  ATTACH INDEX PDF TO CONTACT FILE FIELD');
  console.log('='.repeat(60));

  // Try the forms upload endpoint
  console.log('\nUploading via forms/upload-custom-files endpoint...');
  const result = await uploadViaFormsEndpoint(
    CONTACT_ID,
    CUSTOM_FIELD_ID,
    indexPath,
    'Marc_Shenkman_Email_Archive_Index.pdf'
  );

  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
