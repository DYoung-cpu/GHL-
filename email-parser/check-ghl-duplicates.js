/**
 * Check for duplicates between our contacts and GHL
 */
const ghlEmails = require('/mnt/c/Users/dyoun/ghl-automation/data/david-young-all-emails.json');
const contacts = require('./data/comprehensive-contacts.json');

const ourEmails = Object.keys(contacts).map(e => e.toLowerCase());
const ghlSet = new Set(ghlEmails.map(e => e.toLowerCase()));

const duplicates = ourEmails.filter(e => ghlSet.has(e));
const newContacts = ourEmails.filter(e => !ghlSet.has(e));

console.log('DUPLICATE CHECK:');
console.log('═'.repeat(50));
console.log('Contacts in our database:', ourEmails.length);
console.log('Contacts already in GHL:', ghlEmails.length);
console.log('');
console.log('DUPLICATES (already in GHL):', duplicates.length);
if (duplicates.length > 0) {
  console.log('─'.repeat(50));
  duplicates.forEach(e => {
    const c = contacts[e];
    console.log('  ' + e);
    console.log('    Name: ' + (c?.name || 'no name'));
    console.log('    Relationship: ' + (c?.relationship?.type || 'unknown'));
  });
}
console.log('');
console.log('NEW (not in GHL yet):', newContacts.length);
