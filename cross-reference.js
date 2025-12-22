const fs = require('fs');

// Load the parsed contacts
const contacts = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-parsed.json', 'utf-8'));

// Client names extracted from folder/file paths
const clientsFromFolders = [
  { lastName: 'Eastland', firstName: 'Chase', fullName: 'Chase E Eastland', address: '1750 Sky Lark Lane Unit 2311, Houston TX 77056' },
  { lastName: 'Luciano', firstName: '' },
  { lastName: 'McClain', firstName: 'Justin' },
  { lastName: 'Simpson', firstName: '' },
  { lastName: 'Williams', firstName: '' },
  { lastName: 'Levi', firstName: '' },
  { lastName: 'Marzouk', firstName: '' },
  { lastName: 'Shotwell', firstName: 'Ken' },
  { lastName: 'Troy', firstName: 'Seth' },
  { lastName: 'Turbyville', firstName: 'Emma' },
  { lastName: 'Christopher', firstName: '' },
  { lastName: 'Chuchin', firstName: 'Oleg' },
  { lastName: 'Gennedy', firstName: '' },
  { lastName: 'Golshani', firstName: 'Hedy' },
  { lastName: 'Kolodenker', firstName: '' },
  // { lastName: 'Lev', firstName: '' }, // Too short - matches "levi" etc.
  { lastName: 'Paolillo', firstName: '' },
  { lastName: 'Rodas', firstName: 'Barbara', notes: 'Roy Mays & Barbara Rodas' },
  { lastName: 'Azzarito', firstName: 'Patrick' },
  { lastName: 'Choo', firstName: 'Kristy' },
  { lastName: 'Forshami', firstName: 'Kousha' },
  { lastName: 'Landros', firstName: '' },
  { lastName: 'Yakovchik', firstName: 'Val' },
  { lastName: 'Kasmer', firstName: 'Marcel' },
  { lastName: 'Lekhal', firstName: 'Yassine' },
  { lastName: 'Wehage', firstName: '' },
  { lastName: 'Covarubias', firstName: 'Cynthia', altLastName: 'Covar' },
  { lastName: 'Jiwani', firstName: 'Asif', notes: 'Asif & Sabeen Jiwani' },
  { lastName: 'Rawls', firstName: 'Tim', notes: 'Tim and Deb Rawls' },
  { lastName: 'Roberts', firstName: '' },
  { lastName: 'Wood', firstName: 'Christina', notes: 'Christina Wood & Mark Cummings' },
  { lastName: 'Yanis', firstName: '' },
  { lastName: 'Ivanov', firstName: '' },
  { lastName: 'Carroll', firstName: 'Jannine' },
  // { lastName: 'Oh', firstName: 'Changsuk' }, // Too many false positives - "oh" matches john, mohan, etc.
  { lastName: 'Badalich', firstName: 'Carl' },
  { lastName: 'Lugo', firstName: '' },
  { lastName: 'Fontanilla', firstName: '' },
  { lastName: 'Golod', firstName: '' },
  { lastName: 'Hashmani', firstName: '' },
  { lastName: 'Ramirez', firstName: '' },
  { lastName: 'Mandel', firstName: '' },
  { lastName: 'McClure', firstName: 'Guy' },
  { lastName: 'Ortisi', firstName: '' },
  { lastName: 'Pandya', firstName: '' },
  { lastName: 'Stegman', firstName: 'Joseph', address: '12040 Beacon Drive, North Huntingdon, PA 15642', notes: 'From rate lock PDF' }
];

// Function to find email matches
function findMatches() {
  const matches = [];
  const noMatch = [];

  clientsFromFolders.forEach(client => {
    const lastNameLower = client.lastName.toLowerCase();
    const altLower = client.altLastName ? client.altLastName.toLowerCase() : '';

    // Search for email containing last name
    const found = contacts.filter(c => {
      const emailLower = c.email.toLowerCase();
      const parsedLastLower = (c.lastName || '').toLowerCase();

      return emailLower.includes(lastNameLower) ||
             parsedLastLower.includes(lastNameLower) ||
             (altLower && (emailLower.includes(altLower) || parsedLastLower.includes(altLower)));
    });

    if (found.length > 0) {
      matches.push({
        client,
        emailMatches: found.map(f => ({
          email: f.email,
          parsedFirst: f.firstName,
          parsedLast: f.lastName
        }))
      });
    } else {
      noMatch.push(client);
    }
  });

  return { matches, noMatch };
}

const { matches, noMatch } = findMatches();

console.log('='.repeat(60));
console.log('CROSS-REFERENCE: Folder Names ↔ Email Addresses');
console.log('='.repeat(60));

console.log(`\n✅ MATCHES FOUND: ${matches.length}`);
matches.forEach(m => {
  console.log(`\n  📁 ${m.client.firstName || '?'} ${m.client.lastName}`);
  if (m.client.address) console.log(`     Address: ${m.client.address}`);
  if (m.client.notes) console.log(`     Notes: ${m.client.notes}`);
  m.emailMatches.forEach(e => {
    console.log(`     📧 ${e.email}`);
    if (e.parsedFirst || e.parsedLast) {
      console.log(`        Parsed as: ${e.parsedFirst} ${e.parsedLast}`);
    }
  });
});

console.log(`\n\n❌ NO EMAIL MATCH FOUND: ${noMatch.length}`);
noMatch.forEach(c => {
  console.log(`  - ${c.firstName || '?'} ${c.lastName}`);
});

// Now update the contacts with confirmed names
console.log('\n' + '='.repeat(60));
console.log('UPDATING CONTACTS WITH CONFIRMED NAMES');
console.log('='.repeat(60));

let updatedCount = 0;
matches.forEach(m => {
  m.emailMatches.forEach(emailMatch => {
    const contact = contacts.find(c => c.email === emailMatch.email);
    if (contact) {
      // ALWAYS use confirmed first name from folder if available
      if (m.client.firstName) {
        contact.firstName = m.client.firstName;
        updatedCount++;
      }
      // ALWAYS use confirmed last name from folder
      contact.lastName = m.client.lastName;

      if (m.client.address) {
        contact.address = m.client.address;
      }
      if (m.client.notes) {
        contact.notes = m.client.notes;
      }
      contact.nameConfidence = 'confirmed';
      contact.dataSource = 'folder-crossref';
      console.log(`  ✓ Updated: ${contact.firstName} ${contact.lastName} <${contact.email}>`);
    }
  });
});

// Save updated contacts
fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json', JSON.stringify(contacts, null, 2));

console.log(`\n✅ Updated ${updatedCount} contacts with confirmed names`);
console.log(`Saved to: /mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json`);

// Summary by confidence
const confirmed = contacts.filter(c => c.nameConfidence === 'confirmed').length;
const high = contacts.filter(c => c.nameConfidence === 'high').length;
const medium = contacts.filter(c => c.nameConfidence === 'medium').length;
const low = contacts.filter(c => c.nameConfidence === 'low').length;
const none = contacts.filter(c => c.nameConfidence === 'none').length;

console.log('\n' + '='.repeat(60));
console.log('FINAL CONTACT SUMMARY');
console.log('='.repeat(60));
console.log(`  ✅ Confirmed (from folders): ${confirmed}`);
console.log(`  ✅ High confidence: ${high}`);
console.log(`  🔶 Medium confidence: ${medium}`);
console.log(`  ⚠️ Low confidence: ${low}`);
console.log(`  ❌ No name: ${none}`);
console.log(`  📊 TOTAL: ${contacts.length}`);
