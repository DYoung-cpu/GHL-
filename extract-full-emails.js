const fs = require('fs');

const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads/Override-Emails';

// Read chunk of mbox
const fd = fs.openSync(mboxPath, 'r');
const stats = fs.fstatSync(fd);
const chunkSize = 500 * 1024 * 1024; // 500MB
const buffer = Buffer.alloc(chunkSize);
fs.readSync(fd, buffer, 0, chunkSize, 0);
fs.closeSync(fd);

const content = buffer.toString('utf8');

// Search terms and extract
const emailsToFind = [
  { term: 'Follow-up on Our Discussion Regarding My Employment', date: '2025-09-30' },
  { term: 'Re: Follow-up on Our Discussion Regarding My Employment', date: '2025-10-02' }
];

for (const email of emailsToFind) {
  const idx = content.indexOf(email.term);
  if (idx === -1) {
    console.log(`NOT FOUND: ${email.term}`);
    continue;
  }

  // Find email boundaries
  let start = content.lastIndexOf('\nFrom ', idx - 80000);
  if (start === -1) start = Math.max(0, idx - 80000);
  else start += 1;

  let end = content.indexOf('\nFrom ', idx + 1000);
  if (end === -1) end = Math.min(idx + 80000, content.length);

  const emailContent = content.substring(start, end);

  // Extract metadata
  const dateMatch = emailContent.match(/^Date: (.+)$/m);
  const fromMatch = emailContent.match(/^From: (.+)$/m);
  const toMatch = emailContent.match(/^To: (.+)$/m);

  // Find text/plain content
  const plainIdx = emailContent.indexOf('Content-Type: text/plain');
  let bodyText = '';

  if (plainIdx !== -1) {
    let textStart = emailContent.indexOf('\n\n', plainIdx);
    let textEnd = emailContent.indexOf('\n--', textStart + 100);
    if (textEnd === -1) textEnd = textStart + 10000;

    bodyText = emailContent.substring(textStart, textEnd);
    // Decode quoted-printable
    bodyText = bodyText.replace(/=\r?\n/g, '');
    bodyText = bodyText.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    // Clean up
    bodyText = bodyText.replace(/<[^>]+>/g, ' ');
    bodyText = bodyText.replace(/\s+/g, ' ').trim();
  }

  console.log('\n' + '='.repeat(70));
  console.log('FOUND:', email.term);
  console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
  console.log('From:', fromMatch ? fromMatch[1] : 'Unknown');
  console.log('To:', toMatch ? toMatch[1] : 'Unknown');
  console.log('-'.repeat(70));
  console.log(bodyText.substring(0, 2500));
  console.log('='.repeat(70));
}
