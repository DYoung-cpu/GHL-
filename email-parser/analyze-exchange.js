/**
 * Analyze email exchange patterns
 */
const contacts = require('./data/comprehensive-contacts.json');
const index = require('./data/email-index.json');

let stats = {
  biDirectional: 0,    // You sent AND received
  onlyReceived: 0,     // They sent to you, you never replied
  onlySent: 0,         // You sent to them, they never replied
  noData: 0
};

let onlyReceivedList = [];
let onlySentList = [];

Object.keys(contacts).forEach(email => {
  const i = index[email.toLowerCase()];
  if (!i) {
    stats.noData++;
    return;
  }

  const sent = i.davidSent || 0;
  const received = i.davidReceived || 0;

  if (sent > 0 && received > 0) {
    stats.biDirectional++;
  } else if (received > 0 && sent === 0) {
    stats.onlyReceived++;
    onlyReceivedList.push({ email, received, name: contacts[email].name, rel: contacts[email].relationship?.type });
  } else if (sent > 0 && received === 0) {
    stats.onlySent++;
    onlySentList.push({ email, sent, name: contacts[email].name, rel: contacts[email].relationship?.type });
  } else {
    stats.noData++;
  }
});

console.log('EXCHANGE ANALYSIS:');
console.log('═══════════════════════════════════════════════════════════');
console.log('Bi-directional (real conversations):', stats.biDirectional);
console.log('Only received from (they emailed you, no reply):', stats.onlyReceived);
console.log('Only sent to (you emailed them, no reply):', stats.onlySent);
console.log('No exchange data:', stats.noData);
console.log('');
console.log('ONE-WAY CONTACTS - They emailed you, you never replied:');
console.log('─'.repeat(60));
onlyReceivedList.sort((a, b) => b.received - a.received).slice(0, 20).forEach(c => {
  console.log(`  ${c.email}`);
  console.log(`    Name: ${c.name || '(none)'} | Type: ${c.rel || 'unknown'} | Emails: ${c.received}`);
});
