/**
 * Clean Enriched Contacts
 * Filters out garbage data from signature extraction
 */

const fs = require('fs');

const INPUT_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts-enriched.json';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts-final.json';

const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));

// Valid US area codes (first digit 2-9)
function isValidPhone(phone) {
  // Skip obvious garbage
  if (phone.includes('000-000')) return false;
  if (phone.startsWith('0')) return false;

  const parts = phone.split('-');
  if (parts.length !== 3) return false;

  const areaCode = parseInt(parts[0]);
  const exchange = parseInt(parts[1]);

  // Valid area codes start with 2-9
  if (areaCode < 200 || areaCode > 999) return false;
  // Valid exchange codes start with 2-9
  if (exchange < 200 || exchange > 999) return false;

  // Skip sequential patterns (likely encoded data)
  if (phone.match(/(\d)\1{4,}/)) return false;

  return true;
}

// Clean title - must be readable job title
function isValidTitle(title) {
  if (!title) return false;
  if (title.length < 5 || title.length > 60) return false;

  // Must contain common job title words
  const jobWords = /\b(manager|director|officer|president|vp|ceo|cfo|broker|agent|realtor|escrow|title|loan|mortgage|specialist|coordinator|assistant|associate|senior|consultant|processor|underwriter|closer|sales)\b/i;
  if (!jobWords.test(title)) return false;

  // Must have mostly letters and spaces
  const letterCount = (title.match(/[a-zA-Z\s]/g) || []).length;
  if (letterCount / title.length < 0.8) return false;

  // Skip garbage
  if (title.includes('inline') || title.includes('style') || title.includes('=')) return false;
  if (title.match(/[A-Z]{10,}/)) return false; // Too many caps in a row

  return true;
}

// Clean company name
function isValidCompany(company) {
  if (!company) return false;
  if (company.length < 5 || company.length > 80) return false;

  // Must have mostly readable characters
  const letterCount = (company.match(/[a-zA-Z\s&,\.]/g) || []).length;
  if (letterCount / company.length < 0.8) return false;

  // Skip encoded garbage
  if (company.match(/[a-zA-Z0-9]{15,}/)) return false; // Long alphanumeric strings
  if (company.includes('=')) return false;
  if (company.includes('\n')) return false;

  // Must contain company-like words or patterns
  const companyPatterns = /\b(mortgage|realty|title|escrow|financial|bank|lending|insurance|group|inc|llc|corp|company|network|services)\b/i;
  if (!companyPatterns.test(company)) return false;

  return true;
}

let cleanedCount = 0;
let phonesFound = 0;
let titlesFound = 0;
let companiesFound = 0;

const cleanedContacts = data.contacts.map(contact => {
  const cleanPhones = (contact.phones || []).filter(isValidPhone);
  const cleanTitles = (contact.titles || []).filter(isValidTitle);
  const cleanCompanies = (contact.companies || []).filter(isValidCompany);

  // Dedupe
  const uniquePhones = [...new Set(cleanPhones)].slice(0, 3);
  const uniqueTitles = [...new Set(cleanTitles)].slice(0, 2);
  const uniqueCompanies = [...new Set(cleanCompanies)].slice(0, 2);

  if (uniquePhones.length > 0) phonesFound++;
  if (uniqueTitles.length > 0) titlesFound++;
  if (uniqueCompanies.length > 0) companiesFound++;

  const hasEnrichment = uniquePhones.length > 0 || uniqueTitles.length > 0 || uniqueCompanies.length > 0;
  if (hasEnrichment) cleanedCount++;

  return {
    email: contact.email,
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    fullName: contact.fullName || '',
    sentTo: contact.sentTo || 0,
    receivedFrom: contact.receivedFrom || 0,
    phone: uniquePhones[0] || '',
    altPhones: uniquePhones.slice(1),
    title: uniqueTitles[0] || '',
    company: uniqueCompanies[0] || '',
    addresses: (contact.addresses || []).slice(0, 2)
  };
});

// Sort by sentTo (people David actually emailed most)
cleanedContacts.sort((a, b) => b.sentTo - a.sentTo);

const output = {
  extractedAt: new Date().toISOString(),
  source: 'onenationhomeloans.com - cleaned and enriched',
  totalContacts: cleanedContacts.length,
  enrichmentStats: {
    withPhone: phonesFound,
    withTitle: titlesFound,
    withCompany: companiesFound,
    totalEnriched: cleanedCount
  },
  contacts: cleanedContacts
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log('=== CLEANED CONTACTS ===');
console.log(`Total contacts: ${cleanedContacts.length}`);
console.log(`With phone: ${phonesFound}`);
console.log(`With title: ${titlesFound}`);
console.log(`With company: ${companiesFound}`);
console.log(`\nSaved to: ${OUTPUT_PATH}`);

// Show top 15 contacts
console.log('\n=== TOP 15 CONTACTS (by emails sent) ===');
cleanedContacts.slice(0, 15).forEach((c, i) => {
  console.log(`${i + 1}. ${c.firstName} ${c.lastName} <${c.email}>`);
  console.log(`   Sent: ${c.sentTo} | Received: ${c.receivedFrom}`);
  if (c.phone) console.log(`   Phone: ${c.phone}`);
  if (c.title) console.log(`   Title: ${c.title}`);
  if (c.company) console.log(`   Company: ${c.company}`);
});
