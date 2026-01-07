const cache = require('./data/enrichment-cache.json');
const contacts = Object.values(cache);

console.log('=== ENRICHMENT CACHE ANALYSIS ===');
console.log('Total contacts in cache:', contacts.length);
console.log('');

// Count what we have
const withPhone = contacts.filter(c => c.phones && c.phones.length > 0).length;
const withTitle = contacts.filter(c => c.titles && c.titles.length > 0).length;
const withCompany = contacts.filter(c => c.companies && c.companies.length > 0).length;
const withNMLS = contacts.filter(c => c.nmls).length;
const withSignature = contacts.filter(c => c.sampleSignatures && c.sampleSignatures.length > 0).length;

console.log('With phone:', withPhone, '(' + Math.round(withPhone/contacts.length*100) + '%)');
console.log('With title:', withTitle, '(' + Math.round(withTitle/contacts.length*100) + '%)');
console.log('With company:', withCompany, '(' + Math.round(withCompany/contacts.length*100) + '%)');
console.log('With NMLS:', withNMLS);
console.log('With signature sample:', withSignature, '(' + Math.round(withSignature/contacts.length*100) + '%)');
console.log('');

// How many have NOTHING?
const withNothing = contacts.filter(c =>
  (!c.phones || c.phones.length === 0) &&
  (!c.titles || c.titles.length === 0) &&
  (!c.companies || c.companies.length === 0) &&
  !c.nmls
).length;
console.log('With NO extracted data:', withNothing, '(' + Math.round(withNothing/contacts.length*100) + '%)');

// Show contacts that have signatures but no extracted data
const noDataButHasSig = contacts.filter(c =>
  (!c.phones || c.phones.length === 0) &&
  (!c.titles || c.titles.length === 0) &&
  (!c.companies || c.companies.length === 0) &&
  c.sampleSignatures && c.sampleSignatures.length > 0
).slice(0, 5);

if (noDataButHasSig.length > 0) {
  console.log('');
  console.log('=== EXAMPLES: Have signature but NO extracted data ===');
  for (const c of noDataButHasSig) {
    console.log('\nEmail:', c.email);
    console.log('Signature sample (first 300 chars):');
    console.log(c.sampleSignatures[0].substring(0, 300));
    console.log('---');
  }
}
