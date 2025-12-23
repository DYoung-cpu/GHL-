/**
 * Search for the LO list email for Marc & Anthony discussion
 */

const fs = require('fs');

const results = JSON.parse(fs.readFileSync('./data/lo-list-emails.json', 'utf-8'));

console.log('='.repeat(60));
console.log('  EMAILS WITH LO LIST FOR MARC/ANTHONY DISCUSSION');
console.log('='.repeat(60));

// Look for emails mentioning Marc, Anthony, or having attachments with LO info
results.forEach((email, i) => {
  const body = (email.bodySnippet || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();

  // Check for key patterns
  const hasMarcAnthony = body.includes('marc') || body.includes('anthony');
  const hasListPattern = body.includes('attached') && (body.includes('list') || body.includes('lo') || body.includes('loan officer'));
  const hasRecruitPattern = body.includes('recruit') || body.includes('brought on') || body.includes('onboard');
  const hasOverridePattern = body.includes('override');

  // Check subject for LO or list patterns
  const subjectHasLO = subject.includes('lo') || subject.includes('loan officer') || subject.includes('branch');

  if ((hasMarcAnthony && (hasListPattern || hasRecruitPattern || hasOverridePattern)) ||
      (hasListPattern && subjectHasLO)) {
    console.log('\n' + '='.repeat(50));
    console.log('Email #' + (i + 1));
    console.log('Date: ' + email.date);
    console.log('Subject: ' + email.subject);
    console.log('To: ' + email.to);
    if (email.cc) console.log('CC: ' + email.cc);
    console.log('\nBody:');
    console.log(email.bodySnippet);
    console.log('='.repeat(50));
  }
});

// Also look specifically for the Jan 2023 email with the branch/LO list
console.log('\n\n' + '='.repeat(60));
console.log('  JAN 2023 BRANCH/LO LIST EMAILS');
console.log('='.repeat(60));

results.forEach((email, i) => {
  if (email.date && email.date.includes('2023') &&
      (email.date.includes('Jan') || email.date.includes('Feb') || email.date.includes('Mar'))) {
    const body = (email.bodySnippet || '').toLowerCase();
    if (body.includes('list') || body.includes('attached') || body.includes('branch')) {
      console.log('\n--- Email ---');
      console.log('Date: ' + email.date);
      console.log('Subject: ' + email.subject);
      console.log('To: ' + email.to);
      console.log('Body snippet (first 600 chars):');
      console.log(email.bodySnippet.substring(0, 600));
      console.log('');
    }
  }
});
