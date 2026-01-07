const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads';

// Position for Priority Pricing / Margin emails
const offset = 8160084540;

const fd = fs.openSync(mboxPath, 'r');

console.log('Extracting Priority Pricing / Margin emails...');

// Read 300KB around position to get full thread
const startPos = Math.max(0, offset - 100000);
const buffer = Buffer.alloc(400000);
fs.readSync(fd, buffer, 0, 400000, startPos);
const content = buffer.toString('utf8');

// Find all "Priority Pricing / Margin" subjects in this chunk
const regex = /Subject: Re: Priority Pricing \/ Margin/g;
let match;
let emailCount = 0;
const processedDates = new Set();

while ((match = regex.exec(content)) !== null) {
  const subjectIdx = match.index;

  // Find email start
  let emailStart = content.lastIndexOf('\nFrom ', subjectIdx);
  if (emailStart === -1) emailStart = Math.max(0, subjectIdx - 5000);
  else emailStart += 1;

  // Find email end
  let emailEnd = content.indexOf('\nFrom ', subjectIdx + 100);
  if (emailEnd === -1) emailEnd = Math.min(subjectIdx + 50000, content.length);

  const email = content.substring(emailStart, emailEnd);

  // Metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const ccMatch = email.match(/^Cc: (.+)$/m);

  const date = dateMatch ? dateMatch[1].trim() : 'Unknown';

  // Skip if already processed this date
  if (processedDates.has(date)) continue;
  processedDates.add(date);

  const from = fromMatch ? fromMatch[1].trim() : 'Unknown';
  const to = toMatch ? toMatch[1].trim() : 'Unknown';
  const cc = ccMatch ? ccMatch[1].trim() : '';

  console.log(`\n${'='.repeat(70)}`);
  console.log('Subject: Re: Priority Pricing / Margin');
  console.log('Date:', date);
  console.log('From:', from);
  console.log('To:', to.substring(0, 60));
  if (cc) console.log('CC:', cc.substring(0, 60));

  // Find text/plain content
  let bodyText = '';
  const plainIdx = email.indexOf('Content-Type: text/plain');
  if (plainIdx !== -1) {
    let textStart = email.indexOf('\n\n', plainIdx);
    let textEnd = email.indexOf('\n--', textStart + 100);
    if (textEnd === -1) textEnd = textStart + 15000;

    bodyText = email.substring(textStart, textEnd);
    bodyText = bodyText.replace(/=\r?\n/g, '');
    bodyText = bodyText.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } else {
    const htmlIdx = email.indexOf('Content-Type: text/html');
    if (htmlIdx !== -1) {
      let htmlStart = email.indexOf('\n\n', htmlIdx);
      let htmlEnd = email.indexOf('\n--', htmlStart + 100);
      if (htmlEnd === -1) htmlEnd = htmlStart + 20000;

      bodyText = email.substring(htmlStart, htmlEnd);
      bodyText = bodyText.replace(/=\r?\n/g, '');
      bodyText = bodyText.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      bodyText = bodyText.replace(/<[^>]+>/g, ' ');
      bodyText = bodyText.replace(/&nbsp;/g, ' ');
      bodyText = bodyText.replace(/\s+/g, ' ').trim();
    }
  }

  console.log('-'.repeat(70));
  console.log(bodyText.substring(0, 1500));

  // Save to file
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Re: Priority Pricing / Margin - Marc Shenkman Included</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .email-container { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
    .header { border-bottom: 2px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; }
    .subject { font-size: 20px; font-weight: bold; color: #d32f2f; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; line-height: 1.6; }
    .marc-highlight { background: #ffebee; padding: 10px; border: 2px solid #d32f2f; border-radius: 5px; margin-top: 10px; }
    .body { line-height: 1.8; font-size: 15px; white-space: pre-wrap; background: #fff8e1; padding: 20px; border-left: 4px solid #ff9800; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="subject">Re: Priority Pricing / Margin</div>
      <div class="meta">
        <strong>Date:</strong> ${date}<br>
        <strong>From:</strong> ${from}<br>
        <strong>To:</strong> ${to}
      </div>
      <div class="marc-highlight">
        <strong>MARC SHENKMAN INCLUDED IN THIS EMAIL THREAD</strong><br>
        CC: ${cc || 'Marc Shenkman in To/thread'}
      </div>
    </div>
    <div class="body">${bodyText.substring(0, 15000)}</div>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888;">
      KEY EVIDENCE: Priority Pricing / Margin discussion with Marc Shenkman
    </div>
  </div>
</body>
</html>`;

  const dateStr = date.match(/\d{1,2}\s+\w+\s+\d{4}|\w+,?\s+\d{1,2}[\s,]+\w+\s+\d{4}/);
  const fileDate = dateStr ? dateStr[0].replace(/[,\s]+/g, '-').substring(0, 20) : `email-${emailCount}`;
  const filename = `PRIORITY_PRICING_MARGIN_${fileDate}.html`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  fs.writeFileSync(`${outputDir}/${filename}`, html);
  console.log(`\nSaved: ${filename}`);
  emailCount++;

  if (emailCount >= 5) break; // Limit to 5 unique emails
}

fs.closeSync(fd);
console.log(`\n${'='.repeat(70)}`);
console.log(`COMPLETE: Extracted ${emailCount} Priority Pricing / Margin emails`);
