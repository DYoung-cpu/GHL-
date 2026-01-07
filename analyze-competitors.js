const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/pfn-contact-separation.json'));

// Competitor mortgage domains
const competitorDomains = [
  'movement.com', 'rate.com', 'quickenloans.com', 'ccm.com', 'fairwaymc.com',
  'atlanticbay.com', 'nafinc.com', 'guildmortgage.net', 'loandepot.com',
  'lennarmortgage.com', 'empirehomeloans.com', 'cardinalfinancial.com',
  'homebridge.com', 'academymortgage.com', 'mrcooper.com', 'apmortgage.com',
  'rocketmortgage.com', 'dhimortgage.com', 'alcova.com', 'nexamortgage.com',
  'phmloans.com', 'cmgfi.com', 'mottomortgage.com', '1asmc.com', 'primerica.com',
  'imctx.com', 'newrez.com', 'pennymac.com', 'caliberhomeloans.com',
  'freedommortgage.com', 'uwm.com', 'flagstar.com', 'loanpal.com',
  'bigpurpledot.com', 'bigpurpledot.zendesk.com'
];

// Analyze competitor contacts
const recruits = [];
const spam = [];
const uncertain = [];
const borrowers = [];

data.cleanForGHL.fromPriority.forEach(c => {
  const domain = (c.email || '').split('@')[1] || '';
  const isCompetitor = competitorDomains.some(d => domain.includes(d));

  const sentTo = c.sentTo || 0;
  const receivedFrom = c.receivedFrom || 0;

  if (!isCompetitor) {
    borrowers.push(c);
    return;
  }

  if (sentTo >= 3) {
    // You sent them 3+ emails = likely recruiting
    recruits.push({ ...c, domain, sentTo, receivedFrom, reason: 'You sent 3+ emails' });
  } else if (sentTo === 0 && receivedFrom > 0) {
    // Only received from them = likely spam
    spam.push({ ...c, domain, sentTo, receivedFrom, reason: 'Only received, never sent' });
  } else {
    // 1-2 sent = uncertain
    uncertain.push({ ...c, domain, sentTo, receivedFrom, reason: 'Low engagement' });
  }
});

console.log('=== LIKELY RECRUITS (You emailed them 3+ times) ===');
console.log('Count:', recruits.length);
recruits.slice(0, 20).forEach(c => {
  console.log(`  ${c.fullName || c.email} (${c.domain}) - sent:${c.sentTo} rcvd:${c.receivedFrom}`);
});
if (recruits.length > 20) console.log(`  ... and ${recruits.length - 20} more`);

console.log('\n=== LIKELY SPAM (Only received from them) ===');
console.log('Count:', spam.length);
spam.slice(0, 20).forEach(c => {
  console.log(`  ${c.fullName || c.email} (${c.domain}) - sent:${c.sentTo} rcvd:${c.receivedFrom}`);
});
if (spam.length > 20) console.log(`  ... and ${spam.length - 20} more`);

console.log('\n=== UNCERTAIN (1-2 emails sent) ===');
console.log('Count:', uncertain.length);
uncertain.slice(0, 10).forEach(c => {
  console.log(`  ${c.fullName || c.email} (${c.domain}) - sent:${c.sentTo} rcvd:${c.receivedFrom}`);
});

console.log('\n=== BORROWERS/OTHER (Non-competitor domains) ===');
console.log('Count:', borrowers.length);

// Save categorization
fs.writeFileSync('data/competitor-analysis.json', JSON.stringify({
  recruits, spam, uncertain,
  summary: {
    recruits: recruits.length,
    spam: spam.length,
    uncertain: uncertain.length,
    borrowers: borrowers.length
  }
}, null, 2));

// Create final clean list (borrowers only, no spam)
const finalClean = [...borrowers, ...data.cleanForGHL.fromOneNation];

// Create CSV for final upload
let csv = 'Email,First Name,Last Name,Phone,Source,Category\n';
finalClean.forEach(c => {
  const parts = (c.fullName || '').split(' ');
  const firstName = c.firstName || parts[0] || '';
  const lastName = c.lastName || parts.slice(1).join(' ') || '';
  csv += `"${c.email}","${firstName}","${lastName}","${c.phone || ''}","${c.source || 'Priority/OneNation'}","Borrower"\n`;
});
fs.writeFileSync('data/borrowers-only-for-ghl.csv', csv);

// Create CSV for recruits (separate tag)
let recruitCsv = 'Email,First Name,Last Name,Company,Sent Count,Source\n';
recruits.forEach(c => {
  const parts = (c.fullName || '').split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  recruitCsv += `"${c.email}","${firstName}","${lastName}","${c.domain}","${c.sentTo}","Recruit"\n`;
});
fs.writeFileSync('data/recruits-for-ghl.csv', recruitCsv);

// Create spam list
let spamCsv = 'Email,Name,Domain,Received Count\n';
spam.forEach(c => {
  spamCsv += `"${c.email}","${c.fullName || ''}","${c.domain}","${c.receivedFrom}"\n`;
});
fs.writeFileSync('data/spam-do-not-upload.csv', spamCsv);

console.log('\n=== FILES CREATED ===');
console.log('data/borrowers-only-for-ghl.csv - Clean borrowers for GHL');
console.log('data/recruits-for-ghl.csv - LO recruits (tag separately)');
console.log('data/spam-do-not-upload.csv - Spam to discard');
console.log('data/competitor-analysis.json - Full analysis');

console.log('\n=== FINAL SUMMARY ===');
console.log(JSON.stringify({
  pfnInternal: 196,
  borrowers: borrowers.length,
  recruits: recruits.length,
  spam: spam.length,
  uncertain: uncertain.length,
  oneNation: data.cleanForGHL.fromOneNation.length,
  totalForGHL: finalClean.length + recruits.length
}, null, 2));
