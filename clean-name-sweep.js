/**
 * CLEAN NAME EXTRACTION - High & Medium confidence only
 * No junk "first initial + rest" patterns
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

// Common first names for detection
const commonFirstNames = new Set([
  'michael', 'david', 'john', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles',
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
  'nick', 'rick', 'tim', 'sam', 'ben', 'ken', 'don', 'ron', 'ed', 'ray', 'lee', 'jay',
  'sue', 'beth', 'kate', 'jane', 'kim', 'lynn', 'joy', 'pat', 'kay', 'jo', 'meg',
  'sherry', 'penny', 'glenn', 'suzanne', 'jeff', 'ron', 'patricia', 'natalie', 'lily', 'jameson',
  'terri', 'jeanne', 'jeanine', 'cliff', 'clifford', 'regina', 'wendy', 'barry', 'cindy', 'sandy',
  'greg', 'phil', 'phillip', 'ted', 'theodore', 'brad', 'bradley', 'chad', 'todd', 'craig',
  'derek', 'travis', 'randy', 'russell', 'russ', 'lonnie', 'lenny', 'marvin', 'melvin', 'vernon',
  'wayne', 'earl', 'eugene', 'gene', 'roy', 'ralph', 'louis', 'lou', 'fred', 'frederick',
  'norman', 'norm', 'stanley', 'stan', 'harry', 'harold', 'howard', 'oscar', 'victor', 'vincent',
  'leonard', 'leo', 'leon', 'lloyd', 'lyle', 'marshall', 'martin', 'marty', 'morris', 'murray',
  'neil', 'perry', 'rex', 'rodney', 'roland', 'ross', 'sidney', 'sid', 'stuart', 'stu',
  'sylvia', 'tanya', 'tara', 'tiffany', 'tina', 'tracy', 'valerie', 'vanessa', 'veronica', 'vicky',
  'vivian', 'wanda', 'whitney', 'yolanda', 'yvonne', 'adriana', 'adrienne', 'alicia', 'allison', 'alyssa',
  'bonnie', 'carla', 'carmen', 'carolyn', 'cassandra', 'charlene', 'claudia', 'colleen', 'connie', 'crystal',
  'cathy', 'daisy', 'darlene', 'dawn', 'deanna', 'debra', 'delia', 'elaine', 'elena', 'erica',
  'erin', 'esther', 'eva', 'gail', 'gina', 'glenda', 'gwen', 'holly', 'irene', 'irma',
  'jackie', 'janet', 'jenna', 'jenny', 'jill', 'joann', 'joanna', 'joanne', 'jodi', 'jody',
  'jolene', 'josephine', 'josie', 'juanita', 'julia', 'juliana', 'julianne', 'kara', 'karla', 'katrina',
  'kendra', 'kerri', 'kerry', 'krista', 'kristen', 'kristin', 'kristina', 'kristine', 'lacey', 'latoya',
  'leah', 'leigh', 'lena', 'leslie', 'leticia', 'liliana', 'lillian', 'loretta', 'lorna', 'lorraine',
  'lucia', 'lucille', 'lucy', 'lydia', 'lynda', 'lynne', 'maggie', 'mandy', 'marcia', 'margarita',
  'marian', 'marianne', 'maribel', 'marisol', 'marlene', 'marsha', 'marta', 'maureen', 'maxine', 'mayra',
  'miranda', 'miriam', 'misty', 'molly', 'mona', 'monica', 'monique', 'myra', 'nadine', 'naomi',
  'nora', 'norma', 'olga', 'paige', 'paula', 'pauline', 'peggy', 'priscilla', 'rachael', 'rachel',
  'ramona', 'raquel', 'reba', 'regina', 'renee', 'rhonda', 'rita', 'roberta', 'rochelle', 'rosa',
  'rosalie', 'rosemary', 'roxanne', 'ruby', 'sabrina', 'sally', 'selena', 'serena', 'shannon', 'sheila',
  'shelby', 'shelia', 'shelley', 'shelly', 'sherri', 'sheryl', 'silvia', 'sonia', 'sonya', 'stacey',
  'stacy', 'stella', 'tamara', 'tammy', 'tanisha', 'terrie', 'terry', 'thelma', 'tonya', 'traci',
  'tracie', 'tricia', 'trudy', 'vera', 'verna', 'vickie', 'viola', 'violet', 'willie', 'wilma', 'yesenia'
]);

function extractNameFromEmail(email) {
  if (!email || !email.includes('@')) return null;

  const localPart = email.split('@')[0].toLowerCase();

  // Skip emails that are clearly not names
  if (localPart.length < 5) return null;
  if (/^\d+$/.test(localPart)) return null;
  if (/^(info|admin|sales|contact|support|hello|office|team|service|enquiries|enquiry|general|help)/.test(localPart)) return null;

  // Pattern 1: firstname.lastname@
  if (localPart.includes('.')) {
    const parts = localPart.split('.');
    if (parts.length >= 2) {
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
    if (parts.length >= 2) {
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
  if (localPart.includes('-') && !localPart.startsWith('-')) {
    const parts = localPart.split('-');
    if (parts.length === 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2 && !/\d/.test(first)) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'medium',
          pattern: 'firstname-lastname'
        };
      }
    }
  }

  // Pattern 4: firstnamelastname@ (only if we detect a known first name)
  const cleaned = localPart.replace(/[^a-z]/g, '');

  for (const firstName of commonFirstNames) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const lastName = cleaned.substring(firstName.length);
      // Make sure lastName looks like a name (no numbers, reasonable length)
      if (lastName.length >= 3 && lastName.length <= 15 && /^[a-z]+$/.test(lastName)) {
        return {
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          confidence: 'medium',
          pattern: 'firstnamelastname'
        };
      }
    }
  }

  return null;
}

// Find source files (avoid duplicates)
const files = fs.readdirSync(downloadsDir).filter(f =>
  f.endsWith('.csv') &&
  !f.includes('V2') &&
  !f.includes('V3') &&
  !f.includes('parsed') &&
  !f.includes('enriched') &&
  !f.includes('CLEANED') &&
  !f.includes('FINAL') &&
  !f.includes('FOR-GHL') &&
  (f.includes('Leads-') || f.includes('Realtors') || f.startsWith('CA-') || f.startsWith('AZ-'))
);

console.log('');
console.log('='.repeat(65));
console.log('  CLEAN NAME EXTRACTION (High & Medium Confidence Only)');
console.log('='.repeat(65));
console.log('');
console.log('  Processing files:');
files.forEach(f => console.log('    - ' + f));
console.log('');

let totalContacts = 0;
let extracted = { high: 0, medium: 0 };
let notExtracted = 0;
let byPattern = {};
let examples = { high: [], medium: [], failed: [] };

const seenEmails = new Set();

files.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(downloadsDir, file), 'utf-8');
    const contacts = parseCSV(content);

    contacts.forEach(c => {
      const email = (c['email'] || '').toLowerCase().trim();
      if (!email || !email.includes('@')) return;

      // Skip duplicates
      if (seenEmails.has(email)) return;
      seenEmails.add(email);

      totalContacts++;

      const result = extractNameFromEmail(email);

      if (result) {
        extracted[result.confidence]++;
        byPattern[result.pattern] = (byPattern[result.pattern] || 0) + 1;

        if (result.confidence === 'high' && examples.high.length < 8) {
          examples.high.push({ email, firstName: result.firstName, lastName: result.lastName });
        }
        if (result.confidence === 'medium' && examples.medium.length < 8) {
          examples.medium.push({ email, firstName: result.firstName, lastName: result.lastName });
        }
      } else {
        notExtracted++;
        if (examples.failed.length < 8) {
          examples.failed.push(email);
        }
      }
    });
  } catch (e) {
    console.log('  Error: ' + file + ' - ' + e.message);
  }
});

const totalExtracted = extracted.high + extracted.medium;

console.log('  RESULTS (Deduplicated)');
console.log('  ' + '-'.repeat(55));
console.log('');
console.log(`  Total Unique Contacts:     ${totalContacts.toLocaleString()}`);
console.log('');
console.log('  NAMES EXTRACTED:');
console.log(`    High Confidence:         ${extracted.high.toLocaleString()} (${(extracted.high/totalContacts*100).toFixed(1)}%)`);
console.log(`    Medium Confidence:       ${extracted.medium.toLocaleString()} (${(extracted.medium/totalContacts*100).toFixed(1)}%)`);
console.log('  ' + '-'.repeat(40));
console.log(`    TOTAL EXTRACTED:         ${totalExtracted.toLocaleString()} (${(totalExtracted/totalContacts*100).toFixed(1)}%)`);
console.log('');
console.log(`  COULD NOT EXTRACT:         ${notExtracted.toLocaleString()} (${(notExtracted/totalContacts*100).toFixed(1)}%)`);
console.log('');
console.log('  BY PATTERN:');
Object.entries(byPattern).sort((a,b) => b[1] - a[1]).forEach(([pattern, count]) => {
  console.log(`    ${pattern.padEnd(22)} ${count.toLocaleString()}`);
});
console.log('');
console.log('  HIGH CONFIDENCE EXAMPLES:');
examples.high.forEach(e => {
  console.log(`    ${e.email.padEnd(40)} → ${e.firstName} ${e.lastName}`);
});
console.log('');
console.log('  MEDIUM CONFIDENCE EXAMPLES:');
examples.medium.forEach(e => {
  console.log(`    ${e.email.padEnd(40)} → ${e.firstName} ${e.lastName}`);
});
console.log('');
console.log('  COULD NOT EXTRACT:');
examples.failed.forEach(e => {
  console.log(`    ${e}`);
});
console.log('');
console.log('='.repeat(65));

// Save results
const summary = {
  totalContacts,
  totalExtracted,
  extractedHigh: extracted.high,
  extractedMedium: extracted.medium,
  notExtracted,
  percentExtracted: (totalExtracted/totalContacts*100).toFixed(1) + '%',
  percentNotExtracted: (notExtracted/totalContacts*100).toFixed(1) + '%'
};

fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/clean-extraction-results.json', JSON.stringify(summary, null, 2));
console.log('');
console.log('  Results saved to: clean-extraction-results.json');
console.log('');
