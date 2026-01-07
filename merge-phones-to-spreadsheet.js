/**
 * Merge extracted phone numbers into the contact spreadsheet
 */

const XLSX = require('xlsx');
const fs = require('fs');

const INPUT_PATH = '/mnt/c/Users/dyoun/Downloads/Updated.xlsx';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/Downloads/Contacts-WITH-PHONES.xlsx';

// Load extracted phones
const extractedPhones = JSON.parse(fs.readFileSync('./data/extracted-phones.json'));

// Valid area codes (US)
function isValidPhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return false;

  // Area code can't start with 0 or 1
  if (digits[0] === '0' || digits[0] === '1') return false;

  // Can't be all zeros or obvious fake
  if (digits === '0000000000') return false;
  if (/^(\d)\1{9}$/.test(digits)) return false; // all same digit

  return true;
}

// Format phone
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
}

console.log('='.repeat(60));
console.log('  MERGING PHONE NUMBERS INTO SPREADSHEET');
console.log('='.repeat(60));

// Read spreadsheet
const wb = XLSX.readFile(INPUT_PATH);
const ws = wb.Sheets['Contacts'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('\nOriginal contacts:', data.length);

// Count how many have phones
let hadPhone = 0;
let addedPhone = 0;

// Merge phones
data.forEach(row => {
  const email = (row.Email || '').toLowerCase();

  // Already has valid phone?
  if (row.Phone && isValidPhone(row.Phone)) {
    hadPhone++;
    return;
  }

  // Look up in extracted data
  const extracted = extractedPhones[email];
  if (extracted && extracted.phones && extracted.phones.length > 0) {
    // Find first valid phone
    for (const phone of extracted.phones) {
      if (isValidPhone(phone)) {
        row.Phone = formatPhone(phone);
        addedPhone++;
        break;
      }
    }
  }
});

console.log('Already had valid phone:', hadPhone);
console.log('Added phone from emails:', addedPhone);
console.log('Total with phones now:', hadPhone + addedPhone);

// Write new spreadsheet
const newWs = XLSX.utils.json_to_sheet(data);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newWs, 'Contacts');
XLSX.writeFile(newWb, OUTPUT_PATH);

console.log('\nSaved to:', OUTPUT_PATH);
