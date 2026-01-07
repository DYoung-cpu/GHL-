/**
 * Parse names from email addresses when missing
 */

const fs = require('fs');

const csv = fs.readFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', 'utf-8');
const lines = csv.split('\n');
const header = lines[0];

let fixed = 0;
let alreadyHadName = 0;

function parseNameFromEmail(email) {
  const local = email.split('@')[0];

  // Common patterns:
  // j.briggle -> J Briggle
  // carlos.nunez -> Carlos Nunez
  // jbriggle -> J Briggle (if no separator)
  // john_doe -> John Doe
  // john-doe -> John Doe

  // Split by . _ or -
  let parts = local.split(/[._-]/);

  if (parts.length >= 2) {
    // j.briggle or carlos.nunez
    let firstName = parts[0];
    let lastName = parts.slice(1).join(' ');

    // Capitalize
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    lastName = lastName.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

    return { firstName, lastName };
  } else if (parts.length === 1) {
    // Try to split camelCase or find pattern like "jbriggle"
    const name = parts[0];

    // Check for numbers at end (like tino.loans or young123)
    const cleanName = name.replace(/[0-9]+$/, '');

    // If single word, use as first name
    if (cleanName.length > 0) {
      const firstName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
      return { firstName, lastName: '' };
    }
  }

  return { firstName: '', lastName: '' };
}

const newLines = [header];

lines.slice(1).forEach(line => {
  if (line.trim() === '') return;

  const parts = line.split(',');
  let firstName = (parts[2] || '').replace(/"/g, '').trim();
  let lastName = (parts[3] || '').replace(/"/g, '').trim();
  const email = (parts[4] || '').replace(/"/g, '').toLowerCase();

  // If missing name, parse from email
  if ((!firstName || !lastName) && email) {
    const parsed = parseNameFromEmail(email);

    if (!firstName && parsed.firstName) {
      firstName = parsed.firstName;
      fixed++;
    }
    if (!lastName && parsed.lastName) {
      lastName = parsed.lastName;
    }
  } else {
    alreadyHadName++;
  }

  // Update parts
  parts[2] = '"' + firstName + '"';
  parts[3] = '"' + lastName + '"';

  newLines.push(parts.join(','));
});

fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/all-contacts-review.csv', newLines.join('\n'));

console.log('=== NAME PARSING COMPLETE ===');
console.log('Already had names: ' + alreadyHadName);
console.log('Names parsed from email: ' + fixed);
console.log('Total contacts: ' + (newLines.length - 1));

// Show sample of parsed names
console.log('\n=== SAMPLE OF PARSED NAMES ===');
const samples = [
  'j.briggle@s3homeloans.com',
  'carlos.nunez@elitechoicetx.com',
  'shanae@theprimemtg.com',
  'beatriz@nuhomegroup.com',
  'koi.woods@htlenders.com',
  'pam@imctx.com',
  'tino.loans@gmail.com'
];

samples.forEach(email => {
  const parsed = parseNameFromEmail(email);
  console.log(email + ' -> ' + parsed.firstName + ' ' + parsed.lastName);
});
