/**
 * Create individual PDFs for each email and upload to GHL Media Storage
 * Creates a repository of clickable email PDFs
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

// Convert HTML to plain text
function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Create single email PDF
async function createSingleEmailPDF(htmlPath, pdfPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Extract metadata
  const subjectMatch = html.match(/<title>([^<]+)<\/title>/);
  const subject = subjectMatch ? subjectMatch[1] : 'Email';

  const dateMatch = html.match(/<strong>Date:<\/strong>\s*([^<]+)/);
  const date = dateMatch ? dateMatch[1].trim() : 'Unknown Date';

  const fromMatch = html.match(/<strong>From:<\/strong>\s*([^<]+)/);
  const from = fromMatch ? fromMatch[1].trim() : 'Unknown';

  const toMatch = html.match(/<strong>To:<\/strong>\s*([^<]+)/);
  const to = toMatch ? toMatch[1].trim() : 'Unknown';

  const bodyMatch = html.match(/<div class="body"[^>]*>([\s\S]*?)<\/div>/);
  const body = bodyMatch ? htmlToText(bodyMatch[1]) : '';

  const directionMatch = html.match(/class="direction\s+(\w+)"/);
  const direction = directionMatch && directionMatch[1] === 'outbound' ? '📤 SENT' : '📥 RECEIVED';

  // Create PDF
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Header bar
  doc.rect(0, 0, 612, 80).fill('#1976d2');
  doc.fillColor('white').fontSize(10).text(direction, 50, 20);
  doc.fontSize(16).font('Helvetica-Bold').text(subject.substring(0, 70), 50, 40, { width: 500 });

  // Metadata
  doc.fillColor('#333').fontSize(10).font('Helvetica');
  doc.text(`Date: ${date}`, 50, 100);
  doc.text(`From: ${from}`, 50, 115);
  doc.text(`To: ${to}`, 50, 130);

  // Divider
  doc.moveTo(50, 150).lineTo(562, 150).stroke('#ddd');

  // Body
  doc.moveDown(2);
  doc.fontSize(11).font('Helvetica').fillColor('#333');
  doc.text(body, 50, 165, {
    width: 512,
    align: 'left',
    lineGap: 4
  });

  // Footer
  doc.fontSize(8).fillColor('#888');
  doc.text('Email Archive - Priority Financial Correspondence', 50, 720, { align: 'center', width: 512 });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Upload PDF to GHL
async function uploadPDFToGHL(filePath, fileName) {
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

async function main() {
  const emailDir = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman';
  const pdfDir = '/mnt/c/Users/dyoun/ghl-automation/email-archive/Marc_Shenkman_PDFs';
  const contactName = 'Marc_Shenkman';

  console.log('='.repeat(60));
  console.log('  INDIVIDUAL EMAIL PDFs → GHL MEDIA STORAGE');
  console.log('='.repeat(60));

  // Create PDF directory
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Get HTML files
  const htmlFiles = fs.readdirSync(emailDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .reverse()
    .slice(0, 25); // Limit to 25 for demo

  console.log(`\nFound ${htmlFiles.length} emails to process\n`);

  const uploadedFiles = [];
  let count = 0;

  for (const htmlFile of htmlFiles) {
    count++;
    const htmlPath = path.join(emailDir, htmlFile);
    const pdfFileName = htmlFile.replace('.html', '.pdf');
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Create PDF
    process.stdout.write(`[${count}/${htmlFiles.length}] Creating PDF: ${pdfFileName.substring(0, 50)}...`);
    await createSingleEmailPDF(htmlPath, pdfPath);

    // Upload to GHL
    const ghlFileName = `${contactName}_${pdfFileName}`;
    const result = await uploadPDFToGHL(pdfPath, ghlFileName);

    if (result.url) {
      console.log(' ✓ Uploaded');
      uploadedFiles.push({
        name: htmlFile.replace('.html', ''),
        url: result.url,
        fileId: result.fileId
      });
    } else {
      console.log(' ✗ Failed');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  // Save results
  fs.writeFileSync(
    path.join(pdfDir, 'upload-manifest.json'),
    JSON.stringify(uploadedFiles, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('  COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nUploaded ${uploadedFiles.length} individual PDFs to GHL Media Storage`);
  console.log('\nTo view in GHL:');
  console.log('  1. Go to Media Storage in GHL');
  console.log('  2. Look for files named "Marc_Shenkman_*.pdf"');
  console.log('  3. Each email is its own clickable PDF\n');

  // Show some sample URLs
  console.log('Sample files:');
  uploadedFiles.slice(0, 5).forEach(f => {
    console.log(`  📄 ${f.name.substring(0, 50)}`);
    console.log(`     ${f.url}\n`);
  });
}

main().catch(console.error);
