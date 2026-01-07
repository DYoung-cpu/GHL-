/**
 * Recategorize contacts - catch more Loan Officers
 */

const fs = require('fs');

const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
const lines = csv.split('\n');
const header = lines[0];

// Expanded LO keywords
const loKeywords = [
  // Original
  'mortgage', 'lending', 'loan', 'financial', 'bank', 'credit',
  'homebridge', 'loandepot', 'mrcooper', 'quicken', 'movement',
  'guild', 'fairway', 'cardinal', 'rate.com', 'ccm.com', 'cmgfi',
  'nafinc', 'atlanticbay', 'boh.com', 'lennar', 'empire', 'motto',
  'apmortgage', 'caliber', 'pennymac', 'flagstar', 'pnc',
  'wellsfargo', 'chase', 'usbank', 'guaranteed',
  // Added to catch more
  'mtg',           // mortgage abbreviation (mtgmatters, primemtg)
  'lender',        // htlenders, etc
  'homeloan',      // genesishomeloan
  'homefund',
  'funding',
  'capital',
  'finance',       // imaginationfinancial
  'supreme',       // supremelending
  'swift',         // swiftmortgagelending
  'alliance',      // 1stalliancemortgage
  'firstrate',     // iamfirstrate
  'ontime',        // ontimelending
  'prime',         // theprimemtg
  'elite',         // elitechoice (often mortgage)
  'home group',
  'homegroup',     // nuhomegroup
  'lotus',         // lotusmortgage
  'praedium',      // praediumlending
  'genesis',       // genesishomeloan
  's3home',        // s3homeloans
  'gazette',       // gazettemortgage
  'imagination',   // imaginationfinancial
  'jp mortgage',
  'jpmortgage'
];

const borrowerDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'me.com', 'msn.com', 'sbcglobal.net', 'att.net', 'verizon.net', 'comcast.net', 'cox.net', 'earthlink.net', 'mac.com', 'live.com', 'ymail.com', 'rocketmail.com'];

const realtorKeywords = ['realty', 'realtor', 'realestate', 'real-estate', 'coldwell', 'berkshire', 'keller', 'century21', 'remax', 'sotheby', 'compass', 'exp.com', 'exprealty', 'bhhs', 'corcoran', 'weichert', 'era.com', 'homesmart', 'exitrealty'];

const titleKeywords = ['title', 'escrow', 'ticor', 'firstam', 'fidelity', 'stewart', 'chicago', 'oldrepublic', 'wfg', 'amtrust'];

const newLines = [header];
const counts = { Borrower: 0, 'Loan Officer': 0, Realtor: 0, 'Title/Escrow': 0, Unknown: 0 };
let reclassified = 0;

lines.slice(1).forEach(line => {
  if (line.trim() === '') return;

  const parts = line.split(',');
  const oldType = (parts[1] || '').replace(/"/g, '').trim();
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

  if (oldType === 'Unknown' && contactType === 'Loan Officer') {
    reclassified++;
  }

  counts[contactType]++;
  parts[1] = '"' + contactType + '"';
  newLines.push(parts.join(','));
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', newLines.join('\n'));

console.log('=== RECATEGORIZATION COMPLETE ===');
console.log('Reclassified from Unknown to Loan Officer: ' + reclassified);
console.log('');
console.log('=== FINAL COUNTS ===');
console.log('Borrowers: ' + counts.Borrower);
console.log('Loan Officers: ' + counts['Loan Officer']);
console.log('Realtors: ' + counts.Realtor);
console.log('Title/Escrow: ' + counts['Title/Escrow']);
console.log('Unknown: ' + counts.Unknown);
console.log('\nTotal: ' + (newLines.length - 1) + ' contacts');
