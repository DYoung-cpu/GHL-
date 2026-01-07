const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Byte positions for tier emails
const positions = [
  { offset: 9030972193, term: 'Bronze Tier pricing' },
  { offset: 9302941446, term: 'Dave on Silver tier' }
];

const fd = fs.openSync(mboxPath, 'r');
const stats = fs.fstatSync(fd);
console.log('File size:', stats.size);

for (const pos of positions) {
  console.log('\n' + '='.repeat(80));
  console.log('Looking for:', pos.term, 'at byte', pos.offset);

  if (pos.offset > stats.size) {
    console.log('Position exceeds file size!');
    continue;
  }

  // Read 100KB around the position
  const startPos = Math.max(0, pos.offset - 50000);
  const buffer = Buffer.alloc(100000);
  const bytesRead = fs.readSync(fd, buffer, 0, 100000, startPos);
  console.log('Bytes read:', bytesRead);

  const content = buffer.toString('utf8');

  // Find the term
  const idx = content.indexOf(pos.term);
  if (idx === -1) {
    console.log('Term not found in buffer');
    continue;
  }

  // Find email boundaries
  let start = content.lastIndexOf('\nFrom ', idx - 30000);
  if (start === -1) start = 0;
  else start += 1;

  let end = content.indexOf('\nFrom ', idx + 500);
  if (end === -1) end = Math.min(idx + 30000, content.length);

  const email = content.substring(start, end);

  // Get metadata
  const dateMatch = email.match(/^Date: (.+)$/m);
  const fromMatch = email.match(/^From: (.+)$/m);
  const toMatch = email.match(/^To: (.+)$/m);
  const subjectMatch = email.match(/^Subject: (.+)$/m);

  console.log('Subject:', subjectMatch ? subjectMatch[1].substring(0, 80) : 'Unknown');
  console.log('Date:', dateMatch ? dateMatch[1] : 'Unknown');
  console.log('From:', fromMatch ? fromMatch[1].substring(0, 60) : 'Unknown');
  console.log('To:', toMatch ? toMatch[1].substring(0, 60) : 'Unknown');
  console.log('-'.repeat(80));

  // Find text content around the tier mention
  const termIdx = email.indexOf(pos.term);
  const snippet = email.substring(Math.max(0, termIdx - 300), termIdx + 200);

  // Clean up for display
  let cleanSnippet = snippet;
  cleanSnippet = cleanSnippet.replace(/=\r?\n/g, '');
  cleanSnippet = cleanSnippet.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  cleanSnippet = cleanSnippet.replace(/<[^>]+>/g, ' ');
  cleanSnippet = cleanSnippet.replace(/\s+/g, ' ').trim();

  console.log('Content:', cleanSnippet);
}

fs.closeSync(fd);
