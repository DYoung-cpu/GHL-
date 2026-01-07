/**
 * Convert email archive to PDF and upload to GHL contact
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

// Convert HTML content to plain text for PDF
function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Create PDF from email content
async function createEmailPDF(emailDir, outputPath) {
  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Title
  const contactName = path.basename(emailDir).replace(/_/g, ' ');
  doc.fontSize(20).font('Helvetica-Bold').text(`Email Archive: ${contactName}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Get all HTML files
  const files = fs.readdirSync(emailDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .reverse(); // Newest first

  doc.fontSize(12).font('Helvetica-Bold').text(`Total Emails: ${files.length}`);
  doc.moveDown();

  // Add each email
  let count = 0;
  for (const file of files.slice(0, 30)) { // Limit to 30 for PDF size
    count++;
    const filePath = path.join(emailDir, file);
    const html = fs.readFileSync(filePath, 'utf-8');

    // Extract metadata from filename
    const parts = file.replace('.html', '').split('_');
    const date = parts[0] || 'Unknown';
    const topic = parts[1] || 'General';
    const subject = parts.slice(2).join(' ') || 'No Subject';

    // Extract body from HTML
    const bodyMatch = html.match(/<div class="body"[^>]*>([\s\S]*?)<\/div>/);
    let body = bodyMatch ? htmlToText(bodyMatch[1]) : '';
    body = body.substring(0, 1000); // Limit body length

    // Add to PDF
    if (count > 1) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text(`Email #${count}: ${subject.substring(0, 60)}`);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Date: ${date}`);
    doc.text(`Topic: ${topic}`);
    doc.moveDown();

    doc.fontSize(10).font('Helvetica').text(body, {
      width: 500,
      align: 'left'
    });
  }

  if (files.length > 30) {
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold')
      .text(`... and ${files.length - 30} more emails`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica')
      .text('Full archive available in HTML format on your computer.', { align: 'center' });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Upload PDF to GHL media
async function uploadToGHL(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += 'Content-Type: application/pdf\r\n\r\n';

    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="locationId"\r\n\r\n${LOCATION_ID}\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileContent, bodyEnd]);

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: '/medias/upload-file',
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

// Update contact with file URL
async function updateContactWithFile(contactId, fileUrl) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      customFields: [
        { id: 'IDG4ezy2HF8qSSFbCR2s', value: fileUrl }
      ]
    });

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `/contacts/${contactId}`,
      method: 'PUT',
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
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const emailDir = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman';
  const pdfPath = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_Emails.pdf';
  const contactId = '0tUVXbe1ovBoUiUSBkZM';

  console.log('='.repeat(50));
  console.log('  EMAIL ARCHIVE TO PDF + GHL UPLOAD');
  console.log('='.repeat(50));

  // Step 1: Create PDF
  console.log('\n[1] Creating PDF from email archive...');
  await createEmailPDF(emailDir, pdfPath);
  console.log('    PDF created: ' + pdfPath);

  // Step 2: Upload to GHL
  console.log('\n[2] Uploading PDF to GHL Media...');
  const uploadResult = await uploadToGHL(pdfPath, 'Marc_Shenkman_Email_Archive.pdf');
  console.log('    Upload result:', JSON.stringify(uploadResult, null, 2));

  if (uploadResult.url) {
    // Step 3: Link to contact
    console.log('\n[3] Linking file to contact...');
    const updateResult = await updateContactWithFile(contactId, uploadResult.url);
    console.log('    Contact updated');

    console.log('\n' + '='.repeat(50));
    console.log('  COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nFile URL:', uploadResult.url);
    console.log('Contact ID:', contactId);
  } else {
    console.log('\nUpload may have failed. Check the result above.');
  }
}

main().catch(console.error);
