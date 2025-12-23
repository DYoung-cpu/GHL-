/**
 * Deep search for the specific LO list email
 * Looking for: list sent to Brenda that she would discuss with Marc & Anthony
 */

const fs = require('fs');
const readline = require('readline');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

const results = [];
let currentEmail = {
  from: '',
  to: '',
  cc: '',
  subject: '',
  date: '',
  body: [],
};

let emailCount = 0;
let inHeaders = false;
let inBody = false;

function checkMatches() {
  const from = currentEmail.from.toLowerCase();
  const to = currentEmail.to.toLowerCase();
  const cc = currentEmail.cc.toLowerCase();
  const subject = currentEmail.subject.toLowerCase();
  const bodyText = currentEmail.body.join(' ').toLowerCase();

  // Must be FROM David
  if (!from.includes('davidyoung') && !from.includes('dyoung')) return false;

  // Must be TO or CC Brenda
  if (!to.includes('brenda') && !cc.includes('brenda')) return false;

  // Look for patterns suggesting an LO list
  const listPatterns = [
    'attached',
    'here is',
    'here are',
    'list of lo',
    'list of loan',
    'list of the lo',
    'lo names',
    'loan officers i',
    'recruited',
    'brought on',
    'my los',
    'these los',
    'following lo',
    'override on',
    'overrides for'
  ];

  for (const pattern of listPatterns) {
    if (subject.includes(pattern) || bodyText.includes(pattern)) {
      return true;
    }
  }

  return false;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SEARCHING FOR LO LIST EMAIL TO BRENDA');
  console.log('='.repeat(60));
  console.log('\nThis may take a few minutes...\n');

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      if (currentEmail.from || currentEmail.to) {
        if (checkMatches()) {
          results.push({
            date: currentEmail.date,
            from: currentEmail.from,
            to: currentEmail.to,
            cc: currentEmail.cc,
            subject: currentEmail.subject,
            bodySnippet: currentEmail.body.slice(0, 50).join('\n').substring(0, 2000)
          });
        }
      }

      emailCount++;
      if (emailCount % 5000 === 0) {
        console.log('Processed ' + emailCount + ' emails, found ' + results.length + ' matches...');
      }

      currentEmail = { from: '', to: '', cc: '', subject: '', date: '', body: [] };
      inHeaders = true;
      inBody = false;
      continue;
    }

    if (line === '' && inHeaders) {
      inHeaders = false;
      inBody = true;
      continue;
    }

    if (inHeaders) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('from:')) currentEmail.from = line.substring(5).trim();
      else if (lowerLine.startsWith('to:')) currentEmail.to = line.substring(3).trim();
      else if (lowerLine.startsWith('cc:')) currentEmail.cc = line.substring(3).trim();
      else if (lowerLine.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
      else if (lowerLine.startsWith('date:')) currentEmail.date = line.substring(5).trim();
    }

    if (inBody && currentEmail.body.length < 100) {
      currentEmail.body.push(line);
    }
  }

  // Check last email
  if (currentEmail.from || currentEmail.to) {
    if (checkMatches()) {
      results.push({
        date: currentEmail.date,
        from: currentEmail.from,
        to: currentEmail.to,
        cc: currentEmail.cc,
        subject: currentEmail.subject,
        bodySnippet: currentEmail.body.slice(0, 50).join('\n').substring(0, 2000)
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS: ' + results.length + ' EMAILS FOUND');
  console.log('='.repeat(60));

  // Save results
  fs.writeFileSync('./data/lo-list-emails.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to: data/lo-list-emails.json\n');

  // Display results
  results.forEach((r, i) => {
    console.log('\n--- Email ' + (i + 1) + ' ---');
    console.log('Date: ' + r.date);
    console.log('Subject: ' + r.subject);
    console.log('To: ' + r.to);
    if (r.cc) console.log('CC: ' + r.cc);
    console.log('\nBody Preview:');
    console.log(r.bodySnippet.substring(0, 800));
    console.log('...\n');
  });
}

main().catch(console.error);
