/**
 * Check exchange metrics for personal emails
 */
const cache = require('./data/enrichment-cache.json');
const index = require('./data/email-index.json');

const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'icloud.com',
  'outlook.com', 'live.com', 'msn.com', 'att.net', 'comcast.net'
];

function isPersonal(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_DOMAINS.some(d => domain === d);
}

// Check personal emails in enrichment cache
const personalInCache = Object.keys(cache).filter(isPersonal);

console.log('=== PERSONAL EMAILS IN ENRICHMENT CACHE ===');
console.log('Total:', personalInCache.length);

// How many never sent emails?
const neverSent = personalInCache.filter(email => {
  const idx = index[email];
  return !idx || !idx.davidReceived || idx.davidReceived === 0;
});

const didSend = personalInCache.filter(email => {
  const idx = index[email];
  return idx && idx.davidReceived > 0;
});

console.log('Actually sent emails (real clients):', didSend.length);
console.log('Never sent emails (should remove):', neverSent.length);

console.log('\n=== REAL CLIENTS (sent emails) ===');
didSend.slice(0, 5).forEach(email => {
  const idx = index[email];
  const c = cache[email];
  console.log(email);
  console.log('  Sent to David:', idx?.davidReceived);
  console.log('  Phones:', c.phones?.length || 0);
});

console.log('\n=== NON-SENDERS IN CACHE (to remove) ===');
neverSent.slice(0, 10).forEach(email => {
  const idx = index[email];
  console.log(email + ' - davidReceived:', idx?.davidReceived || 0);
});
