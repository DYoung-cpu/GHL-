const XLSX = require('xlsx');
const fs = require('fs');

const INPUT_PATH = '/mnt/c/Users/dyoun/Downloads/Contacts-WITH-PHONES.xlsx';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/Downloads/Contacts-FINAL-v2.xlsx';

console.log('='.repeat(60));
console.log('  CLEANING CONTACT SPREADSHEET');
console.log('='.repeat(60));

// Read the updated file
const wb = XLSX.readFile(INPUT_PATH);
const ws = wb.Sheets['Contacts'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('\nOriginal rows:', data.length);

// Only these tags are valid (user confirmed)
const VALID_TAGS = {
  // Realtor variations
  'realtor': 'Realtor',
  'realtors': 'Realtor',

  // Loan Officer variations
  'lo': 'Loan Officer',
  'loan officer': 'Loan Officer',
  'loanofficer': 'Loan Officer',

  // Title/Escrow variations
  'title/escrow': 'Title/Escrow',
  'title': 'Title/Escrow',
  'escrow': 'Title/Escrow',

  // Attorney variations
  'attorney': 'Attorney',
  'attorny': 'Attorney',

  // Lead Aggregator variations
  'lead aggregator': 'Lead Aggregator',
  'lead agregator': 'Lead Aggregator',
  'leadaggregator': 'Lead Aggregator',

  // Client variations
  'client': 'Client',
  'clients': 'Client',
  'past client': 'Client',

  // Family & Friends variations
  'family & friends': 'Family & Friends',
  'family/friends': 'Family & Friends',
  'family / friends': 'Family & Friends',
  'family / friends.': 'Family & Friends',
  'friends/familiy': 'Family & Friends',
  'friends and famiily': 'Family & Friends',
  'family': 'Family & Friends',
  'friends': 'Family & Friends',

  // Insurance
  'insurance': 'Insurance',

  // Accountant
  'accountant': 'Accountant',

  // Delete marker
  'delete': 'DELETE'
};

// Normalize - ONLY exact matches, no guessing
function normalizeTag(tag) {
  if (!tag) return '';
  const lower = tag.trim().toLowerCase();

  // Only exact matches - everything else is garbage
  return VALID_TAGS[lower] || '';
}

// Check if it's a proper person name (not a business)
function isProperName(name) {
  if (!name) return false;
  name = name.replace(/'/g, '').trim();

  // Skip encoded names
  if (name.startsWith('=?')) return false;

  // Skip company/business indicators
  if (/\b(inc|llc|corp|company|group|services|solutions|\.com|noreply|donotreply|admin|support|info|billing|helpdesk|burger|baby|shop|store|market|brand|media|studio|labs|tech|foods|grill|cafe|restaurant|hotel|fitness|gym|salon|spa|auto|motors|realty|properties|agency|consulting|partners|associates|enterprises|industries|holdings|capital|financial|insurance|bank|credit|mortgage|lending|loans|dental|medical|health|clinic|hospital|pharmacy|legal|law|attorneys|notary|escrow|title|real estate|home|homes|house|roofing|plumbing|electric|hvac|construction|builders|design|graphics|photo|video|print|marketing|digital|software|solutions|systems|network|cloud|data|analytics|security|management|hr|staffing|recruiting|training|education|school|academy|university|college|institute|foundation|charity|church|ministry|entertainment|music|records|productions|publishing|news|magazine|radio|tv|broadcasting|expert|total|platform|app|online|web|mobile|social|global|national|american|pacific|atlantic|western|eastern|northern|southern|united|first|prime|premier|elite|pro|plus|max|hub|central|direct|express|quick|fast|easy|smart|simple|best|top|super|mega|ultra|power|flex|core|base|point|source|depot|warehouse|supply|wholesale|retail|outlet|club|rewards|connect|link|sync|flow|stream|pulse|wave|spark|flash|zoom|boost|jump|leap|rise|peak|summit|apex|pinnacle|edge|frontier|horizon|gateway|portal|nexus|matrix|vertex|vector|quantum|fusion|synergy|dynamics|kinetic|catalyst|momentum|velocity|impact|force|drive|propel|launch|ignite|accelerate)\b/i.test(name)) {
    return false;
  }

  // Must have a space (first + last name)
  if (!name.includes(' ')) return false;

  // Must be reasonable length
  if (name.length < 4 || name.length > 50) return false;

  return true;
}

// Check if email is a no-reply/system/company email
function isSystemEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return /^(noreply|no-reply|donotreply|do-not-reply|mailer|bounce|postmaster|admin|support|info|sales|contact|hello|team|newsletter|notifications?|alerts?|updates?|news|marketing|promo|billing|accounts?|help|service|customerservice|leads|media|press|pr|hr|careers|jobs|recruiting|legal|compliance|privacy|security|abuse|webmaster|hostmaster|root|ops|devops|dev|engineering|product|feedback|suggestions|inquiries|general|office|reception|orders|shipping|returns|refunds|partnerships|affiliates|sponsors|investors|ir|press|events|community|social|connect|subscribe|unsubscribe|optout|opt-out|remove|list|members|membership|rewards|loyalty|vip|deals|offers|coupons|discounts|specials)@/.test(lower);
}

// Check if email is from Priority Financial (internal - delete)
function isInternalEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.includes('priorityfinancial') || lower.includes('priority-financial') ||
         lower.includes('onenationhomeloans') || lower.includes('lendwisemtg');
}

