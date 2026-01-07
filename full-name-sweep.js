/**
 * FULL NAME EXTRACTION SWEEP
 * Process ALL contacts and extract real names from email addresses
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

function extractNameFromEmail(email) {
  if (!email || !email.includes('@')) return null;

  const localPart = email.split('@')[0].toLowerCase();

  // Skip emails that are clearly not names
  if (localPart.length < 3) return null;
  if (/^\d+$/.test(localPart)) return null;
  if (/^(info|admin|sales|contact|support|hello|office|team)/.test(localPart)) return null;

  // Pattern 1: firstname.lastname@
  if (localPart.includes('.')) {
    const parts = localPart.split('.');
    if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      // Filter out numbers and short segments
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2 && !/^\d/.test(parts[0]) && !/^\d/.test(parts[1])) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'high',
          pattern: 'firstname.lastname'
        };
      }
    }
  }

  // Pattern 2: firstname_lastname@
  if (localPart.includes('_')) {
    const parts = localPart.split('_');
    if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'high',
          pattern: 'firstname_lastname'
        };
      }
    }
  }

  // Pattern 3: firstname-lastname@
  if (localPart.includes('-')) {
    const parts = localPart.split('-');
    if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2 && !/\d/.test(parts[0])) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'medium',
          pattern: 'firstname-lastname'
        };
      }
    }
  }

  // Pattern 4: firstnamelastname@ (camelCase detection or known patterns)
  // Look for capital letter in middle or common name patterns
  const cleaned = localPart.replace(/[^a-z]/g, '');

  // Check for common first names at start
  const commonFirstNames = ['michael', 'david', 'john', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles',
    'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
    'jennifer', 'linda', 'patricia', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy',
    'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy',
    'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen',
    'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha',
    'brian', 'kevin', 'jason', 'jeff', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
    'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory',
    'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam',
    'doug', 'douglas', 'nathan', 'henry', 'peter', 'kyle', 'zachary', 'noah', 'ethan', 'jeremy',
    'walter', 'christian', 'keith', 'roger', 'terry', 'carl', 'sean', 'austin', 'arthur', 'lawrence',
    'jesse', 'dylan', 'bryan', 'joe', 'jordan', 'billy', 'bruce', 'albert', 'willie', 'gabriel',
    'mary', 'maria', 'catherine', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia',
    'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea',
    'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn',
    'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise', 'amber', 'doris',
    'marilyn', 'danielle', 'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie',
    'kayla', 'alexis', 'lori', 'chris', 'mike', 'jim', 'bob', 'bill', 'tom', 'steve', 'dan', 'matt', 'rob', 'tony',
    'nick', 'rick', 'tim', 'joe', 'sam', 'ben', 'ken', 'don', 'ron', 'ed', 'al', 'ray', 'lee', 'jay',
    'sue', 'ann', 'beth', 'kate', 'jane', 'kim', 'lynn', 'jean', 'joy', 'pat', 'kay', 'jo', 'meg'];

  for (const firstName of commonFirstNames) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const lastName = cleaned.substring(firstName.length);
      if (lastName.length >= 2 && /^[a-z]+$/.test(lastName)) {
        return {
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          confidence: 'medium',
          pattern: 'firstnamelastname'
        };
      }
    }
  }

  // Pattern 5: flastname@ (first initial + last name)
  if (cleaned.length >= 4 && /^[a-z][a-z]{3,}$/.test(cleaned)) {
    // Check if it could be initial + lastname
    const potentialLastName = cleaned.substring(1);
    if (potentialLastName.length >= 3) {
      return {
        firstName: cleaned.charAt(0).toUpperCase() + '.',
        lastName: potentialLastName.charAt(0).toUpperCase() + potentialLastName.slice(1),
        confidence: 'low',
        pattern: 'flastname'
      };
    }
  }

  return null;
}

// Find all source files
const files = fs.readdirSync(downloadsDir).filter(f =>
  (f.includes('Leads-') || f.includes('Realtors') || f.includes('AdRoll') || f.startsWith('CA-') || f.startsWith('AZ-')) &&
  f.endsWith('.csv') &&
  !f.includes('V2') &&
  !f.includes('V3') &&
  !f.includes('parsed') &&
  !f.includes('enriched')
);

console.log('');
console.log('='.repeat(65));
console.log('  FULL NAME EXTRACTION SWEEP');
console.log('='.repeat(65));
console.log('');
console.log('  Processing files:');
files.forEach(f => console.log('    - ' + f));
console.log('');

let totalContacts = 0;
let extracted = { high: 0, medium: 0, low: 0 };
let notExtracted = 0;
let byPattern = {};
let examples = { extracted: [], notExtracted: [] };

const allContacts = [];

files.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(downloadsDir, file), 'utf-8');
    const contacts = parseCSV(content);

    contacts.forEach(c => {
      const email = c['email'] || '';
      if (!email || !email.includes('@')) return;

      totalContacts++;

      const result = extractNameFromEmail(email);

      if (result) {
        extracted[result.confidence]++;
        byPattern[result.pattern] = (byPattern[result.pattern] || 0) + 1;

        if (examples.extracted.length < 15) {
          examples.extracted.push({
            email,
            firstName: result.firstName,
            lastName: result.lastName,
            confidence: result.confidence,
            pattern: result.pattern
          });
        }

        allContacts.push({
          ...c,
          extractedFirst: result.firstName,
          extractedLast: result.lastName,
          nameConfidence: result.confidence
        });
      } else {
        notExtracted++;

        if (examples.notExtracted.length < 10) {
          examples.notExtracted.push(email);
        }

        allContacts.push({
          ...c,
          extractedFirst: '',
          extractedLast: '',
          nameConfidence: 'none'
        });
      }
    });
  } catch (e) {
    console.log('  Error processing: ' + file);
  }
});

const totalExtracted = extracted.high + extracted.medium + extracted.low;

console.log('  RESULTS');
console.log('  ' + '-'.repeat(60));
console.log('');
console.log(`  Total Contacts Processed:  ${totalContacts.toLocaleString()}`);
console.log('');
console.log('  NAMES EXTRACTED:');
console.log(`    High Confidence:         ${extracted.high.toLocaleString()} (${(extracted.high/totalContacts*100).toFixed(1)}%)`);
console.log(`    Medium Confidence:       ${extracted.medium.toLocaleString()} (${(extracted.medium/totalContacts*100).toFixed(1)}%)`);
console.log(`    Low Confidence:          ${extracted.low.toLocaleString()} (${(extracted.low/totalContacts*100).toFixed(1)}%)`);
console.log('  ' + '-'.repeat(40));
console.log(`    TOTAL EXTRACTED:         ${totalExtracted.toLocaleString()} (${(totalExtracted/totalContacts*100).toFixed(1)}%)`);
console.log('');
console.log(`  NOT EXTRACTABLE:           ${notExtracted.toLocaleString()} (${(notExtracted/totalContacts*100).toFixed(1)}%)`);
console.log('');
console.log('  BY PATTERN:');
Object.entries(byPattern).sort((a,b) => b[1] - a[1]).forEach(([pattern, count]) => {
  console.log(`    ${pattern.padEnd(20)} ${count.toLocaleString()}`);
});
console.log('');
console.log('  EXAMPLES - Names Extracted:');
examples.extracted.slice(0, 10).forEach(e => {
  console.log(`    ${e.email}`);
  console.log(`      → ${e.firstName} ${e.lastName} (${e.confidence})`);
});
console.log('');
console.log('  EXAMPLES - Could NOT Extract:');
examples.notExtracted.forEach(e => {
  console.log(`    ${e}`);
});
console.log('');
console.log('='.repeat(65));

// Save summary to JSON
const summary = {
  totalContacts,
  extracted: totalExtracted,
  extractedHigh: extracted.high,
  extractedMedium: extracted.medium,
  extractedLow: extracted.low,
  notExtracted,
  percentExtracted: (totalExtracted/totalContacts*100).toFixed(1),
  percentNotExtracted: (notExtracted/totalContacts*100).toFixed(1)
};

fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/name-extraction-summary.json', JSON.stringify(summary, null, 2));
console.log('');
console.log('  Summary saved to: name-extraction-summary.json');
console.log('');
