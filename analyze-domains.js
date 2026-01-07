const fs = require('fs');

// Load both contact sources
const pf = JSON.parse(fs.readFileSync('./data/priority-contacts.json'));
const on = JSON.parse(fs.readFileSync('./data/onenation-contacts-final.json'));

const pfContacts = pf.contacts || [];
const onContacts = on.contacts || [];

const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'icloud.com', 'outlook.com', 'me.com', 'msn.com', 'comcast.net', 'sbcglobal.net', 'att.net', 'verizon.net', 'live.com', 'ymail.com', 'rocketmail.com', 'bellsouth.net', 'cox.net', 'earthlink.net', 'charter.net', 'optonline.net', 'frontier.com', 'roadrunner.com', 'windstream.net'];

function analyzeDomains(contacts, sourceName) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + sourceName);
  console.log('='.repeat(60));
  console.log('Total contacts:', contacts.length);

  // Extract domains
  const domains = {};
  contacts.forEach(c => {
    const email = (c.email || c.name || '').toLowerCase();
    const match = email.match(/@([a-z0-9.-]+)/);
    if (match) {
      const domain = match[1];
      domains[domain] = (domains[domain] || 0) + 1;
    }
  });

  // Sort and display
  const sorted = Object.entries(domains).sort((a, b) => b[1] - a[1]);
  console.log('\nTop 25 domains:');
  sorted.slice(0, 25).forEach(([domain, count]) => {
    const pct = ((count / contacts.length) * 100).toFixed(1);
    let category = '';
    if (domain.includes('priorityfinancial') || domain.includes('onenation')) {
      category = ' [INTERNAL]';
    } else if (personalDomains.includes(domain)) {
      category = ' [PERSONAL]';
    } else if (domain.includes('title') || domain.includes('escrow') || domain.includes('firstam') || domain.includes('fidelity')) {
      category = ' [TITLE/ESCROW]';
    } else if (domain.includes('realty') || domain.includes('realtor') || domain.includes('realestate') || domain.includes('kw.com') || domain.includes('compass') || domain.includes('coldwell') || domain.includes('century21') || domain.includes('remax')) {
      category = ' [REALTOR]';
    }
    console.log('  ' + count.toString().padStart(4) + ' (' + pct.padStart(5) + '%)  ' + domain + category);
  });

  // Categorize counts
  let internalCount = 0;
  let personalCount = 0;
  let titleCount = 0;
  let realtorCount = 0;
  let otherBusinessCount = 0;

  sorted.forEach(([domain, count]) => {
    if (domain.includes('priorityfinancial') || domain.includes('onenation')) {
      internalCount += count;
    } else if (personalDomains.includes(domain)) {
      personalCount += count;
    } else if (domain.includes('title') || domain.includes('escrow') || domain.includes('firstam') || domain.includes('fidelity') || domain.includes('stewart') || domain.includes('oldrepublic')) {
      titleCount += count;
    } else if (domain.includes('realty') || domain.includes('realtor') || domain.includes('realestate') || domain.includes('kw.com') || domain.includes('compass') || domain.includes('coldwell') || domain.includes('century21') || domain.includes('remax') || domain.includes('bhhs') || domain.includes('sotheby')) {
      realtorCount += count;
    } else {
      otherBusinessCount += count;
    }
  });

  console.log('\n--- CATEGORY BREAKDOWN ---');
  console.log('  Internal (PFN/OneNation):  ' + internalCount.toString().padStart(5) + ' (' + ((internalCount/contacts.length)*100).toFixed(1) + '%)');
  console.log('  Personal (gmail, etc):     ' + personalCount.toString().padStart(5) + ' (' + ((personalCount/contacts.length)*100).toFixed(1) + '%)');
  console.log('  Title/Escrow companies:    ' + titleCount.toString().padStart(5) + ' (' + ((titleCount/contacts.length)*100).toFixed(1) + '%)');
  console.log('  Realtors:                  ' + realtorCount.toString().padStart(5) + ' (' + ((realtorCount/contacts.length)*100).toFixed(1) + '%)');
  console.log('  Other Business:            ' + otherBusinessCount.toString().padStart(5) + ' (' + ((otherBusinessCount/contacts.length)*100).toFixed(1) + '%)');

  return { domains: sorted, internalCount, personalCount, titleCount, realtorCount, otherBusinessCount };
}

// Analyze both sources
const pfResults = analyzeDomains(pfContacts, 'PRIORITY FINANCIAL');
const onResults = analyzeDomains(onContacts, 'ONE NATION');

// Combined summary
console.log('\n' + '='.repeat(60));
console.log('  COMBINED SUMMARY');
console.log('='.repeat(60));

const totalContacts = pfContacts.length + onContacts.length;
const totalInternal = pfResults.internalCount + onResults.internalCount;
const totalPersonal = pfResults.personalCount + onResults.personalCount;
const totalTitle = pfResults.titleCount + onResults.titleCount;
const totalRealtor = pfResults.realtorCount + onResults.realtorCount;
const totalOther = pfResults.otherBusinessCount + onResults.otherBusinessCount;

console.log('\nTotal contacts across both sources:', totalContacts);
console.log('\nRECOMMENDED ACTIONS:');
console.log('  EXCLUDE - Internal staff:    ' + totalInternal.toString().padStart(5));
console.log('  IMPORT  - Personal emails:   ' + totalPersonal.toString().padStart(5) + ' (likely borrowers/prospects)');
console.log('  IMPORT  - Title/Escrow:      ' + totalTitle.toString().padStart(5) + ' (tag as Vendor)');
console.log('  IMPORT  - Realtors:          ' + totalRealtor.toString().padStart(5) + ' (tag as Referral Partner)');
console.log('  REVIEW  - Other Business:    ' + totalOther.toString().padStart(5) + ' (needs manual review)');
console.log('\nNET IMPORTABLE:', (totalContacts - totalInternal));
