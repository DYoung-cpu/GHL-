/**
 * Create Master Email Index PDF with clickable links
 * Attaches to contact's FILE_UPLOAD custom field
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const CONTACT_ID = '0tUVXbe1ovBoUiUSBkZM';
const CUSTOM_FIELD_ID = 'IDG4ezy2HF8qSSFbCR2s';

// Load the uploaded manifest
const manifestPath = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_PDFs/upload-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Group emails by topic
function groupByTopic(emails) {
  const groups = {};
  for (const email of emails) {
    const parts = email.name.split('_');
    const topic = parts[1] || 'General';
    if (!groups[topic]) groups[topic] = [];
    groups[topic].push(email);
  }
  return groups;
}

// Create the master index PDF
async function createIndexPDF(outputPath) {
  const doc = new PDFDocument({
    margin: 50,
    size: 'LETTER',
    info: {
      Title: 'Marc Shenkman Email Archive',
      Author: 'LENDWISE MORTGAGE',
      Subject: 'Email correspondence with Marc Shenkman'
    }
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Header
  doc.rect(0, 0, 612, 100).fill('#1565c0');
  doc.fillColor('white')
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('EMAIL ARCHIVE', 50, 30, { align: 'center', width: 512 });
  doc.fontSize(16)
     .font('Helvetica')
     .text('Marc Shenkman', 50, 65, { align: 'center', width: 512 });

  // Stats bar
  doc.rect(0, 100, 612, 40).fill('#e3f2fd');
  doc.fillColor('#1565c0')
     .fontSize(11)
     .text(`${manifest.length} Emails  |  Click any link to open  |  Generated: ${new Date().toLocaleDateString()}`, 50, 115, { align: 'center', width: 512 });

  doc.y = 160;

  // Group by topic
  const grouped = groupByTopic(manifest);
  const topics = Object.keys(grouped).sort();

  // Table of Contents
  doc.fillColor('#333')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('TOPICS', 50, doc.y);
  doc.moveDown(0.5);

  for (const topic of topics) {
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#1565c0')
       .text(`• ${topic} (${grouped[topic].length} emails)`, 60, doc.y);
    doc.moveDown(0.3);
  }

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#ddd');
  doc.moveDown(1);

  // Email listings by topic
  for (const topic of topics) {
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    // Topic header
    doc.fillColor('#1565c0')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(topic.toUpperCase(), 50, doc.y);
    doc.moveDown(0.5);

    // Emails in this topic
    for (const email of grouped[topic]) {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      const parts = email.name.split('_');
      const date = parts[0] || '';
      const subject = parts.slice(2).join(' ').replace(/-/g, ' ') || 'No Subject';

      // Date
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666')
         .text(date, 60, doc.y, { continued: true });

      // Subject as clickable link
      doc.fillColor('#1976d2')
         .text('  ' + subject.substring(0, 70), {
           link: email.url,
           underline: true
         });

      doc.moveDown(0.3);
    }

    doc.moveDown(0.8);
  }

  // Footer on last page
  doc.moveDown(2);
  doc.fontSize(9)
     .fillColor('#888')
     .font('Helvetica')
     .text('Priority Financial Network Correspondence Archive', 50, doc.y, { align: 'center', width: 512 });
  doc.text('Confidential - For Internal Use Only', { align: 'center', width: 512 });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Upload PDF to GHL Media Storage
async function uploadPDF(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    let bodyParts = [];
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
    bodyParts.push('Content-Type: application/pdf\r\n\r\n');

    const bodyStart = Buffer.from(bodyParts.join(''), 'utf-8');
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

// Update contact with the index PDF URL
async function updateContactCustomField(contactId, fileUrl) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      customFields: [
        { id: CUSTOM_FIELD_ID, value: fileUrl }
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
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
  console.log('  EMAIL INDEX PDF → CONTACT ATTACHMENT');
  console.log('='.repeat(60));

  const indexPath = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_Email_Index.pdf';

  // Step 1: Create index PDF
  console.log('\n[1] Creating master index PDF with clickable links...');
  await createIndexPDF(indexPath);
  console.log('    Created:', indexPath);

  // Step 2: Upload to GHL
  console.log('\n[2] Uploading index PDF to GHL Media Storage...');
  const uploadResult = await uploadPDF(indexPath, 'Marc_Shenkman_Email_Index.pdf');

  if (uploadResult.url) {
    console.log('    Uploaded successfully!');
    console.log('    URL:', uploadResult.url);

    // Step 3: Attach to contact
    console.log('\n[3] Attaching to Marc Shenkman contact...');
    const updateResult = await updateContactCustomField(CONTACT_ID, uploadResult.url);

    if (updateResult.contact || updateResult.id) {
      console.log('    Contact updated successfully!');
    } else {
      console.log('    Update result:', JSON.stringify(updateResult, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('  COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nThe Email Archive is now attached to Marc Shenkman\'s contact.');
    console.log('\nHow to access:');
    console.log('  1. Go to Marc Shenkman\'s contact in GHL');
    console.log('  2. Look for "Email Archive" custom field');
    console.log('  3. Click to open the master index');
    console.log('  4. Click any email link to open that specific email\n');
    console.log('Index PDF URL:', uploadResult.url);
  } else {
    console.log('    Upload failed:', JSON.stringify(uploadResult, null, 2));
  }
}

main().catch(console.error);
