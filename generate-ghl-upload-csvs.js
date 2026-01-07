const fs = require('fs');

// Load all classified data
const main = JSON.parse(fs.readFileSync('data/full-contact-status.json'));
const extra = JSON.parse(fs.readFileSync('data/150-final-classified.json'));

// Prepare upload data by tag
const uploads = {
  'borrower': [],
  'prospect': [],
  'lo-recruit': [],
  'client-lo': [],
  'vendor': [],
  'realtor': [],
  'priority-financial': []  // PFN internal - DO NOT EMAIL
};

// From main classification
main.notInGHL.client.forEach(c => {
  uploads['borrower'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: c.phone || '',
    tags: 'borrower'
  });
});

main.notInGHL.prospect.forEach(c => {
  uploads['prospect'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: c.phone || '',
    tags: 'prospect'
  });
});

main.notInGHL.loan_officer.forEach(c => {
  uploads['lo-recruit'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: c.phone || '',
    tags: 'lo-recruit',
    nmlsNumber: c.nmlsNumber || ''
  });
});

main.notInGHL.client_lo.forEach(c => {
  uploads['client-lo'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: c.phone || '',
    tags: 'client-lo'
  });
});

// PFN Internal - upload with priority-financial tag
main.notInGHL.internal.forEach(c => {
  uploads['priority-financial'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: c.phone || '',
    tags: 'priority-financial'
  });
});

// From extra 157 classification
extra.BORROWER.forEach(c => {
  uploads['borrower'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: '',
    tags: 'borrower'
  });
});

extra.LO_RECRUIT.forEach(c => {
  uploads['lo-recruit'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: '',
    tags: 'lo-recruit'
  });
});

extra.VENDOR.forEach(c => {
  uploads['vendor'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: '',
    tags: 'vendor'
  });
});

extra.REALTOR.forEach(c => {
  uploads['realtor'].push({
    email: c.email,
    firstName: (c.name || '').split(' ')[0] || '',
    lastName: (c.name || '').split(' ').slice(1).join(' ') || '',
    phone: '',
    tags: 'realtor'
  });
});

// Create individual CSVs per tag
const outputDir = '/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

Object.keys(uploads).forEach(tag => {
  const contacts = uploads[tag];
  if (contacts.length === 0) return;

  let csv = 'Email,First Name,Last Name,Phone,Tags\n';
  contacts.forEach(c => {
    // Clean up names - remove quotes and special chars
    const firstName = (c.firstName || '').replace(/['"]/g, '').trim();
    const lastName = (c.lastName || '').replace(/['"]/g, '').trim();
    csv += `"${c.email}","${firstName}","${lastName}","${c.phone || ''}","${c.tags}"\n`;
  });

  fs.writeFileSync(`${outputDir}/${tag}.csv`, csv);
  console.log(`${tag}.csv - ${contacts.length} contacts`);
});

// Create master CSV with all contacts
let masterCsv = 'Email,First Name,Last Name,Phone,Tags\n';
let totalCount = 0;

Object.keys(uploads).forEach(tag => {
  uploads[tag].forEach(c => {
    const firstName = (c.firstName || '').replace(/['"]/g, '').trim();
    const lastName = (c.lastName || '').replace(/['"]/g, '').trim();
    masterCsv += `"${c.email}","${firstName}","${lastName}","${c.phone || ''}","${c.tags}"\n`;
    totalCount++;
  });
});

fs.writeFileSync(`${outputDir}/ALL-CONTACTS-MASTER.csv`, masterCsv);

console.log('\n=== SUMMARY ===');
console.log('Output directory:', outputDir);
console.log('');
Object.keys(uploads).forEach(tag => {
  console.log(`  ${tag}: ${uploads[tag].length}`);
});
console.log('  ─────────────────────');
console.log(`  TOTAL: ${totalCount} contacts`);
console.log('');
console.log('Files created:');
Object.keys(uploads).forEach(tag => {
  if (uploads[tag].length > 0) {
    console.log(`  - ${tag}.csv`);
  }
});
console.log('  - ALL-CONTACTS-MASTER.csv');
