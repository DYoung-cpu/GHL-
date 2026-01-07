const fs = require('fs');

const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Byte positions from grep
const positions = [
  { offset: 22176444, name: 'Original' },  // Follow-up on Our Discussion
  { offset: 21850118, name: 'Reply 1' },   // Re: Follow-up
  { offset: 22028558, name: 'Reply 2' },
  { offset: 22143608, name: 'Reply 3' }
];

const fd = fs.openSync(mboxPath, 'r');

for (const pos of positions) {
  // Read 100KB starting 50KB before the position
  const startPos = Math.max(0, pos.offset - 50000);
  const buffer = Buffer.alloc(150000);
  fs.readSync(fd, buffer, 0, 150000, startPos);

  const content = buffer.toString('utf8');

  // Find the actual email start (From line)
  const subjectIdx = content.indexOf('Follow-up on Our Discussion');
  let emailStart = content.lastIndexOf('\nFrom ', subjectIdx);
  if (emailStart === -1) emailStart = 0;
  else emailStart += 1;

  let emailEnd = content.indexOf('\nFrom ', subjectIdx + 100);
  if (emailEnd === -1) emailEnd = content.length;

  const email = content.substring(emailStart, emailEnd);

  // Extract metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const subjectMatch = email.match(/^Subject: (.+)$/m);

  // Find text/plain body
  const plainIdx = email.indexOf('Content-Type: text/plain');
  let body = '';

  if (plainIdx !== -1) {
    let textStart = email.indexOf('\n\n', plainIdx);
    let textEnd = email.indexOf('\n--', textStart + 100);
    if (textEnd === -1) textEnd = textStart + 20000;

    body = email.substring(textStart, textEnd);
    // Decode quoted-printable
    body = body.replace(/=\r?\n/g, '');
    body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    // Remove HTML tags
    body = body.replace(/<[^>]+>/g, ' ');
    body = body.replace(/\s+/g, ' ').trim();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Position: ${pos.name} (byte ${pos.offset})`);
  console.log('Subject:', subjectMatch ? subjectMatch[1] : 'Unknown');
  console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
  console.log('From:', fromMatch ? fromMatch[1] : 'Unknown');
  console.log('To:', toMatch ? toMatch[1] : 'Unknown');
  console.log('-'.repeat(80));

  // Show body (limit to 2000 chars)
  if (body.length > 0) {
    console.log(body.substring(0, 2500));
  } else {
    // Try to find any readable text
    const readable = email.match(/[A-Za-z\s]{50,}/g);
    if (readable) {
      console.log(readable.slice(0, 5).join('\n'));
    }
  }
}

fs.closeSync(fd);
