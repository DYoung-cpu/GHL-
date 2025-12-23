/**
 * Deep search mbox for emails asking Brenda to speak with Marc/Anthony about LOs
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
  const bodyText = currentEmail.body.join(' ').toLowerCase();

  // Must involve Brenda
  if (!to.includes('brenda') && !cc.includes('brenda') && !from.includes('brenda')) return false;

  // Look for patterns about speaking with Marc/Anthony
  const patterns = [
    'speak with marc',
    'speak with anthony',
    'speak to marc',
    'speak to anthony',
    'talk with marc',
    'talk with anthony',
    'talk to marc',
    'talk to anthony',
    'discuss with marc',
    'discuss with anthony',
    'check with marc',
    'check with anthony',
    'ask marc',
    'ask anthony',
    'let marc know',
    'let anthony know',
    'will speak',
    'will talk',
    'will discuss',
    'going to speak',
    'going to talk'
  ];

  for (const pattern of patterns) {
    if (bodyText.includes(pattern)) {
      return pattern;
    }
  }

  return false;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SEARCHING FOR "SPEAK WITH MARC/ANTHONY" EMAILS');
  console.log('='.repeat(60));
  console.log('\nThis may take a few minutes...\n');

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      if (currentEmail.from || currentEmail.to) {
        const matchedPattern = checkMatches();
        if (matchedPattern) {
          results.push({
            date: currentEmail.date,
            from: currentEmail.from,
            to: currentEmail.to,
            cc: currentEmail.cc,
            subject: currentEmail.subject,
            matchedPattern,
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
    const matchedPattern = checkMatches();
    if (matchedPattern) {
      results.push({
        date: currentEmail.date,
        from: currentEmail.from,
        to: currentEmail.to,
        cc: currentEmail.cc,
        subject: currentEmail.subject,
        matchedPattern,
        bodySnippet: currentEmail.body.join('\n').substring(0, 3000)
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  FOUND ' + results.length + ' EMAILS');
  console.log('='.repeat(60));

  fs.writeFileSync('./data/brenda-marc-anthony-emails.json', JSON.stringify(results, null, 2));

  // Filter for emails FROM David about LOs
  const fromDavid = results.filter(r =>
    r.from.toLowerCase().includes('davidyoung') ||
    r.from.toLowerCase().includes('dyoung')
  );

  console.log('\nEmails FROM David: ' + fromDavid.length);

  fromDavid.forEach((email, i) => {
    const body = email.bodySnippet.toLowerCase();
    const hasLO = body.includes('lo') || body.includes('loan officer') || body.includes('recruit') || body.includes('override');

    if (hasLO) {
      console.log('\n' + '='.repeat(50));
      console.log('Email #' + (i + 1));
      console.log('Date: ' + email.date);
      console.log('Subject: ' + email.subject);
      console.log('To: ' + email.to);
      console.log('Matched pattern: ' + email.matchedPattern);
      console.log('\nBody Preview:');

      // Clean and show
      const cleanBody = email.bodySnippet
        .replace(/Content-Type:.*$/gm, '')
        .replace(/Content-Transfer.*$/gm, '')
        .replace(/--.*$/gm, '')
        .replace(/=\r?\n/g, '')
        .replace(/=3D/g, '=')
        .replace(/=E2=80=99/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      console.log(cleanBody.substring(0, 1500));
      console.log('='.repeat(50));
    }
  });
}

main().catch(console.error);
