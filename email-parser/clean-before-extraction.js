/**
 * Data Cleanup Script - Run BEFORE full re-extraction
 *
 * Tasks:
 * 1. Clear altEmails from all contacts
 * 2. Remove Priority Financial contacts not in allowed list
 * 3. Remove One Nation contacts without bi-directional exchange
 * 4. Delete spam records
 * 5. Report NMLS contamination
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_PATH = path.join(DATA_DIR, 'comprehensive-contacts.json');
const INDEX_PATH = path.join(DATA_DIR, 'email-index.json');

// Priority Financial allowed patterns
const PFN_ALLOWED = [
  'bryan campbell', 'bryancampbell', 'bryan@',
  'marc shenkman', 'marcshenkman', 'teamshenkman', 'marc@',
  'brenda perry', 'brendaperry', 'brenda@',
  'anthony amini', 'anthonyamini',
  'paul rosenthal', 'paulrosenthal',
  'lockdesk'
];

// Spam records to delete
const SPAM_EMAILS = [
  'federicomcgehee65@site.insurple.com',
  'saumyaseoexpert@outlook.com'
];

function isAllowedPFN(email, name) {
  const emailLower = (email || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  return PFN_ALLOWED.some(p => emailLower.includes(p) || nameLower.includes(p));
}

function hasExchange(email, index) {
  const contact = index[email.toLowerCase()];
  if (!contact) return false;
  return contact.davidSent > 0 && contact.davidReceived > 0;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('DATA CLEANUP BEFORE RE-EXTRACTION');
  console.log('═'.repeat(60));

  // Load data
  const contacts = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf-8'));
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

  const before = Object.keys(contacts).length;
  console.log(`\nLoaded ${before} contacts\n`);

  let stats = {
    altEmailsCleared: 0,
    pfnRemoved: 0,
    pfnKept: 0,
    oneNationRemoved: 0,
    oneNationKept: 0,
    spamRemoved: 0,
    noExchangeRemoved: 0,
    nmlsDuplicates: {}
  };

  // Track removals
  const toRemove = new Set();

  // 1. Clear altEmails and check PFN/One Nation
  for (const [email, contact] of Object.entries(contacts)) {
    const emailLower = email.toLowerCase();

    // Clear altEmails
    if (contact.altEmails && contact.altEmails.length > 0) {
      contact.altEmails = [];
      stats.altEmailsCleared++;
    }

    // Check Priority Financial
    if (emailLower.includes('priorityfinancial')) {
      if (isAllowedPFN(email, contact.name)) {
        stats.pfnKept++;
      } else {
        toRemove.add(email);
        stats.pfnRemoved++;
      }
    }

    // Check One Nation
    if (emailLower.includes('onenation')) {
      if (hasExchange(email, index)) {
        stats.oneNationKept++;
      } else {
        toRemove.add(email);
        stats.oneNationRemoved++;
      }
    }

    // PERMANENT RULE: Bi-directional exchange required for ALL contacts
    // Remove any contact without bi-directional exchange (davidSent > 0 AND davidReceived > 0)
    if (!hasExchange(email, index)) {
      if (!toRemove.has(email)) { // Don't double-count
        toRemove.add(email);
        stats.noExchangeRemoved++;
      }
    }

    // Track NMLS for contamination check
    if (contact.nmls) {
      if (!stats.nmlsDuplicates[contact.nmls]) {
        stats.nmlsDuplicates[contact.nmls] = [];
      }
      stats.nmlsDuplicates[contact.nmls].push(email);
    }
  }

  // 2. Remove spam records
  for (const spam of SPAM_EMAILS) {
    if (contacts[spam]) {
      toRemove.add(spam);
      stats.spamRemoved++;
    }
  }

  // 3. Actually remove contacts
  for (const email of toRemove) {
    delete contacts[email];
  }

  const after = Object.keys(contacts).length;

  // Report
  console.log('─'.repeat(60));
  console.log('CLEANUP RESULTS:');
  console.log('─'.repeat(60));
  console.log(`  altEmails cleared: ${stats.altEmailsCleared}`);
  console.log(`  Priority Financial removed: ${stats.pfnRemoved} (kept: ${stats.pfnKept})`);
  console.log(`  One Nation removed: ${stats.oneNationRemoved} (kept: ${stats.oneNationKept})`);
  console.log(`  Spam records removed: ${stats.spamRemoved}`);
  console.log(`  No bi-directional exchange removed: ${stats.noExchangeRemoved}`);
  console.log(`  Total removed: ${before - after}`);
  console.log(`  Remaining contacts: ${after}`);

  // Report NMLS contamination
  const duplicatedNmls = Object.entries(stats.nmlsDuplicates)
    .filter(([_, emails]) => emails.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (duplicatedNmls.length > 0) {
    console.log('\n─'.repeat(60));
    console.log('NMLS CONTAMINATION (same NMLS on multiple contacts):');
    console.log('─'.repeat(60));
    duplicatedNmls.slice(0, 10).forEach(([nmls, emails]) => {
      console.log(`  NMLS ${nmls} (${emails.length} contacts):`);
      emails.slice(0, 3).forEach(e => console.log(`    - ${e}`));
      if (emails.length > 3) console.log(`    ... and ${emails.length - 3} more`);
    });
  }

  // Save
  fs.writeFileSync(CONTACTS_PATH, JSON.stringify(contacts, null, 2));
  console.log(`\n💾 Saved to ${CONTACTS_PATH}`);

  console.log('\n' + '═'.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
