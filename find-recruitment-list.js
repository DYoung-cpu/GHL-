/**
 * Search the 522 results for emails about recruitment lists for Marc/Anthony
 */

const fs = require('fs');

const results = JSON.parse(fs.readFileSync('./data/email-search-results.json', 'utf-8'));

console.log('='.repeat(60));
console.log('  SEARCHING FOR RECRUITMENT/LO LISTS');
console.log('='.repeat(60));

// Keywords that suggest an LO list for management discussion
const patterns = [
  'recruitment number',
  'lo list',
  'list of lo',
  'my los',
  'recruited',
  'brought on',
  'i onboarded',
  'i recruited',
  'here is the list',
  'here are the',
  'attached list',
  'override report',
  'override list'
];

// Find emails that match any of these patterns
results.forEach((email, idx) => {
  const subject = (email.subject || '').toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  const to = (email.to || '').toLowerCase();

  // Must involve Brenda in some way
  if (!to.includes('brenda') && !from.includes('brenda') && !snippet.includes('brenda')) return;

  // Check patterns
  for (const pattern of patterns) {
    if (subject.includes(pattern) || snippet.includes(pattern)) {
      console.log('\n' + '='.repeat(50));
      console.log('Match #' + (idx + 1) + ' - Pattern: "' + pattern + '"');
      console.log('Date: ' + email.date);
      console.log('Subject: ' + email.subject);
      console.log('From: ' + email.from);
      console.log('To: ' + email.to);
      console.log('Keywords: ' + (email.keywords || []).join(', '));
      console.log('\nSnippet:');
      console.log(email.snippet);
      console.log('='.repeat(50));
      return; // Only show once per email
    }
  }
});

// Also look for "Recruitment Numbers" subject
console.log('\n\n' + '='.repeat(60));
console.log('  EMAILS WITH "RECRUITMENT" IN SUBJECT');
console.log('='.repeat(60));

results.forEach((email, idx) => {
  const subject = (email.subject || '').toLowerCase();
  if (subject.includes('recruit')) {
    console.log('\n--- Email ---');
    console.log('Date: ' + email.date);
    console.log('Subject: ' + email.subject);
    console.log('From: ' + email.from);
    console.log('To: ' + email.to);
    console.log('Snippet: ' + (email.snippet || '').substring(0, 500));
  }
});

// Show count of emails TO Brenda about overrides
console.log('\n\n' + '='.repeat(60));
console.log('  EMAILS TO BRENDA ABOUT OVERRIDES');
console.log('='.repeat(60));

let overrideCount = 0;
results.forEach((email, idx) => {
  const subject = (email.subject || '').toLowerCase();
  const to = (email.to || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  const keywords = (email.keywords || []).join(',').toLowerCase();

  if (to.includes('brenda') && keywords.includes('override')) {
    overrideCount++;
    if (overrideCount <= 15) {  // Show first 15
      console.log('\n#' + overrideCount);
      console.log('Date: ' + email.date);
      console.log('Subject: ' + email.subject);
      console.log('From: ' + email.from);
      console.log('Snippet preview: ' + (email.snippet || '').substring(0, 300));
    }
  }
});

console.log('\n\nTotal emails TO Brenda about overrides: ' + overrideCount);
