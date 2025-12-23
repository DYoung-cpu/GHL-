/**
 * Check how many names actually match the email address
 */

const fs = require('fs');
const path = require('path');

const downloadsDir = '/mnt/c/Users/dyoun/Downloads';

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx] || '');
    results.push(row);
  }
  return results;
}

function checkNameMatch(firstName, lastName, email) {
  if (!email || !firstName) return { match: false, type: 'no_data' };

  const fn = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const ln = (lastName || '').toLowerCase().replace(/[^a-z]/g, '');
  const localPart = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');

  // Check if first name appears in email
  if (fn.length >= 3 && localPart.includes(fn)) {
    return { match: true, type: 'first_name_found' };
  }

  // Check if last name appears in email
  if (ln.length >= 3 && localPart.includes(ln)) {
    return { match: true, type: 'last_name_found' };
  }

  return { match: false, type: 'no_match' };
}

// Find all Paul Tropp files
const files = fs.readdirSync(downloadsDir).filter(f =>
  (f.includes('Leads-') || f.includes('Realtors') || f.includes('AdRoll')) &&
  f.endsWith('.csv') &&
  !f.includes('V2') &&
  !f.includes('parsed')
);

let totalContacts = 0;
let matchingNames = 0;
let nonMatchingNames = 0;
let examples = { matching: [], nonMatching: [] };

files.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(downloadsDir, file), 'utf-8');
    const contacts = parseCSV(content);

    contacts.forEach(c => {
      const firstName = c['first name'] || c['firstname'] || '';
      const lastName = c['last name'] || c['lastname'] || '';
      const email = c['email'] || '';

      if (!email) return;

      totalContacts++;
      const result = checkNameMatch(firstName, lastName, email);

      if (result.match) {
        matchingNames++;
        if (examples.matching.length < 5) {
          examples.matching.push({ firstName, lastName, email });
        }
      } else {
        nonMatchingNames++;
        if (examples.nonMatching.length < 10) {
          examples.nonMatching.push({ firstName, lastName, email });
        }
      }
    });
  } catch (e) {
    // Skip files with errors
  }
});

console.log('');
console.log('='.repeat(60));
console.log('  NAME vs EMAIL MATCH ANALYSIS');
console.log('='.repeat(60));
console.log('');
console.log(`  Total Contacts Checked: ${totalContacts.toLocaleString()}`);
console.log('');
console.log(`  Names MATCH email:     ${matchingNames.toLocaleString()} (${(matchingNames/totalContacts*100).toFixed(1)}%)`);
console.log(`  Names DON'T match:     ${nonMatchingNames.toLocaleString()} (${(nonMatchingNames/totalContacts*100).toFixed(1)}%)`);
console.log('');

if (examples.matching.length > 0) {
  console.log('  Examples where name MATCHES email:');
  examples.matching.forEach(e => {
    console.log(`    "${e.firstName} ${e.lastName}" → ${e.email}`);
  });
  console.log('');
}

console.log('  Examples where name DOES NOT match email:');
examples.nonMatching.forEach(e => {
  console.log(`    "${e.firstName} ${e.lastName}" → ${e.email}`);
});
console.log('');
console.log('='.repeat(60));
