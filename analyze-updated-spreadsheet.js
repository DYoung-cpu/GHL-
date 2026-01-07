const XLSX = require('xlsx');
const wb = XLSX.readFile('/mnt/c/Users/dyoun/Downloads/Updated.xlsx');
const ws = wb.Sheets['Contacts'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows:', data.length);

// Count tagged (user's TAG column)
const tagged = data.filter(r => r.TAG && r.TAG.trim());
console.log('\nTagged by user:', tagged.length);

// Show tag breakdown
const tagCounts = {};
tagged.forEach(r => {
  const tag = r.TAG || 'None';
  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
});
console.log('\nUser tag breakdown:');
Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log('  ' + tag + ': ' + count);
});

// Count spam indicators
const noResponse = data.filter(r => {
  const sent = r['Emails Sent'];
  return sent === undefined || sent === null || sent === 0 || sent === '';
});
console.log('\n--- SPAM FILTERS ---');
console.log('No emails sent (never responded):', noResponse.length);

// Check for company-only names (no proper first/last)
const companyNames = data.filter(r => {
  const name = (r['Full Name'] || '').replace(/'/g, '').trim();
  // Likely company if: contains Inc, LLC, Corp, or doesn't have a space (single word)
  const isCompany = /\b(inc|llc|corp|company|group|services|solutions)\b/i.test(name);
  const noSpace = name.length > 0 && !name.includes(' ');
  return isCompany || noSpace;
});
console.log('Likely company/single-word names:', companyNames.length);

// Sample of company names
console.log('\nSample single-word/company names:');
companyNames.slice(0, 20).forEach(r => {
  console.log('  -', r['Full Name'], '|', r.Email, '| Sent:', r['Emails Sent']);
});

// Sample of no-response contacts
console.log('\nSample no-response contacts:');
noResponse.slice(0, 20).forEach(r => {
  console.log('  -', r['Full Name'], '|', r.Email);
});

// Calculate what would remain after both filters
const clean = data.filter(r => {
  // Must have sent emails to them
  const sent = r['Emails Sent'];
  const hasSent = sent !== undefined && sent !== null && sent !== '' && sent > 0;

  // Must have proper name (has space, not just company)
  const name = (r['Full Name'] || '').replace(/'/g, '').trim();
  const isCompany = /\b(inc|llc|corp|company|group|services|solutions)\b/i.test(name);
  const hasSpace = name.includes(' ');

  return hasSent && hasSpace && !isCompany;
});

console.log('\n=== SUMMARY ===');
console.log('Current total:', data.length);
console.log('After filtering:', clean.length, 'would remain');
console.log('Would remove:', data.length - clean.length);

// Preserve tagged ones
const taggedClean = clean.filter(r => r.TAG && r.TAG.trim());
console.log('\nTagged contacts that would remain:', taggedClean.length);

// Check if any tagged would be removed
const taggedRemoved = tagged.filter(r => {
  const sent = r['Emails Sent'];
  const hasSent = sent !== undefined && sent !== null && sent !== '' && sent > 0;
  const name = (r['Full Name'] || '').replace(/'/g, '').trim();
  const isCompany = /\b(inc|llc|corp|company|group|services|solutions)\b/i.test(name);
  const hasSpace = name.includes(' ');
  return !(hasSent && hasSpace && !isCompany);
});
console.log('Tagged contacts that WOULD BE REMOVED:', taggedRemoved.length);
if (taggedRemoved.length > 0) {
  console.log('\nTagged but would be filtered out:');
  taggedRemoved.forEach(r => {
    console.log('  -', r['Full Name'], '|', r.TAG, '| Sent:', r['Emails Sent']);
  });
}
