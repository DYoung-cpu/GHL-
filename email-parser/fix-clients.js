/**
 * Fix client data:
 * 1. Remove personal emails that never sent (davidReceived = 0)
 * 2. Keep personal emails that did send (real clients)
 */
const fs = require('fs');
const path = require('path');

const cache = JSON.parse(fs.readFileSync('./data/enrichment-cache.json'));
const index = require('./data/email-index.json');

const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'aol.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'icloud.com',
  'att.net', 'comcast.net', 'verizon.net', 'sbcglobal.net'
];

function isPersonal(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_DOMAINS.some(d => domain === d);
}

let removed = 0;
let kept = 0;
const toRemove = [];

for (const email of Object.keys(cache)) {
  if (isPersonal(email)) {
    const idx = index[email];
    const davidReceived = idx?.davidReceived || 0;

    if (davidReceived === 0) {
      // Never sent emails - not a real contact
      toRemove.push(email);
      removed++;
    } else {
      // Actually sent emails - real client
      kept++;
    }
  }
}

// Remove non-senders
for (const email of toRemove) {
  delete cache[email];
}

fs.writeFileSync('./data/enrichment-cache.json', JSON.stringify(cache, null, 2));

console.log('=== FIXED CLIENT DATA ===');
console.log('Removed (never sent emails):', removed);
console.log('Kept (real clients who sent):', kept);
console.log('\nRemoved emails:');
toRemove.forEach(e => console.log('  - ' + e));
