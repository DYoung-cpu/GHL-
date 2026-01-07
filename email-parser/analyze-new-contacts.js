/**
 * Analyze 275 NEW contacts by relationship type for import planning
 */
const fs = require('fs');

const ghlEmails = require('/mnt/c/Users/dyoun/ghl-automation/data/david-young-all-emails.json');
const contacts = require('./data/comprehensive-contacts.json');

const ghlSet = new Set(ghlEmails.map(e => e.toLowerCase()));

// Get NEW contacts (not in GHL)
const newContacts = {};
Object.entries(contacts).forEach(([email, data]) => {
  const dominated = ghlSet.has(email.toLowerCase());
  if (!dominated) {
    newContacts[email] = data;
  }
});

// Categorize by relationship type
const byRelationship = {};
Object.entries(newContacts).forEach(([email, data]) => {
  const rel = data.relationship?.type || 'unknown';
  if (!byRelationship[rel]) byRelationship[rel] = [];
  byRelationship[rel].push({ email, name: data.name, company: data.company });
});

console.log('275 NEW CONTACTS - BY RELATIONSHIP TYPE');
console.log('═'.repeat(60));
console.log('');

const sorted = Object.entries(byRelationship).sort((a,b) => b[1].length - a[1].length);

sorted.forEach(([type, list]) => {
  console.log(type.toUpperCase() + ': ' + list.length);
  console.log('─'.repeat(40));
  list.slice(0, 5).forEach(c => {
    console.log('  ' + (c.name || 'no name'));
    if (c.company) console.log('    @ ' + c.company);
  });
  if (list.length > 5) console.log('  ... and ' + (list.length - 5) + ' more');
  console.log('');
});

// Summary for import planning
console.log('═'.repeat(60));
console.log('IMPORT PLANNING:');
console.log('═'.repeat(60));

const clients = (byRelationship['client'] || []).length;
const lenders = (byRelationship['lender'] || []).length;
const realtors = (byRelationship['realtor'] || []).length;
const colleagues = (byRelationship['colleague'] || []).length;
const vendors = (byRelationship['vendor'] || []).length;
const titleEscrow = (byRelationship['title_escrow'] || []).length;
const unknown = (byRelationship['unknown'] || []).length;
const personal = (byRelationship['personal'] || []).length;

console.log('');
console.log('  CLIENT NURTURING:');
console.log('    Clients: ' + clients);
console.log('');
console.log('  LO RECRUITMENT:');
console.log('    Lenders/LOs: ' + lenders);
console.log('    Colleagues: ' + colleagues);
console.log('');
console.log('  PARTNER MARKETING:');
console.log('    Realtors: ' + realtors);
console.log('    Title/Escrow: ' + titleEscrow);
console.log('');
console.log('  OTHER:');
console.log('    Vendors: ' + vendors);
console.log('    Personal: ' + personal);
console.log('    Unknown (needs review): ' + unknown);

// Save categorized lists for export
const exportData = {
  clients: byRelationship['client'] || [],
  lenders: byRelationship['lender'] || [],
  realtors: byRelationship['realtor'] || [],
  colleagues: byRelationship['colleague'] || [],
  titleEscrow: byRelationship['title_escrow'] || [],
  vendors: byRelationship['vendor'] || [],
  personal: byRelationship['personal'] || [],
  unknown: byRelationship['unknown'] || []
};

fs.writeFileSync('./data/new-contacts-by-category.json', JSON.stringify(exportData, null, 2));
console.log('\nSaved categorized lists to data/new-contacts-by-category.json');
