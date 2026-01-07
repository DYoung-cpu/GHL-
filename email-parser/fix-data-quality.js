/**
 * Fix data quality issues in the enrichment cache
 *
 * Issues addressed:
 * 1. Remove customer service emails (no real person)
 * 2. Fix mortgage domain classification -> loan_officer
 * 3. Clear shared/incorrect phone numbers
 * 4. Fix "good"/"poor"/"garbage" being stored as classification types
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
const indexPath = path.join(DATA_DIR, 'email-index.json');
const reviewPath = path.join(DATA_DIR, 'needs-review.json');

// Load data
const cache = JSON.parse(fs.readFileSync(cachePath));
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath)) : {};

// Customer service patterns to remove
const CS_PATTERNS = /^(customerservice|customer-service|support|noreply|no-reply|info|news|team|marketing|notifications|alerts|admin|webmaster|postmaster|mailer-daemon|reply|do-not-reply|donotreply|efolder|feedback|hello|contact|sales|billing|help|service|enquiries|inquiries)@/i;

// Mortgage domain patterns -> loan_officer
const MTG_DOMAIN_PATTERNS = /(mortgage|mtg|lending|lend|homeloan|homeloans|loan(?!mart)|loans)(?!depot)/i;

// Invalid classification types (signature quality got stored as type)
const INVALID_TYPES = ['good', 'poor', 'garbage', 'excellent', 'fair'];

// Stats
let removed = 0;
let fixedMortgage = 0;
let fixedInvalidType = 0;
let clearedPhones = 0;

console.log('=== FIXING DATA QUALITY ISSUES ===\n');

// Step 1: Find shared phone numbers (to clear them)
const phoneToEmails = {};
Object.entries(cache).forEach(([email, data]) => {
  (data.phones || []).forEach(phone => {
    if (!phoneToEmails[phone]) phoneToEmails[phone] = [];
    phoneToEmails[phone].push(email);
  });
});

const sharedPhones = new Set(
  Object.entries(phoneToEmails)
    .filter(([p, arr]) => arr.length > 1)
    .map(([p]) => p)
);

console.log(`Found ${sharedPhones.size} shared phone numbers to clear`);

// Step 2: Process each contact
const toRemove = [];

for (const [email, data] of Object.entries(cache)) {
  // Check if customer service email
  if (CS_PATTERNS.test(email)) {
    toRemove.push(email);
    continue;
  }

  // Clear shared phone numbers
  if (data.phones && data.phones.length > 0) {
    const originalCount = data.phones.length;
    data.phones = data.phones.filter(p => !sharedPhones.has(p));
    if (data.phones.length < originalCount) {
      clearedPhones += (originalCount - data.phones.length);
    }
  }

  // Fix invalid classification types
  if (data.classification && INVALID_TYPES.includes(data.classification.type)) {
    const domain = email.split('@')[1] || '';

    if (MTG_DOMAIN_PATTERNS.test(domain)) {
      data.classification = {
        type: 'loan_officer',
        confidence: 0.85,
        signal: 'mortgage_domain'
      };
      fixedMortgage++;
    } else {
      data.classification = {
        type: 'unknown',
        confidence: 0.5,
        signal: 'needs_review'
      };
      fixedInvalidType++;
    }
  }
  // Also check mortgage domains with unknown classification
  else if (data.classification?.type === 'unknown') {
    const domain = email.split('@')[1] || '';
    if (MTG_DOMAIN_PATTERNS.test(domain)) {
      data.classification = {
        type: 'loan_officer',
        confidence: 0.85,
        signal: 'mortgage_domain'
      };
      fixedMortgage++;
    }
  }
  // Fix entries without classification
  else if (!data.classification || !data.classification.type) {
    const domain = email.split('@')[1] || '';
    if (MTG_DOMAIN_PATTERNS.test(domain)) {
      data.classification = {
        type: 'loan_officer',
        confidence: 0.85,
        signal: 'mortgage_domain'
      };
      fixedMortgage++;
    } else {
      data.classification = {
        type: 'unknown',
        confidence: 0.5,
        signal: 'no_classification'
      };
    }
  }
}

// Step 3: Remove customer service emails
for (const email of toRemove) {
  delete cache[email];
  if (index[email]) delete index[email];
  removed++;
}

// Step 4: Remove from needs-review as well
let reviewList = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath)) : [];
const reviewBefore = reviewList.length;
reviewList = reviewList.filter(c => !toRemove.includes(c.email));

// Save all files
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
fs.writeFileSync(reviewPath, JSON.stringify(reviewList, null, 2));

console.log('\n=== RESULTS ===');
console.log(`Removed customer service emails: ${removed}`);
console.log(`Fixed mortgage domain -> loan_officer: ${fixedMortgage}`);
console.log(`Fixed invalid types (good/poor/garbage): ${fixedInvalidType}`);
console.log(`Cleared shared phone numbers: ${clearedPhones}`);
console.log(`Removed from review queue: ${reviewBefore - reviewList.length}`);
console.log(`\nRemaining contacts: ${Object.keys(cache).length}`);

// Show some examples of what was fixed
console.log('\n=== EXAMPLES REMOVED ===');
toRemove.slice(0, 10).forEach(e => console.log('  - ' + e));

// Verify fixes
console.log('\n=== VERIFICATION ===');
const mtgDomainCheck = Object.entries(cache).filter(([email, data]) => {
  const domain = email.split('@')[1] || '';
  return MTG_DOMAIN_PATTERNS.test(domain) && data.classification?.type !== 'loan_officer';
});
console.log(`Mortgage domains still not LO: ${mtgDomainCheck.length}`);

const invalidTypeCheck = Object.values(cache).filter(d =>
  INVALID_TYPES.includes(d.classification?.type)
).length;
console.log(`Invalid types remaining: ${invalidTypeCheck}`);
