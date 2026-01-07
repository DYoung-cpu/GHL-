const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads/Tier-Emails';

// Key positions where Marc is CC'd on override/tier discussions
const positions = [
  { offset: 33808865, name: 'Brenda_Overrides_Marc_CC' },
  { offset: 22143777, name: 'Employment_Discussion_Marc_CC' },
  { offset: 63408231, name: 'PFN_Marketing_Tier_Marc_CC' },
  { offset: 103529974, name: 'HELOC_Tier_Marc_CC' }
];

const fd = fs.openSync(mboxPath, 'r');

for (const pos of positions) {
  console.log(`\nExtracting: ${pos.name}`);

  const startPos = Math.max(0, pos.offset - 50000);
  const buffer = Buffer.alloc(120000);
  fs.readSync(fd, buffer, 0, 120000, startPos);
  const content = buffer.toString('utf8');

  // Find email boundaries
  let emailStart = content.lastIndexOf('\nFrom ', 50000);
  if (emailStart === -1) emailStart = 0;
  else emailStart += 1;

  let emailEnd = content.indexOf('\nFrom ', 55000);
  if (emailEnd === -1) emailEnd = content.length;

  const email = content.substring(emailStart, emailEnd);

  // Metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const ccMatch = email.match(/^Cc: (.+)$/m);
  const subjectMatch = email.match(/^Subject: (.+?)(\r?\n[^\r\n]|$)/m);

  const date = dateMatch ? dateMatch[1].trim() : 'Unknown';
  const from = fromMatch ? fromMatch[1].trim() : 'Unknown';
  const to = toMatch ? toMatch[1].trim() : 'Unknown';
  const cc = ccMatch ? ccMatch[1].trim() : 'Unknown';
  const subject = subjectMatch ? subjectMatch[1].trim().replace(/\s+/g, ' ') : 'Unknown';

  console.log(`  Subject: ${subject.substring(0, 60)}`);
  console.log(`  Date: ${date}`);
  console.log(`  CC: ${cc.substring(0, 60)}`);

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

  // Create HTML file
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject} - MARC SHENKMAN CC'd</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .email-container { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
    .header { border-bottom: 2px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; }
    .subject { font-size: 20px; font-weight: bold; color: #1a1a1a; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; line-height: 1.6; }
    .cc-highlight { background: #ffebee; padding: 10px; border: 2px solid #d32f2f; border-radius: 5px; margin-top: 10px; }
    .cc-highlight strong { color: #d32f2f; }
    .body { line-height: 1.8; font-size: 15px; white-space: pre-wrap; background: #fafafa; padding: 20px; border-left: 4px solid #d32f2f; margin-top: 20px; }
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
      <div class="cc-highlight">
        <strong>CC: MARC SHENKMAN</strong><br>
        ${cc}
      </div>
    </div>
    <div class="body">${bodyText.substring(0, 10000)}</div>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888;">
      <strong>KEY EVIDENCE:</strong> Marc Shenkman was CC'd on this tier/override related email
    </div>
  </div>
</body>
</html>`;

  const dateStr = date.match(/\d{1,2}\s+\w+\s+\d{4}|\w+,?\s+\d{1,2}[\s,]+\w+\s+\d{4}/);
  const fileDate = dateStr ? dateStr[0].replace(/[,\s]+/g, '-').substring(0, 20) : 'unknown';
  const filename = `MARC_CC_${fileDate}_${pos.name}.html`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  fs.writeFileSync(`${outputDir}/${filename}`, html);
  console.log(`  Saved: ${filename}`);
}

fs.closeSync(fd);
console.log('\nDone!');
