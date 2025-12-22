const fs = require('fs');

// Load the existing contacts
const contacts = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients.json', 'utf-8'));

// Common name patterns in emails
function parseNameFromEmail(email) {
  const localPart = email.split('@')[0].toLowerCase();

  // Remove common number suffixes
  const cleaned = localPart.replace(/[0-9]+$/, '').replace(/_+$/, '').replace(/-+$/, '');

  // Pattern 1: firstname.lastname
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1) {
      // Filter out common non-name patterns
      const nonNames = ['info', 'contact', 'admin', 'support', 'sales', 'hello', 'mail', 'email'];
      if (!nonNames.includes(parts[0]) && !nonNames.includes(parts[1])) {
        return {
          firstName: capitalize(parts[0]),
          lastName: capitalize(parts[1]),
          confidence: 'high',
          pattern: 'firstname.lastname'
        };
      }
    }
  }

  // Pattern 2: firstname_lastname
  if (cleaned.includes('_')) {
    const parts = cleaned.split('_');
    if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1) {
      return {
        firstName: capitalize(parts[0]),
        lastName: capitalize(parts[1]),
        confidence: 'high',
        pattern: 'firstname_lastname'
      };
    }
  }

  // Pattern 3: firstnamelastname (harder - look for common patterns)
  // Try to detect if it's two names concatenated
  const commonFirstNames = ['john', 'mike', 'michael', 'david', 'chris', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle', 'noah', 'ethan', 'jeremy', 'walter', 'christian', 'keith', 'roger', 'terry', 'austin', 'sean', 'gerald', 'carl', 'harold', 'dylan', 'arthur', 'lawrence', 'jordan', 'jesse', 'bryan', 'billy', 'bruce', 'gabriel', 'joe', 'logan', 'albert', 'willie', 'alan', 'eugene', 'russell', 'vincent', 'philip', 'bobby', 'johnny', 'bradley', 'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan', 'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise', 'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis', 'lori', 'ken', 'tom', 'bob', 'jim', 'dan', 'steve', 'jeff', 'greg', 'tony', 'ray', 'joe', 'sam', 'ben', 'tim', 'matt', 'nick', 'alex', 'max', 'jake', 'luke', 'seth', 'cole', 'drew', 'chad', 'brad', 'troy', 'kurt', 'todd', 'doug', 'rick', 'mark', 'carl', 'gary', 'dale', 'gene', 'phil', 'stan', 'fred', 'earl', 'roy', 'lee', 'jay', 'ted', 'ed', 'al', 'beth', 'kate', 'anne', 'jane', 'lynn', 'sue', 'joy', 'kay', 'fay', 'eve', 'ivy', 'amy', 'jan', 'kim', 'pam', 'ann', 'deb', 'meg', 'jill', 'tina', 'gina', 'nina', 'anna', 'emma', 'ella', 'lily', 'lucy', 'ruby', 'rose', 'jade', 'hope', 'faith', 'oleg', 'artak', 'ketul', 'mohan', 'ravi', 'vikas', 'ashok', 'vijay', 'suresh', 'ramesh', 'mahesh', 'rajesh', 'dinesh', 'naresh', 'girish', 'satish', 'nilesh', 'hitesh', 'jignesh', 'alpesh', 'ketan', 'nitin', 'amit', 'ankit', 'rohit', 'sumit', 'lalit', 'vinit', 'mohit', 'ajit', 'anil', 'sunil', 'rahul', 'vishal', 'pankaj', 'deepak', 'vivek', 'manoj', 'pramod', 'vinod', 'arvind', 'ashish', 'manish', 'rakesh', 'mukesh', 'lokesh', 'yogesh', 'ganesh', 'prashant', 'sanjay', 'vijay', 'ajay', 'uday', 'akshay'];

  for (const firstName of commonFirstNames) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const potentialLastName = cleaned.substring(firstName.length);
      if (potentialLastName.length >= 3 && /^[a-z]+$/.test(potentialLastName)) {
        return {
          firstName: capitalize(firstName),
          lastName: capitalize(potentialLastName),
          confidence: 'medium',
          pattern: 'concatenated'
        };
      }
    }
  }

  // Pattern 4: Just first name (single word, likely a name)
  if (/^[a-z]+$/.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 12) {
    const commonWords = ['info', 'contact', 'admin', 'support', 'sales', 'hello', 'mail', 'email', 'test', 'user', 'guest', 'home', 'work', 'main', 'real', 'best', 'cool', 'super', 'mega', 'ultra', 'true', 'free'];
    if (!commonWords.includes(cleaned)) {
      return {
        firstName: capitalize(cleaned),
        lastName: '',
        confidence: 'low',
        pattern: 'single-word'
      };
    }
  }

  return {
    firstName: '',
    lastName: '',
    confidence: 'none',
    pattern: 'unparseable'
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Process all contacts
const results = {
  high: [],
  medium: [],
  low: [],
  none: []
};

contacts.forEach(contact => {
  // Skip if already has name
  if (contact.firstName && contact.lastName) {
    results.high.push({
      ...contact,
      confidence: 'existing',
      pattern: 'already-named'
    });
    return;
  }

  const parsed = parseNameFromEmail(contact.email);
  contact.firstName = parsed.firstName;
  contact.lastName = parsed.lastName;
  contact.nameConfidence = parsed.confidence;
  contact.namePattern = parsed.pattern;

  results[parsed.confidence].push(contact);
});

// Summary
console.log('='.repeat(60));
console.log('NAME PARSING RESULTS');
console.log('='.repeat(60));

console.log(`\n✅ HIGH CONFIDENCE (firstname.lastname or firstname_lastname): ${results.high.length}`);
results.high.slice(0, 20).forEach(c => {
  console.log(`   ${c.firstName} ${c.lastName} <${c.email}>`);
});
if (results.high.length > 20) console.log(`   ... and ${results.high.length - 20} more`);

console.log(`\n🔶 MEDIUM CONFIDENCE (concatenated names): ${results.medium.length}`);
results.medium.slice(0, 20).forEach(c => {
  console.log(`   ${c.firstName} ${c.lastName} <${c.email}>`);
});
if (results.medium.length > 20) console.log(`   ... and ${results.medium.length - 20} more`);

console.log(`\n⚠️ LOW CONFIDENCE (single word, might be name): ${results.low.length}`);
results.low.slice(0, 20).forEach(c => {
  console.log(`   ${c.firstName} <${c.email}>`);
});
if (results.low.length > 20) console.log(`   ... and ${results.low.length - 20} more`);

console.log(`\n❌ UNPARSEABLE (no name pattern found): ${results.none.length}`);
results.none.slice(0, 20).forEach(c => {
  console.log(`   <${c.email}>`);
});
if (results.none.length > 20) console.log(`   ... and ${results.none.length - 20} more`);

// Save updated contacts
const allContacts = [...results.high, ...results.medium, ...results.low, ...results.none];
fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-parsed.json', JSON.stringify(allContacts, null, 2));

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total contacts: ${allContacts.length}`);
console.log(`With names (high + medium): ${results.high.length + results.medium.length}`);
console.log(`First name only (low): ${results.low.length}`);
console.log(`No name (need manual): ${results.none.length}`);
console.log(`\nSaved to: /mnt/c/Users/dyoun/ghl-automation/data/past-clients-parsed.json`);
