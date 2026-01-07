const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Positions where Marc is CC'd
const marcCcPositions = [
  14817278, 14929368, 14979494, 22143777, 33808865, 41405636, 41437081,
  42365738, 48616575, 51452980, 63408231, 72276682, 103529974, 103674753,
  103794540, 103893074, 123742151, 123937602, 124141897, 124341988,
  124542424, 124680963, 124683912, 124802369
];

const fd = fs.openSync(mboxPath, 'r');
const tierKeywords = ['tier', 'lock desk', 'lockdesk', 'plan code', 'override', 'bps', 'margin', 'pricing'];

console.log('Searching for Marc CC emails with tier/lock desk content...\n');

let found = [];

for (const pos of marcCcPositions) {
  // Read 80KB around position
  const startPos = Math.max(0, pos - 40000);
  const buffer = Buffer.alloc(80000);
  fs.readSync(fd, buffer, 0, 80000, startPos);
  const content = buffer.toString('utf8').toLowerCase();

  // Check if contains tier-related keywords
  const matchedKeywords = tierKeywords.filter(kw => content.includes(kw));

  if (matchedKeywords.length > 0) {
    // Extract email details
    const fullContent = buffer.toString('utf8');
    const dateMatch = fullContent.match(/^Date: (.+)$/m);
    const subjectMatch = fullContent.match(/^Subject: (.+?)(\r?\n[^\r\n]|$)/m);
    const fromMatch = fullContent.match(/^From: (.+)$/m);
    const toMatch = fullContent.match(/^To: (.+)$/m);

    const email = {
      position: pos,
      date: dateMatch ? dateMatch[1].trim() : 'Unknown',
      subject: subjectMatch ? subjectMatch[1].trim().replace(/\s+/g, ' ') : 'Unknown',
      from: fromMatch ? fromMatch[1].trim() : 'Unknown',
      to: toMatch ? toMatch[1].trim() : 'Unknown',
      keywords: matchedKeywords
    };

    // Check if Marc is actually CC'd (not just in content)
    if (fullContent.includes('Cc:') && fullContent.toLowerCase().includes('marc')) {
      found.push(email);
      console.log('='.repeat(70));
      console.log('Position:', pos);
      console.log('Subject:', email.subject.substring(0, 70));
      console.log('Date:', email.date);
      console.log('From:', email.from.substring(0, 50));
      console.log('Keywords found:', matchedKeywords.join(', '));
    }
  }
}

fs.closeSync(fd);

console.log('\n' + '='.repeat(70));
console.log(`FOUND: ${found.length} emails with Marc CC'd and tier/lock desk content`);

// Save positions for extraction
fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/marc-tier-positions.json', JSON.stringify(found, null, 2));
console.log('Saved positions to marc-tier-positions.json');
