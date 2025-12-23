/**
 * Deep search mbox for specific emails
 * Looking for: overrides, quitting discussion, contract, LO list, comp tiers
 */

const fs = require('fs');
const readline = require('readline');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Target recipients/senders
const targetEmails = [
  'lockdesk@priorityfinancial.net',
  'brenda@priorityfinancial.net',
  'marcshenkman@priorityfinancial.net',
  'hr@priorityfinancial.net',
  'shenkman'
];

// Keywords to search for
const keywords = [
  'override',
  'overide',  // common misspelling
  'quit',
  'quitting',
  'resign',
  'resignation',
  'contract',
  'tier',
  'gold tier',
  'silver tier',
  'bronze tier',
  'compensation',
  'comp plan',
  'onboard',
  'brought on',
  'my los',
  'my loan officers',
  'branch'
];

const results = [];
let currentEmail = {
  from: '',
  to: '',
  cc: '',
  subject: '',
  date: '',
  body: [],
  matched: false,
  matchedKeywords: []
};

let emailCount = 0;
let inHeaders = false;
let inBody = false;

function checkMatches() {
  const fromLower = currentEmail.from.toLowerCase();
  const toLower = currentEmail.to.toLowerCase();
  const ccLower = currentEmail.cc.toLowerCase();
  const subjectLower = currentEmail.subject.toLowerCase();
  const bodyText = currentEmail.body.join(' ').toLowerCase();

  // Check if involves target emails
  const involvesTarget = targetEmails.some(t =>
    fromLower.includes(t) || toLower.includes(t) || ccLower.includes(t)
  );

  if (!involvesTarget) return false;

  // Check for keywords in subject or body
  const matchedKw = [];
  for (const kw of keywords) {
    if (subjectLower.includes(kw) || bodyText.includes(kw)) {
      matchedKw.push(kw);
    }
  }

  if (matchedKw.length > 0) {
    currentEmail.matchedKeywords = [...new Set(matchedKw)];
    return true;
  }

  return false;
}

function saveEmail() {
  if (checkMatches()) {
    // Extract relevant body snippet (first 500 chars with keyword context)
    const bodyText = currentEmail.body.join('\n');
    let snippet = '';

    for (const kw of currentEmail.matchedKeywords) {
      const idx = bodyText.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(bodyText.length, idx + 300);
        snippet = '...' + bodyText.substring(start, end).replace(/\n+/g, ' ').trim() + '...';
        break;
      }
    }

    results.push({
      date: currentEmail.date,
      from: currentEmail.from,
      to: currentEmail.to,
      subject: currentEmail.subject,
      keywords: currentEmail.matchedKeywords,
      snippet: snippet.substring(0, 500)
    });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  DEEP EMAIL SEARCH - Priority Financial');
  console.log('='.repeat(60));
  console.log('\nSearching for emails involving:');
  targetEmails.forEach(e => console.log('  - ' + e));
  console.log('\nWith keywords:', keywords.slice(0, 10).join(', ') + '...');
  console.log('\nProcessing mbox file...\n');

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // New email
    if (line.startsWith('From ') && line.includes('@')) {
      // Save previous email
      if (currentEmail.from || currentEmail.to) {
        saveEmail();
      }

      emailCount++;
      if (emailCount % 5000 === 0) {
        console.log('Processed ' + emailCount + ' emails, found ' + results.length + ' matches...');
      }

      currentEmail = {
        from: '',
        to: '',
        cc: '',
        subject: '',
        date: '',
        body: [],
        matched: false,
        matchedKeywords: []
      };
      inHeaders = true;
      inBody = false;
      continue;
    }

    // Empty line = end of headers
    if (line === '' && inHeaders) {
      inHeaders = false;
      inBody = true;
      continue;
    }

    // Parse headers
    if (inHeaders) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('from:')) {
        currentEmail.from = line.substring(5).trim();
      } else if (lowerLine.startsWith('to:')) {
        currentEmail.to = line.substring(3).trim();
      } else if (lowerLine.startsWith('cc:')) {
        currentEmail.cc = line.substring(3).trim();
      } else if (lowerLine.startsWith('subject:')) {
        currentEmail.subject = line.substring(8).trim();
      } else if (lowerLine.startsWith('date:')) {
        currentEmail.date = line.substring(5).trim();
      }
    }

    // Collect body (limit to first 200 lines to avoid memory issues)
    if (inBody && currentEmail.body.length < 200) {
      currentEmail.body.push(line);
    }
  }

  // Save last email
  if (currentEmail.from || currentEmail.to) {
    saveEmail();
  }

  console.log('\n' + '='.repeat(60));
  console.log('  SEARCH COMPLETE');
  console.log('='.repeat(60));
  console.log('\nTotal emails scanned: ' + emailCount);
  console.log('Matching emails found: ' + results.length);

  // Save results
  fs.writeFileSync('./data/email-search-results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to: data/email-search-results.json');

  // Display results
  if (results.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('  MATCHING EMAILS');
    console.log('='.repeat(60));

    results.forEach((r, i) => {
      console.log('\n--- Email ' + (i + 1) + ' ---');
      console.log('Date: ' + r.date);
      console.log('From: ' + r.from);
      console.log('To: ' + r.to);
      console.log('Subject: ' + r.subject);
      console.log('Keywords: ' + r.keywords.join(', '));
      console.log('Snippet: ' + r.snippet);
    });
  }
}

main().catch(console.error);
