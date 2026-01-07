const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/llm-realtor-classification.json'));

// Create realtor CSV
let csv = 'Email,First Name,Last Name,Phone,Tags\n';

data.REALTOR.forEach(c => {
  const parts = (c.name || '').split(' ');
  const firstName = (parts[0] || '').replace(/['"]/g, '');
  const lastName = (parts.slice(1).join(' ') || '').replace(/['"]/g, '');
  csv += `"${c.email}","${firstName}","${lastName}","","realtor"\n`;
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready/realtor.csv', csv);
console.log('Updated realtor.csv with', data.REALTOR.length, 'confirmed realtors');

// Also update master CSV - remove old realtors, add new ones
const master = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready/ALL-CONTACTS-MASTER.csv', 'utf8');
const lines = master.split('\n');

// Remove any existing realtor tagged contacts
const nonRealtors = lines.filter((line, i) => {
  if (i === 0) return true; // keep header
  if (!line.trim()) return false; // skip empty lines
  return line.indexOf(',"realtor"') === -1;
});

// Add new realtors
data.REALTOR.forEach(c => {
  const parts = (c.name || '').split(' ');
  const firstName = (parts[0] || '').replace(/['"]/g, '');
  const lastName = (parts.slice(1).join(' ') || '').replace(/['"]/g, '');
  nonRealtors.push(`"${c.email}","${firstName}","${lastName}","","realtor"`);
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready/ALL-CONTACTS-MASTER.csv', nonRealtors.join('\n'));
console.log('Updated ALL-CONTACTS-MASTER.csv');

// Also regenerate SAFE-IMPORT
const safeLines = nonRealtors.map((line, i) => {
  if (i === 0) return 'Email,First Name,Last Name,Phone,Original_Tag';
  return line;
});
fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready/SAFE-IMPORT-NO-TRIGGERS.csv', safeLines.join('\n'));
console.log('Updated SAFE-IMPORT-NO-TRIGGERS.csv');

// Summary
console.log('\n=== CLASSIFICATION SUMMARY ===');
console.log('REALTOR:', data.REALTOR.length);
console.log('SPAM:', data.SPAM.length, '(not added to upload)');
console.log('VENDOR:', data.VENDOR.length, '(check if already in vendor list)');
console.log('LO_RECRUIT:', data.LO_RECRUIT.length, '(check if already in lo-recruit list)');
