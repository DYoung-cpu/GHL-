/**
 * Categorize contacts into Borrowers, Loan Officers, Realtors, Unknown
 */

const fs = require('fs');

const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
const lines = csv.split('\n');
const header = lines[0];

// Domain categorization
const borrowerDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'me.com', 'msn.com', 'sbcglobal.net', 'att.net', 'verizon.net', 'comcast.net', 'cox.net', 'earthlink.net', 'mac.com', 'live.com', 'ymail.com', 'rocketmail.com'];

const loKeywords = ['mortgage', 'lending', 'loan', 'financial', 'bank', 'credit', 'homebridge', 'loandepot', 'mrcooper', 'quicken', 'movement', 'guild', 'fairway', 'cardinal', 'rate.com', 'ccm.com', 'cmgfi', 'nafinc', 'atlanticbay', 'boh.com', 'lennar', 'empire', 'motto', 'apmortgage', 'caliber', 'pennymac', 'nationstar', 'ditech', 'ocwen', 'newrez', 'loancare', 'cenlar', 'flagstar', 'pnc', 'wellsfargo', 'chase', 'usbank', 'citi', 'regions', 'suntrust', 'truist', 'ally', 'guaranteedrate', 'better.com', 'rocket'];

const realtorKeywords = ['realty', 'realtor', 'realestate', 'real-estate', 'coldwell', 'berkshire', 'keller', 'century21', 'remax', 're/max', 'sotheby', 'compass', 'exp.com', 'exprealty', 'bhhs', 'corcoran', 'weichert', 'era.com', 'homesmart', 'exitrealty', 'kellerwilliams', 'cbhomes'];

const titleEscrowKeywords = ['title', 'escrow', 'ticor', 'firstam', 'fidelity', 'stewart', 'chicago', 'oldrepublic', 'boston', 'wfg', 'amtrust'];

// Parse and recategorize
const newLines = [header.replace('Category', 'Contact Type')];

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
  } else if (titleEscrowKeywords.some(k => domain.includes(k))) {
    contactType = 'Title/Escrow';
  }

  // Replace the category column (index 1)
  parts[1] = '"' + contactType + '"';
  newLines.push(parts.join(','));
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', newLines.join('\n'));

// Count categories
const counts = { 'Borrower': 0, 'Loan Officer': 0, 'Realtor': 0, 'Title/Escrow': 0, 'Unknown': 0 };
newLines.slice(1).forEach(line => {
  if (line.includes('"Borrower"')) counts['Borrower']++;
  else if (line.includes('"Loan Officer"')) counts['Loan Officer']++;
  else if (line.includes('"Realtor"')) counts['Realtor']++;
  else if (line.includes('"Title/Escrow"')) counts['Title/Escrow']++;
  else counts['Unknown']++;
});

console.log('=== CONTACT TYPES ===');
console.log('Borrowers: ' + counts['Borrower']);
console.log('Loan Officers: ' + counts['Loan Officer']);
console.log('Realtors: ' + counts['Realtor']);
console.log('Title/Escrow: ' + counts['Title/Escrow']);
console.log('Unknown: ' + counts['Unknown']);
console.log('\nTotal: ' + (newLines.length - 1) + ' contacts');
console.log('Updated: all-contacts-review.csv');
