/**
 * Enforce Bi-Directional Exchange Requirement
 *
 * One-time cleanup script to remove all contacts without bi-directional exchange.
 * A contact MUST have both:
 *   - davidSent > 0 (David emailed them)
 *   - davidReceived > 0 (They emailed David)
 *
 * This ensures only REAL CONVERSATIONS are kept.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_PATH = path.join(DATA_DIR, 'comprehensive-contacts.json');
const INDEX_PATH = path.join(DATA_DIR, 'email-index.json');

function main() {
  console.log('═'.repeat(60));
  console.log('ENFORCE BI-DIRECTIONAL EXCHANGE REQUIREMENT');
  console.log('═'.repeat(60));

  // Load data
  if (!fs.existsSync(CONTACTS_PATH)) {
    console.log('ERROR: comprehensive-contacts.json not found');
    process.exit(1);
  }
  if (!fs.existsSync(INDEX_PATH)) {
    console.log('ERROR: email-index.json not found');
    process.exit(1);
  }

  const contacts = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf-8'));
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

  const before = Object.keys(contacts).length;
  console.log(`\nLoaded ${before} contacts\n`);

  // Track stats
  const stats = {
    bidirectional: 0,
    onlyReceived: 0,
    onlySent: 0,
    noData: 0
  };

  const toRemove = [];
  const removed = {
    onlyReceived: [],
    onlySent: [],
    noData: []
  };

  // Check each contact
  for (const email of Object.keys(contacts)) {
    const indexData = index[email.toLowerCase()];

    if (!indexData) {
      stats.noData++;
      toRemove.push(email);
      removed.noData.push(email);
      continue;
    }

    const davidSent = indexData.davidSent || 0;
    const davidReceived = indexData.davidReceived || 0;

    // Bi-directional = BOTH directions have at least 1 email
    if (davidSent > 0 && davidReceived > 0) {
      stats.bidirectional++;
      // KEEP this contact
    } else if (davidReceived > 0) {
      stats.onlyReceived++;
      toRemove.push(email);
      removed.onlyReceived.push({ email, received: davidReceived });
    } else if (davidSent > 0) {
      stats.onlySent++;
      toRemove.push(email);
      removed.onlySent.push({ email, sent: davidSent });
    } else {
      stats.noData++;
      toRemove.push(email);
      removed.noData.push(email);
    }
  }

  // Remove non-bidirectional contacts
  for (const email of toRemove) {
    delete contacts[email];
  }

  const after = Object.keys(contacts).length;

  // Report
  console.log('─'.repeat(60));
  console.log('RESULTS:');
  console.log('─'.repeat(60));
  console.log(`  Bi-directional (KEPT): ${stats.bidirectional}`);
  console.log(`  One-way received (REMOVED): ${stats.onlyReceived}`);
  console.log(`  One-way sent (REMOVED): ${stats.onlySent}`);
  console.log(`  No exchange data (REMOVED): ${stats.noData}`);
  console.log('─'.repeat(60));
  console.log(`  BEFORE: ${before}`);
  console.log(`  AFTER:  ${after}`);
  console.log(`  REMOVED: ${before - after}`);

  // Show examples of removed contacts
  if (removed.onlyReceived.length > 0) {
    console.log('\n─'.repeat(60));
    console.log('EXAMPLES - One-way received (they emailed you, you never replied):');
    console.log('─'.repeat(60));
    removed.onlyReceived
      .sort((a, b) => b.received - a.received)
      .slice(0, 10)
      .forEach(c => console.log(`  ${c.email} (${c.received} emails)`));
    if (removed.onlyReceived.length > 10) {
      console.log(`  ... and ${removed.onlyReceived.length - 10} more`);
    }
  }

  // Save
  fs.writeFileSync(CONTACTS_PATH, JSON.stringify(contacts, null, 2));
  console.log(`\nSaved ${after} contacts to ${CONTACTS_PATH}`);

  console.log('\n' + '═'.repeat(60));
  console.log('BI-DIRECTIONAL ENFORCEMENT COMPLETE');
  console.log('═'.repeat(60));
}

main();
