/**
 * Merge OneNation + Priority contacts and export to CSV for review
 */

const fs = require('fs');

// Load both sources
const onenation = require('./data/onenation-contacts-final.json');
const priority = require('./data/priority-contacts.json');

console.log('=== MERGING CONTACTS ===');
console.log('OneNation: ' + onenation.contacts.length + ' contacts');
console.log('Priority: ' + priority.contacts.length + ' contacts');

// Merge into a single map by email
const merged = new Map();

// Add OneNation contacts first
onenation.contacts.forEach(c => {
  merged.set(c.email.toLowerCase(), {
    email: c.email,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    fullName: c.fullName || '',
    phone: c.phone || '',
    occurrences: c.occurrences || 0,
    source: 'OneNation',
    onenationSent: c.sentTo || 0,
    onenationReceived: c.receivedFrom || 0,
    prioritySent: 0,
    priorityReceived: 0
  });
});

// Merge Priority contacts
priority.contacts.forEach(c => {
  const email = c.email.toLowerCase();
  if (merged.has(email)) {
    // Update existing
    const existing = merged.get(email);
    existing.source = 'Both';
    existing.prioritySent = c.sentTo || 0;
    existing.priorityReceived = c.receivedFrom || 0;
    existing.occurrences += c.occurrences;
    // Update name if we have better info
    if (existing.firstName === '' && c.firstName) existing.firstName = c.firstName;
    if (existing.lastName === '' && c.lastName) existing.lastName = c.lastName;
    if (existing.fullName === '' && c.fullName) existing.fullName = c.fullName;
  } else {
    // Add new
    merged.set(email, {
      email: email,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      fullName: c.fullName || '',
      phone: '',
      occurrences: c.occurrences || 0,
      source: 'Priority',
      onenationSent: 0,
      onenationReceived: 0,
      prioritySent: c.sentTo || 0,
      priorityReceived: c.receivedFrom || 0
    });
  }
});

console.log('Merged total: ' + merged.size + ' unique contacts');

// Convert to array and calculate totals
const contacts = Array.from(merged.values()).map(c => ({
  ...c,
  totalSent: (c.onenationSent || 0) + (c.prioritySent || 0),
  totalReceived: (c.onenationReceived || 0) + (c.priorityReceived || 0),
  domain: c.email.split('@')[1]
}));

// Sort by total sent (people David actually emailed most)
contacts.sort((a, b) => b.totalSent - a.totalSent);

// Categorize domains
const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'me.com', 'msn.com', 'sbcglobal.net', 'att.net', 'verizon.net', 'comcast.net'];
const mortgageKeywords = ['mortgage', 'lending', 'loan', 'financial', 'bank', 'credit', 'home', 'realty', 'rate.com', 'quicken', 'movement', 'guild', 'fairway', 'cardinal', 'homebridge', 'loandepot', 'mrcooper', 'ccm.com', 'cmgfi', 'nafinc', 'atlanticbay', 'boh.com', 'lennar', 'empire', 'motto', 'apmortgage'];
const titleKeywords = ['title', 'escrow', 'ticor', 'firstam', 'fidelity', 'stewart', 'chicago', 'oldrepublic', 'boston'];
const internalDomains = ['priorityfinancial.net', 'onenationhomeloans.com', 'lendwisemtg.com'];

contacts.forEach(c => {
  const domain = c.domain.toLowerCase();

  if (internalDomains.some(d => domain === d)) {
    c.category = 'Internal/Colleague';
  } else if (personalDomains.some(d => domain === d)) {
    c.category = 'Personal - Likely Client';
  } else if (titleKeywords.some(k => domain.includes(k))) {
    c.category = 'Title/Escrow';
  } else if (mortgageKeywords.some(k => domain.includes(k))) {
    c.category = 'Mortgage Industry';
  } else {
    c.category = 'Business/Other';
  }
});

// Create CSV with BOM for Excel
let csv = '\uFEFFInclude (Y/N),Category,First Name,Last Name,Email,Phone,Domain,Total Sent,Total Received,Source,OneNation Sent,OneNation Rcvd,Priority Sent,Priority Rcvd\n';

contacts.forEach(c => {
  const firstName = (c.firstName || '').replace(/["',\n\r]/g, '').trim();
  const lastName = (c.lastName || '').replace(/["',\n\r]/g, '').trim();
  const phone = (c.phone || '').replace(/["',]/g, '');

  csv += `,"${c.category}","${firstName}","${lastName}","${c.email}","${phone}","${c.domain}",${c.totalSent},${c.totalReceived},"${c.source}",${c.onenationSent},${c.onenationReceived},${c.prioritySent},${c.priorityReceived}\n`;
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', csv);

// Stats
const personal = contacts.filter(c => c.category === 'Personal - Likely Client').length;
const mortgage = contacts.filter(c => c.category === 'Mortgage Industry').length;
const title = contacts.filter(c => c.category === 'Title/Escrow').length;
const internal = contacts.filter(c => c.category === 'Internal/Colleague').length;
const other = contacts.filter(c => c.category === 'Business/Other').length;

console.log('\n=== CATEGORIES ===');
console.log('Personal (likely clients): ' + personal);
console.log('Mortgage Industry: ' + mortgage);
console.log('Title/Escrow: ' + title);
console.log('Internal/Colleague: ' + internal);
console.log('Business/Other: ' + other);
console.log('\nSaved to: C:\\Users\\dyoun\\Downloads\\all-contacts-review.csv');
console.log('\nOpen in Excel, mark Y in column A for contacts you want to import.');