// Check if email is from a mortgage company domain (for reference only - not auto-tagging)
function isMortgageCompanyEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return /(@.*mortgage|@.*lending|@.*loans|@.*homeloans|@.*mtg|@.*funding)/i.test(lower);
}

// Check if email looks like a marketing/corporate email (NOT a real person)
function isMarketingEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  // 1800, 800, 888 numbers in email = marketing
  if (/\d{3,4}/.test(lower.split('@')[0])) return true;
  // email@ prefix patterns that are marketing
  return /^(1800|800|888|info|news|hello|team|contact|sales|marketing|support|admin|noreply|no-reply|donotreply|notifications?|alerts?|updates?|deals|offers|promo|newsletter|email\.|mailer|bounce|webinar|training|events?)@/i.test(lower);
}

// Check if name looks like a real human name (First Last)
function isHumanName(name) {
  if (!name) return false;
  name = name.trim();

  // Must have space (first + last)
  if (!name.includes(' ')) return false;

  // Must be reasonable length
  if (name.length < 5 || name.length > 40) return false;

  // Split into parts
  const parts = name.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;

  // Each part should be 2+ chars and start with letter
  for (const part of parts) {
    if (part.length < 2) return false;
    if (!/^[A-Za-z]/.test(part)) return false;
  }

  // Company name patterns
  const companyPatterns = /\b(inc|llc|corp|ltd|company|group|bank|lending|mortgage|loans|funding|capital|financial|insurance|realty|properties|services|solutions|network|systems|media|studio|tech|labs|holdings|enterprises|associates|partners|consulting|agency|club|foundation|academy|institute|university|college|school|church|ministry|hotel|restaurant|cafe|grill|burger|foods|fitness|gym|salon|spa|auto|motors|depot|warehouse|supply|outlet|store|shop|market|brand|express|direct|central|hub|online|digital|software|platform|app|mobile|web|global|national|american|united|first|premier|elite|prime|total|expert)\b/i;

  if (companyPatterns.test(name)) return false;

  // Looks like U.S. Bank, Wells Fargo, etc.
  if (/^[A-Z]\.[A-Z]\.?\s/i.test(name)) return false; // U.S.
  if (/\bBank\b/i.test(name)) return false;

  return true;
}

// Filter contacts
const kept = [];
const removed = {
  delete: 0,
  noResponse: 0,
  companyName: 0,
  garbageTag: 0,
  systemEmail: 0,
  internal: 0,
  noPhone: 0,
  marketing: 0,
  notHuman: 0
};

