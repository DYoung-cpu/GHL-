/**
 * Remove Priority Financial contacts except allowed people
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'data/email-index.json');
const index = JSON.parse(fs.readFileSync(indexPath));

// Allowed Priority Financial people (partial matches)
const allowedPatterns = [
  'bryan campbell', 'bryancampbell', 'bryan@',
  'marc shenkman', 'marcshenkman', 'teamshenkman', 'marc@',
  'brenda perry', 'brendaperry', 'brenda@',
  'anthony amini', 'anthonyamini',
  'paul rosenthal', 'paulrosenthal',
  'lockdesk'  // Lock desk emails
];

let removed = 0;
let kept = 0;
const keptList = [];

// Filter out Priority Financial contacts except allowed
for (const email of Object.keys(index)) {
  if (email.toLowerCase().includes('priorityfinancial')) {
    const contact = index[email];
    const emailLower = email.toLowerCase();
    const nameLower = (contact.name || '').toLowerCase();

    // Check if this person is allowed
    const isAllowed = allowedPatterns.some(pattern =>
      emailLower.includes(pattern) || nameLower.includes(pattern)
    );

    if (isAllowed) {
      kept++;
      keptList.push({ name: contact.name || 'No name', email });
    } else {
      delete index[email];
      removed++;
    }
  }
}

// Save updated index
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

console.log('KEPT CONTACTS:');
console.log('='.repeat(50));
keptList.forEach(c => console.log(`  ${c.name} <${c.email}>`));
console.log('');
console.log('='.repeat(50));
console.log(`Removed: ${removed} Priority Financial contacts`);
console.log(`Kept: ${kept} allowed contacts`);
console.log(`Remaining total: ${Object.keys(index).length}`);
