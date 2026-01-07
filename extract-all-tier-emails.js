const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads/Tier-Emails';

// Key tier email positions
const positions = [
  { offset: 4300303723, name: 'Sean_McDonough_Plan_Code_A_Silver_Tier' },
  { offset: 7775483043, name: 'MARGIN_Tier_Plan_Code_A_Explanation' },
  { offset: 7927151377, name: 'Dave_Silver_Tier_Confirmation' },
  { offset: 8317895859, name: 'Add_Her_Silver_Tier_Gerardo' },
  { offset: 8615085990, name: 'Platinum_Bronze_Silver_Gold_Tiers_Discussion' },
  { offset: 9014148039, name: 'Add_Him_Silver_Tier' },
  { offset: 9030972193, name: 'Cedric_Johnson_Bronze_Tier' },
  { offset: 9302941446, name: 'Dave_Segura_Silver_Tier' },
  { offset: 9350460823, name: 'Put_Him_Silver_Tier' },
  { offset: 10676404923, name: 'Brad_Silver_Tier' }
];

const fd = fs.openSync(mboxPath, 'r');
const stats = fs.fstatSync(fd);
console.log('File size:', stats.size);

let emailsExtracted = 0;

for (const pos of positions) {
  console.log(`\nExtracting: ${pos.name} at byte ${pos.offset}`);

  if (pos.offset > stats.size) {
    console.log('  Position exceeds file size, skipping');
    continue;
  }

  // Read 120KB around the position
  const startPos = Math.max(0, pos.offset - 50000);
  const buffer = Buffer.alloc(120000);
  const bytesRead = fs.readSync(fd, buffer, 0, 120000, startPos);

  const content = buffer.toString('utf8');

  // Find email boundaries (look for From line)
  let emailStart = content.lastIndexOf('\nFrom ', 50000);
  if (emailStart === -1) emailStart = 0;
  else emailStart += 1;

  let emailEnd = content.indexOf('\nFrom ', 55000);
  if (emailEnd === -1) emailEnd = content.length;

  const email = content.substring(emailStart, emailEnd);

  // Extract metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const subjectMatch = email.match(/^Subject: (.+?)(\r?\n[^\r\n]|$)/m);

  const date = dateMatch ? dateMatch[1].trim() : 'Unknown Date';
  const from = fromMatch ? fromMatch[1].trim() : 'Unknown';
  const to = toMatch ? toMatch[1].trim() : 'Unknown';
  const subject = subjectMatch ? subjectMatch[1].trim().replace(/\s+/g, ' ') : 'Unknown Subject';

  console.log(`  Subject: ${subject.substring(0, 60)}`);
  console.log(`  Date: ${date}`);
  console.log(`  From: ${from.substring(0, 50)}`);

  // Find text/plain content
  let bodyText = '';
  const plainIdx = email.indexOf('Content-Type: text/plain');
  if (plainIdx !== -1) {
    let textStart = email.indexOf('\n\n', plainIdx);
    let textEnd = email.indexOf('\n--', textStart + 100);
    if (textEnd === -1) textEnd = textStart + 15000;

    bodyText = email.substring(textStart, textEnd);
    // Decode quoted-printable
    bodyText = bodyText.replace(/=\r?\n/g, '');
    bodyText = bodyText.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } else {
    // Try to extract from HTML
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

  // Create HTML file
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .email-container { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
    .header { border-bottom: 2px solid #ff9800; padding-bottom: 15px; margin-bottom: 20px; }
    .subject { font-size: 20px; font-weight: bold; color: #1a1a1a; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; line-height: 1.6; }
    .body { line-height: 1.8; font-size: 15px; white-space: pre-wrap; background: #fff8e1; padding: 20px; border-left: 4px solid #ff9800; margin-top: 20px; }
    .tier-highlight { background: #fff3e0; padding: 2px 5px; font-weight: bold; color: #e65100; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="subject">${subject}</div>
      <div class="meta">
        <strong>Date:</strong> ${date}<br>
        <strong>From:</strong> ${from}<br>
        <strong>To:</strong> ${to.substring(0, 100)}${to.length > 100 ? '...' : ''}
      </div>
    </div>
    <div class="body">${bodyText.substring(0, 8000)}</div>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888;">
      Extracted from Priority Financial mbox archive - Tier Assignment Email
    </div>
  </div>
</body>
</html>`;

  // Generate filename
  const dateStr = date.match(/\d{1,2}\s+\w+\s+\d{4}|\w+,?\s+\d{1,2}[\s,]+\w+\s+\d{4}|\d{4}-\d{2}-\d{2}/);
  const fileDate = dateStr ? dateStr[0].replace(/[,\s]+/g, '-').substring(0, 20) : 'unknown-date';
  const filename = `${fileDate}_${pos.name}.html`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  fs.writeFileSync(`${outputDir}/${filename}`, html);
  console.log(`  Saved: ${filename}`);
  emailsExtracted++;
}

fs.closeSync(fd);
console.log(`\n${'='.repeat(60)}`);
console.log(`COMPLETE: Extracted ${emailsExtracted} tier emails to ${outputDir}`);
