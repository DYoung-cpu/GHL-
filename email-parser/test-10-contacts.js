/**
 * Test 10 contacts with updated LLM prompt
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Pick 10 random contacts to test
const testContacts = [
  'steventerrell@rocketmortgage.com',   // Real person at lender
  'my-support@servicingdivision.com',   // Likely non-human
  'nancy.enriquez@jpmchase.com',        // Real person at Chase
  'rwheeler@bostonnationaltitle.com',   // Title company
  'editors@aggregage.com',              // Likely non-human
  'bdobson@gmail.com',                  // Personal email
  'hp.servicerequest@hp.com',           // Non-human
  'info@ambizmedia.com',                // Likely non-human
  'lisamarie.stanley@apmortgage.com',   // Real person
  'lampsplus@updates.lampsplus.com'     // Non-human
];

async function testContact(email, data, emailIndex) {
  console.log('─'.repeat(60));
  console.log('EMAIL:', email);

  const current = data[email];
  const indexData = emailIndex[email];

  if (!current) {
    console.log('  NOT IN DATABASE (already removed)');
    return { email, status: 'not_in_db' };
  }

  console.log('  Current name:', current.name || '(none)');
  console.log('  Current confidence:', current.confidence);

  const subjects = (indexData?.subjects || []).slice(0, 2);
  if (subjects.length > 0) {
    console.log('  Subjects:', subjects.map(s => s.substring(0, 40)).join(' | '));
  }

  // Build test email from index data
  const testEmail = {
    from: email,
    fromName: '',
    to: 'david@lendwisemtg.com',
    subject: indexData?.subjects?.[0] || '',
    date: 'Dec 2024',
    body: 'Test email body for extraction.'
  };

  console.log('  Testing subject:', (testEmail.subject || '(none)').substring(0, 50));

  try {
    const result = await extractFromEmail(testEmail);

    console.log('  ────────────────────────────');
    console.log('  LLM RESULT:');
    console.log('    isHuman:', result.isHuman);

    if (result.isHuman === false) {
      console.log('    deleteReason:', result.deleteReason);
      console.log('    ACTION: Would DELETE this contact');
    } else {
      console.log('    name:', result.senderContact?.name || '(none)');
      console.log('    nameSource:', result.senderContact?.nameSource);
      console.log('    company:', result.senderContact?.company);
      console.log('    confidence:', result.senderContact?.confidence);
      console.log('    relationship:', result.relationship?.type);

      // Check if name improved
      if (result.senderContact?.name && result.senderContact.name !== current.name) {
        console.log('    ✓ NAME IMPROVED:', current.name, '->', result.senderContact.name);
      }
    }

    return { email, result };
  } catch (err) {
    console.log('  ERROR:', err.message);
    return { email, error: err.message };
  }
}

async function main() {
  // Load data
  const data = JSON.parse(fs.readFileSync('./data/comprehensive-contacts.json', 'utf-8'));
  const emailIndex = JSON.parse(fs.readFileSync('./data/email-index.json', 'utf-8'));

  console.log('═'.repeat(60));
  console.log('TESTING 10 CONTACTS WITH UPDATED LLM PROMPT');
  console.log('═'.repeat(60));
  console.log('');

  const results = { improved: 0, deleted: 0, unchanged: 0, errors: 0 };

  for (const email of testContacts) {
    const result = await testContact(email, data, emailIndex);

    if (result.error) {
      results.errors++;
    } else if (result.result?.isHuman === false) {
      results.deleted++;
    } else if (result.result?.senderContact?.name &&
               result.result.senderContact.name !== data[email]?.name) {
      results.improved++;
    } else {
      results.unchanged++;
    }

    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('  Names improved:', results.improved);
  console.log('  Marked for deletion:', results.deleted);
  console.log('  Unchanged:', results.unchanged);
  console.log('  Errors:', results.errors);
}

main().catch(console.error);
