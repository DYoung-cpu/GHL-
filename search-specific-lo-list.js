/**
 * Search for the specific LO list email that Brenda would discuss with Marc & Anthony
 */

const fs = require('fs');
const readline = require('readline');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Search for emails with multiple LO names
const loNames = [
  'aaron jensen', 'tasneem', 'darius', 'erika boll', 'wayne waldron',
  'daryl white', 'michael bloomquist', 'philip golden', 'kristen garner',
  'jeffrey goodman', 'oscar guzman', 'jack hardwick', 'sevan'
];

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

  // Must be TO Brenda
  if (!to.includes('brenda')) return false;

  // Look for multiple LO names in the body (suggesting a list)
  let loNameCount = 0;
  for (const name of loNames) {
    if (bodyText.includes(name)) loNameCount++;
  }

  // Or look for patterns suggesting Marc/Anthony discussion
  const hasMarcAnthonyDiscussion =
    (bodyText.includes('marc') && (bodyText.includes('speak') || bodyText.includes('discuss') || bodyText.includes('talk'))) ||
    (bodyText.includes('anthony') && (bodyText.includes('speak') || bodyText.includes('discuss') || bodyText.includes('talk')));

  // Or look for phrases like "list of LOs", "my LOs", "recruited LOs"
  const hasLoListPhrase =
    bodyText.includes('list of lo') ||
    bodyText.includes('my los') ||
    bodyText.includes('these los') ||
    bodyText.includes('following lo') ||
    bodyText.includes('lo names') ||
    bodyText.includes('recruited lo');

  return loNameCount >= 2 || hasMarcAnthonyDiscussion || hasLoListPhrase;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SEARCHING FOR LO LIST FOR MARC/ANTHONY DISCUSSION');
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
            bodySnippet: currentEmail.body.join('\n').substring(0, 3000)
          });
        }
      }

      emailCount++;
      if (emailCount % 5000 === 0) {
        console.log('Processed ' + emailCount + ' emails...');
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

    if (inBody && currentEmail.body.length < 150) {
      currentEmail.body.push(line);
    }
  }

  // Check last
  if (currentEmail.from || currentEmail.to) {
    if (checkMatches()) {
      results.push({
        date: currentEmail.date,
        from: currentEmail.from,
        to: currentEmail.to,
        cc: currentEmail.cc,
        subject: currentEmail.subject,
        bodySnippet: currentEmail.body.join('\n').substring(0, 3000)
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  FOUND ' + results.length + ' EMAILS');
  console.log('='.repeat(60));

  fs.writeFileSync('./data/lo-list-for-marc-anthony.json', JSON.stringify(results, null, 2));
  console.log('Saved to: data/lo-list-for-marc-anthony.json\n');

  results.forEach((email, i) => {
    console.log('\n' + '='.repeat(50));
    console.log('Email #' + (i + 1));
    console.log('Date: ' + email.date);
    console.log('Subject: ' + email.subject);
    console.log('To: ' + email.to);
    if (email.cc) console.log('CC: ' + email.cc);
    console.log('\nBody Preview (first 1500 chars):');

    // Clean up and show just the text content
    const cleanBody = email.bodySnippet
      .replace(/Content-Type:.*$/gm, '')
      .replace(/Content-Transfer.*$/gm, '')
      .replace(/--.*$/gm, '')
      .replace(/=\r?\n/g, '')
      .replace(/=3D/g, '=')
      .replace(/=E2=80=99/g, "'")
      .replace(/=E2=80=9C/g, '"')
      .replace(/=E2=80=9D/g, '"')
      .replace(/=C2=A0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(cleanBody.substring(0, 1500));
    console.log('\n' + '='.repeat(50));
  });
}

main().catch(console.error);
