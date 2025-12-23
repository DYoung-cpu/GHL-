/**
 * Search for emails FROM Brenda about speaking with Marc/Anthony regarding LOs
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
  const bodyText = currentEmail.body.join(' ').toLowerCase();

  // Must be FROM Brenda
  if (!from.includes('brenda')) return false;

  // Must be TO David
  if (!to.includes('davidyoung') && !to.includes('dyoung')) return false;

  // Look for patterns about Marc/Anthony + LO discussion
  const hasMarcAnthony = bodyText.includes('marc') || bodyText.includes('anthony');
  const hasLO = bodyText.includes('lo ') || bodyText.includes('loan officer') ||
                bodyText.includes('override') || bodyText.includes('recruit') ||
                bodyText.includes('list') || bodyText.includes('onboard');
  const hasSpeakPattern = bodyText.includes('speak') || bodyText.includes('discuss') ||
                          bodyText.includes('talk') || bodyText.includes('check') ||
                          bodyText.includes('will follow') || bodyText.includes('get back');

  return hasMarcAnthony && (hasLO || hasSpeakPattern);
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SEARCHING FOR BRENDA\'S RESPONSES ABOUT MARC/ANTHONY');
  console.log('='.repeat(60));
  console.log('\nLooking for emails FROM Brenda TO David mentioning Marc/Anthony...\n');

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
        subject: currentEmail.subject,
        bodySnippet: currentEmail.body.join('\n').substring(0, 3000)
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  FOUND ' + results.length + ' EMAILS FROM BRENDA');
  console.log('='.repeat(60));

  fs.writeFileSync('./data/brenda-responses.json', JSON.stringify(results, null, 2));

  results.forEach((email, i) => {
    console.log('\n' + '='.repeat(50));
    console.log('Email #' + (i + 1));
    console.log('Date: ' + email.date);
    console.log('Subject: ' + email.subject);
    console.log('To: ' + email.to);
    console.log('\nBody Preview:');

    const cleanBody = email.bodySnippet
      .replace(/Content-Type:.*$/gm, '')
      .replace(/Content-Transfer.*$/gm, '')
      .replace(/--.*$/gm, '')
      .replace(/=\r?\n/g, '')
      .replace(/=3D/g, '=')
      .replace(/=E2=80=99/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(cleanBody.substring(0, 1200));
    console.log('='.repeat(50));
  });
}

main().catch(console.error);
