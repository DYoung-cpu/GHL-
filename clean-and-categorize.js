/**
 * Clean and categorize contacts - apply all filters
 */

const fs = require('fs');

let csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
let lines = csv.split('\n');
const header = lines[0];

console.log('Starting with: ' + (lines.length - 1) + ' contacts');

// Remove unwanted domains
const removePatterns = [
  'priorityfinancial.net',
  'onenationhomeloans.com',
  'purpledot',
  'rocketmortgage.com'
];

let removed = { pfn: 0, onenation: 0, purpledot: 0, rocket: 0 };

lines = lines.filter((line, i) => {
  if (i === 0) return true;
  const lower = line.toLowerCase();
  if (lower.includes('priorityfinancial.net')) { removed.pfn++; return false; }
  if (lower.includes('onenationhomeloans.com')) { removed.onenation++; return false; }
  if (lower.includes('purpledot')) { removed.purpledot++; return false; }
  if (lower.includes('rocketmortgage.com')) { removed.rocket++; return false; }
  return true;
});

console.log('Removed:');
console.log('  Priority Financial: ' + removed.pfn);
console.log('  OneNation: ' + removed.onenation);
console.log('  BigPurpleDot: ' + removed.purpledot);
console.log('  Rocket Mortgage: ' + removed.rocket);
console.log('After removal: ' + (lines.length - 1) + ' contacts');

// Categorize
const borrowerDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'me.com', 'msn.com', 'sbcglobal.net', 'att.net', 'verizon.net', 'comcast.net', 'cox.net', 'earthlink.net', 'mac.com', 'live.com', 'ymail.com', 'rocketmail.com'];

const loKeywords = ['mortgage', 'lending', 'loan', 'financial', 'bank', 'credit', 'homebridge', 'loandepot', 'mrcooper', 'quicken', 'movement', 'guild', 'fairway', 'cardinal', 'rate.com', 'ccm.com', 'cmgfi', 'nafinc', 'atlanticbay', 'boh.com', 'lennar', 'empire', 'motto', 'apmortgage', 'caliber', 'pennymac', 'flagstar', 'pnc', 'wellsfargo', 'chase', 'usbank', 'guaranteed'];

const realtorKeywords = ['realty', 'realtor', 'realestate', 'real-estate', 'coldwell', 'berkshire', 'keller', 'century21', 'remax', 'sotheby', 'compass', 'exp.com', 'exprealty', 'bhhs', 'corcoran', 'weichert', 'era.com', 'homesmart', 'exitrealty'];

const titleKeywords = ['title', 'escrow', 'ticor', 'firstam', 'fidelity', 'stewart', 'chicago', 'oldrepublic', 'wfg', 'amtrust'];

const newLines = [header.replace('Category', 'Contact Type')];
const counts = { Borrower: 0, 'Loan Officer': 0, Realtor: 0, 'Title/Escrow': 0, Unknown: 0 };

lines.slice(1).forEach(line => {
  if (line.trim() === '') return;

  const parts = line.split(',');
  const email = (parts[4] || '').replace(/"/g, '').toLowerCase();
  const domain = email.split('@')[1] || '';

  let contactType = 'Unknown';

  if (borrowerDomains.some(d => domain === d)) {
    contactType = 'Borrower';
  } else if (loKeywords.some(k => domain.includes(k))) {
    contactType = 'Loan Officer';
  } else if (realtorKeywords.some(k => domain.includes(k))) {
    contactType = 'Realtor';
  } else if (titleKeywords.some(k => domain.includes(k))) {
    contactType = 'Title/Escrow';
  }

  counts[contactType]++;
  parts[1] = '"' + contactType + '"';
  newLines.push(parts.join(','));
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', newLines.join('\n'));

console.log('\n=== FINAL CONTACT TYPES ===');
console.log('Borrowers: ' + counts.Borrower);
console.log('Loan Officers: ' + counts['Loan Officer']);
console.log('Realtors: ' + counts.Realtor);
console.log('Title/Escrow: ' + counts['Title/Escrow']);
console.log('Unknown: ' + counts.Unknown);
console.log('\nTotal: ' + (newLines.length - 1) + ' contacts');
console.log('Saved to: C:\\Users\\dyoun\\Downloads\\all-contacts-review.csv');
