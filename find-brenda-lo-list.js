/**
 * Search for the specific email David sent to Brenda with LO list
 */

const fs = require('fs');

const results = JSON.parse(fs.readFileSync('./data/email-search-results.json', 'utf-8'));

console.log('='.repeat(60));
console.log('  SEARCHING FOR EMAILS TO BRENDA WITH LO LIST');
console.log('='.repeat(60));

// Find emails FROM David TO Brenda
const toBrenda = results.filter(r => {
  const from = r.from.toLowerCase();
  const to = r.to.toLowerCase();
  return (from.includes('davidyoung') || from.includes('dyoung')) &&
         to.includes('brenda');
});

console.log('\nEmails FROM David TO Brenda: ' + toBrenda.length);
console.log('');

// Look for ones mentioning LOs, names, list, recruitment, overrides
const keywords = ['list', 'los', 'loan officer', 'override', 'recruit', 'brought on', 'onboard', 'tier', 'comp', 'gold', 'silver', 'bronze', 'anthony'];

toBrenda.forEach((email, i) => {
  const snippet = (email.snippet || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();

  const matchedKw = keywords.filter(k => snippet.includes(k) || subject.includes(k));

  if (matchedKw.length > 0) {
    console.log('--- Email ' + (i + 1) + ' ---');
    console.log('Date: ' + email.date);
    console.log('Subject: ' + email.subject);
    console.log('To: ' + email.to);
    console.log('Keywords found: ' + matchedKw.join(', '));
    console.log('Snippet: ' + email.snippet);
    console.log('');
  }
});

// Also look for CC to both Brenda and Anthony
console.log('\n' + '='.repeat(60));
console.log('  EMAILS CC\'d TO BOTH BRENDA AND ANTHONY');
console.log('='.repeat(60));

const toBrendaAndAnthony = results.filter(r => {
  const to = (r.to || '').toLowerCase();
  return to.includes('brenda') && to.includes('anthony');
});

console.log('\nEmails to both Brenda and Anthony: ' + toBrendaAndAnthony.length);

toBrendaAndAnthony.forEach((email, i) => {
  console.log('\n--- Email ' + (i + 1) + ' ---');
  console.log('Date: ' + email.date);
  console.log('From: ' + email.from);
  console.log('Subject: ' + email.subject);
  console.log('Snippet: ' + email.snippet);
});

// Search for "marc" and "anthony" together
console.log('\n' + '='.repeat(60));
console.log('  EMAILS MENTIONING BOTH MARC AND ANTHONY');
console.log('='.repeat(60));

const marcAnthony = results.filter(r => {
  const snippet = (r.snippet || '').toLowerCase();
  const to = (r.to || '').toLowerCase();
  return (snippet.includes('marc') || to.includes('marc')) &&
         (snippet.includes('anthony') || to.includes('anthony'));
});

console.log('\nEmails mentioning Marc and Anthony: ' + marcAnthony.length);

marcAnthony.slice(0, 10).forEach((email, i) => {
  console.log('\n--- Email ' + (i + 1) + ' ---');
  console.log('Date: ' + email.date);
  console.log('From: ' + email.from);
  console.log('Subject: ' + email.subject);
  console.log('To: ' + email.to);
  console.log('Snippet: ' + email.snippet);
});
