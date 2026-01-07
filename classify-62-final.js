const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/150-unknowns-classified.json'));
const unknowns = data.UNKNOWN;

const classified = {
  LO_RECRUIT: [],
  VENDOR: [],
  PERSONAL: [],
  REALTOR: [],
  DISCARD: []
};

// Manual classification based on subjects and domains
unknowns.forEach(c => {
  const email = c.email.toLowerCase();
  const domain = email.split('@')[1] || '';
  const subjects = (c.subjects || []).join(' ').toLowerCase();

  // LO RECRUITS - "Priority Hybrid Program", "Meet Priority Financial"
  if (subjects.includes('hybrid program') ||
      subjects.includes('meet priority') ||
      subjects.includes('hometown lenders - recruiting') ||
      domain.includes('movement.com') ||
      domain.includes('nafinc.com') ||
      domain.includes('rate.com') ||
      subjects.includes('loan officer recruiting')) {
    classified.LO_RECRUIT.push({ ...c, reason: 'Recruiting outreach' });
  }
  // VENDORS - software, title, services
  else if (domain.includes('simplenexus') ||
           domain.includes('floify') ||
           domain.includes('totalexpert') ||
           domain.includes('five9') ||
           domain.includes('toptal') ||
           domain.includes('arc.dev') ||
           domain.includes('linkedin.com') ||
           domain.includes('synthesia') ||
           domain.includes('dataaxle') ||
           domain.includes('brokerva') ||
           domain.includes('advancedhorizon') ||
           domain.includes('ice.com') ||
           domain.includes('mymove.com') ||
           domain.includes('ltic.com') ||
           domain.includes('ltgc.com') ||
           domain.includes('fnf.com') ||
           domain.includes('fpa.us') ||
           domain.includes('willowprocessing') ||
           domain.includes('exclusive.agency') ||
           domain.includes('shorewest.com') ||
           domain.includes('shabstract.com') ||
           subjects.includes('closing disclosure') ||
           subjects.includes('cd ')) {
    classified.VENDOR.push({ ...c, reason: 'Software/service vendor' });
  }
  // PERSONAL - non-business
  else if (domain.includes('cettire') ||
           domain.includes('metropolisderm') ||
           domain.includes('autonation') ||
           domain.includes('rtastore') ||
           domain.includes('edwardjones') ||
           domain.includes('meetauto') ||
           domain.includes('economyglassco') ||
           domain.includes('closetsbydesign') ||
           domain.includes('allstate') ||
           domain.includes('belfor') ||
           domain.includes('alacrityservices') ||
           domain.includes('oakwoodteam') ||
           domain.includes('woven.is') ||
           domain.includes('dfmfg.net') ||
           subjects.includes('dinner') ||
           subjects.includes('shipment') ||
           subjects.includes('claim #')) {
    classified.PERSONAL.push({ ...c, reason: 'Personal/non-business' });
  }
  // REALTOR/PARTNER
  else if (domain.includes('realconnect') ||
           domain.includes('zillow')) {
    classified.REALTOR.push({ ...c, reason: 'Real estate related' });
  }
  // DISCARD - misc services, unclear
  else if (domain.includes('airbnb') ||
           domain.includes('lacity.org') ||
           domain.includes('salesisacareer') ||
           domain.includes('pchcpa.com') ||
           domain.includes('chuckfarrar') ||
           domain.includes('globalecommerce')) {
    classified.DISCARD.push({ ...c, reason: 'Misc service, not contact' });
  }
  // Remaining - check subjects more
  else if (subjects.includes('new construction loan') || subjects.includes('figure')) {
    classified.VENDOR.push({ ...c, reason: 'Loan/business related' });
  }
  else {
    classified.DISCARD.push({ ...c, reason: 'Could not classify - discard' });
  }
});

console.log('=== FINAL CLASSIFICATION OF 62 UNKNOWNS ===\n');
Object.keys(classified).forEach(cat => {
  console.log(`${cat}: ${classified[cat].length}`);
  classified[cat].forEach(c => {
    console.log(`  ${c.email} - ${c.reason}`);
  });
  console.log('');
});

// Merge with previous results
const prev = JSON.parse(fs.readFileSync('data/150-unknowns-classified.json'));

// Add to existing categories
classified.LO_RECRUIT.forEach(c => prev.LO_RECRUIT.push(c));
classified.VENDOR.forEach(c => prev.VENDOR.push(c));
classified.PERSONAL.forEach(c => prev.PERSONAL.push(c));
classified.REALTOR.forEach(c => prev.REALTOR.push(c));

// Clear unknowns and add discards
prev.UNKNOWN = [];
prev.DISCARD = classified.DISCARD;

// Save merged
fs.writeFileSync('data/150-final-classified.json', JSON.stringify(prev, null, 2));

// Summary
console.log('=== FINAL TOTALS ===');
console.log('BORROWER:', prev.BORROWER.length);
console.log('VENDOR:', prev.VENDOR.length);
console.log('LO_RECRUIT:', prev.LO_RECRUIT.length);
console.log('REALTOR:', prev.REALTOR.length);
console.log('INTERNAL:', prev.INTERNAL.length);
console.log('PERSONAL:', prev.PERSONAL.length);
console.log('DISCARD:', prev.DISCARD.length);

// Create final CSV
let csv = 'Email,Name,Category,Reason,Sent,Received\n';
['BORROWER', 'VENDOR', 'LO_RECRUIT', 'REALTOR', 'INTERNAL', 'PERSONAL', 'DISCARD'].forEach(cat => {
  (prev[cat] || []).forEach(c => {
    csv += `"${c.email}","${c.name || ''}","${cat}","${c.reason || ''}","${c.sent || 0}","${c.received || 0}"\n`;
  });
});
fs.writeFileSync('data/150-final-classified.csv', csv);

console.log('\nSaved: data/150-final-classified.json');
console.log('Saved: data/150-final-classified.csv');