data.forEach(row => {
  const tag = (row.TAG || '').trim().toUpperCase();
  let normalizedTag = normalizeTag(row.TAG);
  const name = row['Full Name'] || '';
  const email = row['Email'] || '';
  const phone = row['Phone'] || '';
  const emailsSent = row['Emails Sent'];
  const hasSent = emailsSent !== undefined && emailsSent !== null && emailsSent !== '' && emailsSent > 0;

  // Remove DELETE tagged (check both original and normalized)
  if (tag === 'DELETE' || tag.includes('DELETE') || /delete/i.test(row.TAG || '')) {
    removed.delete++;
    return;
  }

  // Remove Priority Financial / internal emails
  if (isInternalEmail(email)) {
    removed.internal++;
    return;
  }

  // Remove system/noreply emails
  if (isSystemEmail(email)) {
    removed.systemEmail++;
    return;
  }

  // Remove marketing emails (1800, info@, etc.)
  if (isMarketingEmail(email)) {
    removed.marketing++;
    return;
  }

  // Must have a real human name (not company name)
  if (!isHumanName(name)) {
    removed.notHuman++;
    return;
  }

  // Must have phone number
  if (!phone || phone.trim() === '') {
    removed.noPhone++;
    return;
  }

  // Valid tags list
  const validTags = ['Loan Officer', 'Client', 'Family & Friends', 'Realtor', 'Title/Escrow', 'Attorney', 'Insurance', 'Accountant', 'Lead Aggregator'];
  const hasValidTag = validTags.includes(normalizedTag);

  // If has a tag but it's not recognized, it's garbage - REMOVE
  if (row.TAG && row.TAG.trim() && !hasValidTag) {
    removed.garbageTag++;
    return;
  }

  if (!hasSent && !hasValidTag) {
    removed.noResponse++;
    return;
  }

  // Keep this contact
  row.TAG = normalizedTag || row.TAG;  // Use normalized tag if available
  kept.push(row);
});

console.log('\n--- REMOVED ---');
console.log('  DELETE tagged:', removed.delete);
console.log('  Internal (Priority Financial):', removed.internal);
console.log('  System/noreply emails:', removed.systemEmail);
console.log('  Marketing emails (1800, info@):', removed.marketing);
console.log('  Not human name (company):', removed.notHuman);
console.log('  No phone number:', removed.noPhone);
console.log('  No response (untagged):', removed.noResponse);
console.log('  Company names (untagged):', removed.companyName);
console.log('  Garbage tags:', removed.garbageTag);
const totalRemoved = removed.delete + removed.internal + removed.noResponse + removed.companyName + removed.garbageTag + removed.systemEmail + removed.noPhone + removed.marketing + removed.notHuman;
console.log('  TOTAL REMOVED:', totalRemoved);

console.log('\n--- KEPT ---');
console.log('  Contacts remaining:', kept.length);

// Count by tag
const tagCounts = {};
kept.forEach(r => {
  const tag = r.TAG || '(untagged)';
  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
});

console.log('\nBy category:');
Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([tag, count]) => {
  console.log('  ' + tag + ': ' + count);
});

// Create new workbook
const newWb = XLSX.utils.book_new();

// Reorder columns for clarity
const cleanedRows = kept.map(r => ({
  'Full Name': r['Full Name'],
  'Category': r.TAG || '',
  'Notes': r.Notes || r.Notes_1 || '',
  'Email': r.Email,
  'Phone': r.Phone || '',
  'Company': r.Company || '',
  'Title': r.Title || '',
  'NMLS': r.NMLS || '',
  'Source': r.Source || '',
  'Emails Sent': r['Emails Sent'] || 0,
  'Emails Received': r['Emails Received'] || 0,
  'In GHL': r['In GHL'] || ''
}));

const newWs = XLSX.utils.json_to_sheet(cleanedRows);

// Set column widths
newWs['!cols'] = [
  { wch: 25 },  // Full Name
  { wch: 18 },  // Category
  { wch: 35 },  // Notes
  { wch: 35 },  // Email
  { wch: 15 },  // Phone
  { wch: 25 },  // Company
  { wch: 20 },  // Title
  { wch: 10 },  // NMLS
  { wch: 18 },  // Source
  { wch: 10 },  // Emails Sent
  { wch: 12 },  // Emails Received
  { wch: 8 }    // In GHL
];

XLSX.utils.book_append_sheet(newWb, newWs, 'Contacts');

// Add categories sheet
const categories = [
  ['Categories'],
  ['Loan Officer'],
  ['Client'],
  ['Family & Friends'],
  ['Realtor'],
  ['Title/Escrow'],
  ['Attorney'],
  ['Insurance'],
  ['Accountant'],
  ['Exclude']
];
const catWs = XLSX.utils.aoa_to_sheet(categories);
XLSX.utils.book_append_sheet(newWb, catWs, 'Categories');

// Write file
XLSX.writeFile(newWb, OUTPUT_PATH);

console.log('\n' + '='.repeat(60));
console.log('  SAVED TO:', OUTPUT_PATH);
console.log('='.repeat(60));
