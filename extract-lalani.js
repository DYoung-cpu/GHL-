const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Read around byte 68243101 (Shawn Lalani email)
const fd = fs.openSync(mboxPath, 'r');
const buffer = Buffer.alloc(150000);
fs.readSync(fd, buffer, 0, 150000, 68150000);
fs.closeSync(fd);

const content = buffer.toString('utf8');

// Find the email containing Shawn Lalani
const idx = content.indexOf('Shawn Lalani');
if (idx === -1) {
  console.log('NOT FOUND');
  process.exit(1);
}

// Find email boundaries
let start = content.lastIndexOf('\nFrom ', idx - 50000);
if (start === -1) start = 0;
else start += 1;

let end = content.indexOf('\nFrom ', idx + 1000);
if (end === -1) end = Math.min(idx + 80000, content.length);

const email = content.substring(start, end);

// Get metadata
const dateMatch = email.match(/^Date: (.+)$/m);
const fromMatch = email.match(/^From: (.+)$/m);
const toMatch = email.match(/^To: (.+)$/m);
const subjectMatch = email.match(/^Subject: (.+)$/m);

console.log('='.repeat(80));
console.log('Subject:', subjectMatch ? subjectMatch[1] : 'Unknown');
console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
console.log('From:', fromMatch ? fromMatch[1] : 'Unknown');
console.log('To:', toMatch ? toMatch[1] : 'Unknown');
console.log('='.repeat(80));

// Find text/plain content
const plainIdx = email.indexOf('Content-Type: text/plain');
if (plainIdx !== -1) {
  let textStart = email.indexOf('\n\n', plainIdx);
  let textEnd = email.indexOf('\n--', textStart + 100);
  if (textEnd === -1) textEnd = textStart + 15000;

  let body = email.substring(textStart, textEnd);
  // Decode quoted-printable
  body = body.replace(/=\r?\n/g, '');
  body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  console.log(body.substring(0, 5000));
} else {
  // Show raw content around Shawn Lalani mention
  const lalaniIdx = email.indexOf('Shawn Lalani');
  console.log('Raw content around mention:');
  console.log(email.substring(Math.max(0, lalaniIdx - 500), lalaniIdx + 1000));
}
