const fs = require('fs');
const XLSX = require('xlsx');

// Load existing contacts
const existing = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json', 'utf-8'));

// Load xlsx data
const workbook = XLSX.readFile('/mnt/c/Users/dyoun/Downloads/export_job_david_youngs_contacts_1.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const xlsxData = XLSX.utils.sheet_to_json(sheet);

let updated = 0;
let added = 0;
let alreadyHad = 0;

xlsxData.forEach(row => {
  if (!row['Contact Email']) return;

  const email = row['Contact Email'].toLowerCase().trim();
  const existingContact = existing.find(c => c.email.toLowerCase() === email);

  if (existingContact) {
    // Update existing contact with richer data
    if (row['Contact First Name']) existingContact.firstName = row['Contact First Name'];
    if (row['Contact Last Name']) existingContact.lastName = row['Contact Last Name'];
    if (row['Contact Mobile']) existingContact.phone = row['Contact Mobile'].toString();
    if (row['Contact User Address - Address1']) existingContact.address = row['Contact User Address - Address1'];
    if (row['Contact User Address - City']) existingContact.city = row['Contact User Address - City'];
    if (row['Contact User Address - State']) existingContact.state = row['Contact User Address - State'];
    if (row['Contact User Address - Zip']) existingContact.zip = row['Contact User Address - Zip'];

    // Loan data
    if (row['Product - Loan Amount']) {
      existingContact.loanAmount = row['Product - Loan Amount'];
      existingContact.loanRate = row['Product - Loan Rate'];
      existingContact.loanProduct = row['Product - Loan Product'];
      existingContact.nameConfidence = 'confirmed';
      existingContact.dataSource = 'xlsx-loan-data';
      updated++;
    } else {
      alreadyHad++;
    }
  } else {
    // Add new contact
    existing.push({
      email: row['Contact Email'],
      firstName: row['Contact First Name'] || '',
      lastName: row['Contact Last Name'] || '',
      phone: row['Contact Mobile'] ? row['Contact Mobile'].toString() : '',
      address: row['Contact User Address - Address1'] || '',
      city: row['Contact User Address - City'] || '',
      state: row['Contact User Address - State'] || '',
      zip: row['Contact User Address - Zip'] || '',
      loanAmount: row['Product - Loan Amount'] || '',
      loanRate: row['Product - Loan Rate'] || '',
      loanProduct: row['Product - Loan Product'] || '',
      nameConfidence: row['Contact First Name'] ? 'confirmed' : 'none',
      dataSource: 'xlsx-import'
    });
    added++;
  }
});

fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json', JSON.stringify(existing, null, 2));

console.log('='.repeat(60));
console.log('XLSX MERGE RESULTS');
console.log('='.repeat(60));
console.log('Updated with loan data: ' + updated);
console.log('Already had (no loan): ' + alreadyHad);
console.log('Added new contacts: ' + added);
console.log('NEW TOTAL CONTACTS: ' + existing.length);

// Summary by data source
const sources = {};
existing.forEach(c => {
  sources[c.dataSource || 'original'] = (sources[c.dataSource || 'original'] || 0) + 1;
});
console.log('\nBy data source:');
Object.entries(sources).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

// Count with loan data
const withLoan = existing.filter(c => c.loanAmount).length;
console.log('\nWith loan data: ' + withLoan);

// Confidence summary
const conf = {};
existing.forEach(c => {
  conf[c.nameConfidence || 'none'] = (conf[c.nameConfidence || 'none'] || 0) + 1;
});
console.log('\nBy name confidence:');
Object.entries(conf).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
