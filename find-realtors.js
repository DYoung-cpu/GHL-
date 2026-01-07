const fs = require('fs');

// Load all contact sources
const main = JSON.parse(fs.readFileSync('data/full-contact-status.json'));
const priority = JSON.parse(fs.readFileSync('data/priority-contacts.json'));

// Realtor domain patterns
const realtorDomains = [
  'kw.com', 'kwrealty', 'kellerwilliams',
  'compass.com',
  'coldwellbanker', 'cbsocal', 'cbrealty',
  'remax', 're-max',
  'century21', 'c21',
  'sothebys', 'sothebysrealty',
  'bhhscalifornia', 'berkshirehathaway', 'bhhs',
  'redfin',
  'exprealty', 'exp.realty',
  'realtor',
  'realty', 'realestate',
  'homes.com', 'homesmart',
  'firstteam',
  'rodeo', 'theagency',
  'dilbeck', 'douglaselliman',
  'corcoran',
  'properties',
  'brokerage',
  'estateagent',
  'homelife',
  'intero',
  'windermere',
  'weichert',
  'carolwood',
  'pacificunion',
  'harcourts'
];

let found = [];
let foundEmails = new Set();

// Check all Priority contacts
priority.contacts.forEach(c => {
  const email = (c.email || '').toLowerCase();
  const domain = email.split('@')[1] || '';

  const isRealtorDomain = realtorDomains.some(r => domain.includes(r));

  if (isRealtorDomain && !foundEmails.has(email)) {
    foundEmails.add(email);
    found.push({
      email: c.email,
      name: c.fullName,
      domain: domain,
      sent: c.sentTo || 0,
      received: c.receivedFrom || 0,
      source: 'priority'
    });
  }
});

// Check all notInGHL contacts
['unknown', 'prospect', 'client', 'loan_officer'].forEach(cat => {
  (main.notInGHL[cat] || []).forEach(c => {
    const email = (c.email || '').toLowerCase();
    const domain = email.split('@')[1] || '';

    const isRealtorDomain = realtorDomains.some(r => domain.includes(r));

    if (isRealtorDomain && !foundEmails.has(email)) {
      foundEmails.add(email);
      found.push({
        email: c.email,
        name: c.name,
        domain: domain,
        sent: c.sent || 0,
        received: c.received || 0,
        subjects: c.subjects || [],
        source: 'notInGHL-' + cat
      });
    }
  });
});

// Sort by engagement (two-way communication first)
found.sort((a, b) => {
  const aEngaged = (a.sent > 0 && a.received > 0) ? 1 : 0;
  const bEngaged = (b.sent > 0 && b.received > 0) ? 1 : 0;
  if (bEngaged !== aEngaged) return bEngaged - aEngaged;
  return (b.sent + b.received) - (a.sent + a.received);
});

console.log('=== POTENTIAL REALTORS FOUND ===');
console.log('Total:', found.length);
console.log('');

// Show with two-way engagement
const engaged = found.filter(c => c.sent > 0 && c.received > 0);
console.log('WITH TWO-WAY COMMUNICATION:', engaged.length);
engaged.forEach(c => {
  console.log(`  ${c.email} - ${c.name || 'unknown'} (sent:${c.sent} rcvd:${c.received})`);
});

console.log('\nONE-WAY (you sent to them):', found.filter(c => c.sent > 0 && c.received === 0).length);
found.filter(c => c.sent > 0 && c.received === 0).slice(0, 20).forEach(c => {
  console.log(`  ${c.email} - ${c.name || 'unknown'} (sent:${c.sent})`);
});

console.log('\nONE-WAY (they sent to you):', found.filter(c => c.sent === 0 && c.received > 0).length);
found.filter(c => c.sent === 0 && c.received > 0).slice(0, 10).forEach(c => {
  console.log(`  ${c.email} - ${c.name || 'unknown'} (rcvd:${c.received})`);
});

// Save full list
fs.writeFileSync('data/potential-realtors.json', JSON.stringify(found, null, 2));
console.log('\nSaved full list to: data/potential-realtors.json');
