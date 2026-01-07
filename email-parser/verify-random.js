/**
 * Verify 10 random contacts from extraction
 */
const contacts = require('./data/comprehensive-contacts.json');
const test = require('/tmp/random10-verify.json');

test.forEach(email => {
  const c = contacts[email];
  if (!c) {
    console.log('═'.repeat(60));
    console.log('EMAIL:', email);
    console.log('  NOT FOUND (removed as non-human)');
    return;
  }

  console.log('═'.repeat(60));
  console.log('EMAIL:', email);
  console.log('  Name:', c.name || '(none)');
  console.log('  Name Source:', c.nameSource || '(none)');
  console.log('  Company:', c.company || '(none)');
  console.log('  Title:', c.title || '(none)');
  console.log('  Relationship:', c.relationship?.type || 'unknown');
  console.log('  Phone:', c.phone || '(none)');
  console.log('  NMLS:', c.nmls || '(none)');
  console.log('  Confidence:', c.confidence || 'n/a');
  console.log('  Emails processed:', c.stats?.emailsProcessed || 0);
});
