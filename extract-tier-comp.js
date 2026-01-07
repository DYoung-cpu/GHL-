const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Position where tier compensation explanation is
const offset = 7775483340;

const fd = fs.openSync(mboxPath, 'r');
const buffer = Buffer.alloc(150000);
fs.readSync(fd, buffer, 0, 150000, offset - 60000);
fs.closeSync(fd);

const content = buffer.toString('utf8');

// Find the Plan Code A mention
const idx = content.indexOf('Plan Code A (Tier 1) is for LO comp');
if (idx === -1) {
  console.log('Not found');
  process.exit(1);
}

// Find email boundaries
let start = content.lastIndexOf('\nFrom ', idx - 50000);
if (start === -1) start = 0;
else start += 1;

let end = content.indexOf('\nFrom ', idx + 1000);
if (end === -1) end = Math.min(idx + 60000, content.length);

const email = content.substring(start, end);

// Metadata
const dateMatch = email.match(/^Date: (.+)$/m);
const fromMatch = email.match(/^From: (.+)$/m);
const toMatch = email.match(/^To: (.+)$/m);
const subjectMatch = email.match(/^Subject: (.+)$/m);

console.log('='.repeat(80));
console.log('Subject:', subjectMatch ? subjectMatch[1] : 'Unknown');
console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
console.log('From:', fromMatch ? fromMatch[1] : 'Unknown');
console.log('To:', toMatch ? toMatch[1].substring(0, 100) : 'Unknown');
console.log('='.repeat(80));

// Find text/plain content
const plainIdx = email.indexOf('Content-Type: text/plain');
if (plainIdx !== -1) {
  let textStart = email.indexOf('\n\n', plainIdx);
  let textEnd = email.indexOf('\n--', textStart + 100);
  if (textEnd === -1) textEnd = textStart + 10000;

  let body = email.substring(textStart, textEnd);
  body = body.replace(/=\r?\n/g, '');
  body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  console.log(body.substring(0, 6000));
} else {
  // Show content around Plan Code A
  const termIdx = email.indexOf('Plan Code A');
  console.log('\nContent around Plan Code A:');
  let snippet = email.substring(Math.max(0, termIdx - 1000), termIdx + 2000);
  snippet = snippet.replace(/=\r?\n/g, '');
  snippet = snippet.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  snippet = snippet.replace(/<[^>]+>/g, ' ');
  snippet = snippet.replace(/\s+/g, ' ').trim();
  console.log(snippet);
}
