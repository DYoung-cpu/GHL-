const fs = require('fs');

// Load all contact sources
const priorityContacts = JSON.parse(fs.readFileSync('data/priority-contacts.json', 'utf8'));
const onenationContacts = JSON.parse(fs.readFileSync('data/onenation-contacts-final.json', 'utf8'));

// PFN domains to exclude from GHL upload
const pfnDomains = [
  'priorityfinancial.net',
  'priorityfinancial.com',
  'pfn.com'
];

// Known PFN internal people (even if using personal email)
const pfnPeopleEmails = [
  'marcshenkman',
  'brendaperry',
  'bryancampbell',
  'anthonyamini',
  'justinholland',
  'albertomartinez',
  'harrygatewood',
  'aaronjensen',
  'valentinespinoza'
];

function isPFNContact(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();

  // Check domain
  if (pfnDomains.some(d => emailLower.includes(d))) return true;

  // Check known PFN people
  const localPart = emailLower.split('@')[0].replace(/[._-]/g, '');
  if (pfnPeopleEmails.some(p => localPart.includes(p))) return true;

  return false;
}

// Process Priority Financial contacts
console.log('=== PRIORITY FINANCIAL CONTACTS ===');
console.log(`Total extracted: ${priorityContacts.uniqueContacts}`);

const pfnInternal = [];
const pfnClean = [];

priorityContacts.contacts.forEach(c => {
  if (isPFNContact(c.email)) {
    pfnInternal.push({
      email: c.email,
      name: c.fullName,
      reason: 'PFN email domain or known PFN person',
      occurrences: c.occurrences
    });
  } else {
    pfnClean.push(c);
  }
});

console.log(`PFN Internal (DO NOT EMAIL): ${pfnInternal.length}`);
console.log(`Clean for GHL: ${pfnClean.length}`);

// Process One Nation contacts
console.log('\n=== ONE NATION CONTACTS ===');
console.log(`Total: ${onenationContacts.totalContacts}`);

const onInternal = [];
const onClean = [];

onenationContacts.contacts.forEach(c => {
  if (isPFNContact(c.email)) {
    onInternal.push({
      email: c.email,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      reason: 'PFN email found in One Nation data'
    });
  } else {
    onClean.push(c);
  }
});

console.log(`PFN Internal found: ${onInternal.length}`);
console.log(`Clean for GHL: ${onClean.length}`);

// Show PFN internal contacts
console.log('\n=== PFN INTERNAL CONTACTS (DO NOT EMAIL) ===');
console.log('From Priority Financial mbox:');
pfnInternal.slice(0, 30).forEach(c => {
  console.log(`  ${c.email} - ${c.name} (${c.occurrences} occurrences)`);
});
if (pfnInternal.length > 30) {
  console.log(`  ... and ${pfnInternal.length - 30} more`);
}

if (onInternal.length > 0) {
  console.log('\nFrom One Nation (PFN crossover):');
  onInternal.forEach(c => {
    console.log(`  ${c.email} - ${c.name}`);
  });
}

// Save results
const results = {
  summary: {
    priorityTotal: priorityContacts.uniqueContacts,
    priorityPFNInternal: pfnInternal.length,
    priorityClean: pfnClean.length,
    onenationTotal: onenationContacts.totalContacts,
    onenationPFNInternal: onInternal.length,
    onenationClean: onClean.length,
    totalPFNToExclude: pfnInternal.length + onInternal.length,
    totalCleanForGHL: pfnClean.length + onClean.length
  },
  pfnInternalContacts: [...pfnInternal, ...onInternal],
  cleanForGHL: {
    fromPriority: pfnClean,
    fromOneNation: onClean
  }
};

fs.writeFileSync('data/pfn-contact-separation.json', JSON.stringify(results, null, 2));

// Create CSV of PFN internal contacts for reference
let csv = 'Email,Name,Source,Reason\n';
pfnInternal.forEach(c => {
  csv += `"${c.email}","${c.name}","Priority Financial","${c.reason}"\n`;
});
onInternal.forEach(c => {
  csv += `"${c.email}","${c.name}","One Nation","${c.reason}"\n`;
});
fs.writeFileSync('data/pfn-internal-do-not-email.csv', csv);

// Create CSV of clean contacts for GHL
let cleanCsv = 'Email,First Name,Last Name,Phone,Source\n';
pfnClean.forEach(c => {
  const parts = (c.fullName || '').split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  cleanCsv += `"${c.email}","${firstName}","${lastName}","${c.phone || ''}","Priority Financial"\n`;
});
onClean.forEach(c => {
  cleanCsv += `"${c.email}","${c.firstName || ''}","${c.lastName || ''}","${c.phone || ''}","One Nation"\n`;
});
fs.writeFileSync('data/clean-contacts-for-ghl.csv', cleanCsv);

console.log('\n=== FILES CREATED ===');
console.log('data/pfn-contact-separation.json - Full analysis');
console.log('data/pfn-internal-do-not-email.csv - PFN contacts to EXCLUDE');
console.log('data/clean-contacts-for-ghl.csv - Safe to upload to GHL');

console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results.summary, null, 2));
