/**
 * Clean Priority Financial contacts from enrichment cache and review queue
 * Only keeps allowed people from the list
 */

const fs = require('fs');
const path = require('path');

// Allowed patterns - ONLY these PFN people are kept
const allowedPatterns = [
  'bryan campbell', 'bryancampbell', 'bryan@',
  'marc shenkman', 'marcshenkman', 'teamshenkman', 'marc@',
  'brenda perry', 'brendaperry', 'brenda@',
  'anthony amini', 'anthonyamini',
  'paul rosenthal', 'paulrosenthal',
  'lockdesk'
];

function isAllowedPFN(email, name) {
  const emailLower = (email || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  return allowedPatterns.some(p => emailLower.includes(p) || nameLower.includes(p));
}

const DATA_DIR = path.join(__dirname, 'data');

// Clean enrichment cache
console.log('Cleaning enrichment cache...');
const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath));
let cacheRemoved = 0;
const cacheKept = [];

for (const email of Object.keys(cache)) {
  if (email.includes('priorityfinancial')) {
    if (isAllowedPFN(email, cache[email].name)) {
      cacheKept.push(email);
    } else {
      delete cache[email];
      cacheRemoved++;
    }
  }
}
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log(`  Removed: ${cacheRemoved} PFN contacts`);
console.log(`  Kept: ${cacheKept.length} allowed PFN contacts`);

// Clean needs-review
console.log('\nCleaning needs-review queue...');
const reviewPath = path.join(DATA_DIR, 'needs-review.json');
let review = JSON.parse(fs.readFileSync(reviewPath));
const beforeReview = review.length;
review = review.filter(c => {
  if (c.email.includes('priorityfinancial')) {
    return isAllowedPFN(c.email, '');
  }
  return true;
});
fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2));
console.log(`  Removed: ${beforeReview - review.length} PFN contacts`);
console.log(`  Remaining: ${review.length} contacts to review`);

// Clean email index
console.log('\nCleaning email index...');
const indexPath = path.join(DATA_DIR, 'email-index.json');
const index = JSON.parse(fs.readFileSync(indexPath));
let indexRemoved = 0;

for (const email of Object.keys(index)) {
  if (email.includes('priorityfinancial')) {
    if (!isAllowedPFN(email, index[email].name)) {
      delete index[email];
      indexRemoved++;
    }
  }
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`  Removed: ${indexRemoved} PFN contacts`);

console.log('\n=== DONE ===');
console.log(`Total remaining contacts in index: ${Object.keys(index).length}`);
console.log(`Total remaining in enrichment cache: ${Object.keys(cache).length}`);
console.log(`Contacts needing review: ${review.length}`);
