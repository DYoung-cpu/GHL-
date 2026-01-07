const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Key positions
const positions = [
  { offset: 4300303723, desc: 'Plan Code A silver tier' },
  { offset: 7775483043, desc: 'MARGIN tier Plan Code A explanation' }
];

const fd = fs.openSync(mboxPath, 'r');

for (const pos of positions) {
  console.log('\n' + '='.repeat(80));
  console.log('Extracting:', pos.desc);

  const startPos = Math.max(0, pos.offset - 30000);
  const buffer = Buffer.alloc(80000);
  fs.readSync(fd, buffer, 0, 80000, startPos);

  const content = buffer.toString('utf8');

  // Find "Plan Code A"
  const idx = content.indexOf('Plan Code A');
  if (idx === -1) {
    console.log('Not found');
    continue;
  }

  // Find email boundaries
  let start = content.lastIndexOf('\nFrom ', idx - 20000);
  if (start === -1) start = 0;
  else start += 1;

  let end = content.indexOf('\nFrom ', idx + 500);
  if (end === -1) end = Math.min(idx + 40000, content.length);

  const email = content.substring(start, end);

  // Metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const subjectMatch = email.match(/^Subject: (.+)$/m);

  console.log('Subject:', subjectMatch ? subjectMatch[1].substring(0, 80) : 'Unknown');
  console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
  console.log('From:', fromMatch ? fromMatch[1].substring(0, 60) : 'Unknown');
  console.log('-'.repeat(80));

  // Find text/plain content
  const plainIdx = email.indexOf('Content-Type: text/plain');
  if (plainIdx !== -1) {
    let textStart = email.indexOf('\n\n', plainIdx);
    let textEnd = email.indexOf('\n--', textStart + 100);
    if (textEnd === -1) textEnd = textStart + 8000;

    let body = email.substring(textStart, textEnd);
    body = body.replace(/=\r?\n/g, '');
    body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    body = body.replace(/<[^>]+>/g, ' ');
    body = body.replace(/\s+/g, ' ').trim();

    console.log(body.substring(0, 3000));
  } else {
    // Show raw around Plan Code A
    const termIdx = email.indexOf('Plan Code A');
    let snippet = email.substring(Math.max(0, termIdx - 200), termIdx + 500);
    snippet = snippet.replace(/=\r?\n/g, '');
    snippet = snippet.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    snippet = snippet.replace(/<[^>]+>/g, ' ');
    snippet = snippet.replace(/\s+/g, ' ').trim();
    console.log(snippet);
  }
}

fs.closeSync(fd);
