/**
 * Classify contacts by analyzing actual email content
 * Scans mbox for relationship signals to determine:
 * - Loan Officers (referral partners)
 * - Clients/Borrowers
 * - Vendors
 * - Internal/Colleagues
 * - Unknown
 */

const fs = require('fs');
const readline = require('readline');

// Mbox paths
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Classification signals
const SIGNALS = {
  loanOfficer: {
    subject: [
      /referr(al|ing)/i,
      /client.*for\s*you/i,
      /deal\s*(for|coming)/i,
      /scenario/i,
      /pre-?qual/i,
      /rate\s*quote/i,
      /can\s*you\s*(quote|help|do)/i,
      /sending\s*(you\s*)?(a\s*)?client/i,
    ],
    body: [
      /i\s*have\s*a\s*(client|borrower|customer)/i,
      /referring\s*(a|my|this)/i,
      /here['']?s\s*a\s*(deal|scenario|client)/i,
      /can\s*you\s*(quote|price|run)/i,
      /purchase\s*price[:\s]*\$?[\d,]+/i,
      /loan\s*amount[:\s]*\$?[\d,]+/i,
      /credit\s*score[:\s]*\d{3}/i,
      /property\s*(address|located)/i,
      /borrower[:\s]/i,
      /co-?borrower/i,
      /please\s*(call|contact)\s*(my|the)\s*(client|borrower)/i,
    ],
    signature: [
      /nmls\s*#?\s*\d+/i,
      /loan\s*officer/i,
      /mortgage\s*(loan\s*)?(officer|originator|consultant|banker|advisor)/i,
      /\bMLO\b/,
      /\bLO\b.*\bNMLS\b/i,
      /branch\s*manager/i,
      /senior\s*loan/i,
      /licensed\s*(in|mortgage)/i,
    ]
  },
  client: {
    subject: [
      /my\s*(loan|mortgage|application|closing)/i,
      /documents?\s*(attached|enclosed)/i,
      /question\s*about\s*my/i,
      /when\s*(do|will|can)\s*i/i,
    ],
    body: [
      /attached\s*(are\s*)?(my|the)\s*(pay\s*stub|w-?2|tax|bank\s*statement)/i,
      /here\s*(are|is)\s*my\s*(documents?|paperwork)/i,
      /my\s*(wife|husband|spouse)\s*and\s*i/i,
      /we\s*(are|want)\s*(to\s*)?(buy|purchase|refinance)/i,
      /our\s*(new\s*)?home/i,
      /when\s*(will|do)\s*(we|i)\s*(close|fund|sign)/i,
      /my\s*credit\s*score/i,
      /first\s*time\s*(home\s*)?buyer/i,
    ],
    signature: [
      // Clients typically don't have professional signatures
    ]
  },
  vendor: {
    subject: [
      /appraisal\s*(report|ordered|completed)/i,
      /title\s*(report|commitment|insurance)/i,
      /escrow\s*(instructions|opened)/i,
      /invoice/i,
      /underwriting\s*(decision|approval|conditions)/i,
    ],
    body: [
      /please\s*find\s*(attached|enclosed)\s*(the\s*)?(appraisal|title)/i,
      /preliminary\s*title/i,
      /closing\s*disclosure/i,
      /wire\s*instructions/i,
      /notary/i,
    ],
    signature: [
      /title\s*(officer|company)/i,
      /escrow\s*officer/i,
      /appraiser/i,
      /underwriter/i,
    ]
  }
};

// Internal domains
const INTERNAL_DOMAINS = ['priorityfinancial.net', 'onenationhomeloans.com', 'lendwisemtg.com'];

// Known mortgage company domains (competitors, not referral sources usually)
const COMPETITOR_DOMAINS = ['movement.com', 'rate.com', 'quickenloans.com', 'loandepot.com', 'rfrateupdate.com'];

// Personal email domains
const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'icloud.com', 'outlook.com', 'me.com', 'msn.com', 'comcast.net', 'sbcglobal.net', 'att.net', 'verizon.net', 'live.com', 'ymail.com'];

async function scanMbox(mboxPath, targetEmails = null) {
  const emailData = {};

  if (!fs.existsSync(mboxPath)) {
    console.log('Mbox not found:', mboxPath);
    return emailData;
  }

  console.log('Scanning:', mboxPath);

  const rl = readline.createInterface({
    input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = { from: '', to: '', subject: '', body: [], signature: '' };
  let inHeaders = false;
  let inBody = false;
  let lineCount = 0;
  let emailCount = 0;

  for await (const line of rl) {
    lineCount++;

    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (currentEmail.from || currentEmail.to) {
        processEmail(currentEmail, emailData, targetEmails);
        emailCount++;
      }

      currentEmail = { from: '', to: '', cc: '', subject: '', body: [], signature: '' };
      inHeaders = true;
      inBody = false;
      continue;
    }

    // End of headers
    if (line === '' && inHeaders) {
      inHeaders = false;
      inBody = true;
      continue;
    }

    // Parse headers
    if (inHeaders) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('from:')) currentEmail.from = line.substring(5).trim();
      else if (lowerLine.startsWith('to:')) currentEmail.to = line.substring(3).trim();
      else if (lowerLine.startsWith('cc:')) currentEmail.cc = line.substring(3).trim();
      else if (lowerLine.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
    }

    // Capture body (limit to first 100 lines for performance)
    if (inBody && currentEmail.body.length < 100) {
      currentEmail.body.push(line);
    }
  }

  // Process last email
  if (currentEmail.from || currentEmail.to) {
    processEmail(currentEmail, emailData, targetEmails);
    emailCount++;
  }

  console.log('Processed', emailCount, 'emails');
  return emailData;
}

function processEmail(email, emailData, targetEmails) {
  // Extract email addresses
  const fromMatch = email.from.match(/[\w.-]+@[\w.-]+/);
  const fromEmail = fromMatch ? fromMatch[0].toLowerCase() : null;

  // Skip if not in target list (if provided)
  if (targetEmails && fromEmail && !targetEmails.includes(fromEmail)) {
    // Check to/cc as well
    const toMatch = email.to.match(/[\w.-]+@[\w.-]+/g) || [];
    const ccMatch = email.cc ? email.cc.match(/[\w.-]+@[\w.-]+/g) || [] : [];
    const allRecipients = [...toMatch, ...ccMatch].map(e => e.toLowerCase());

    const hasTarget = allRecipients.some(e => targetEmails.includes(e));
    if (!hasTarget) return;
  }

  if (!fromEmail) return;

  // Initialize or update contact
  if (!emailData[fromEmail]) {
    emailData[fromEmail] = {
      email: fromEmail,
      signals: {
        loanOfficer: { subject: 0, body: 0, signature: 0 },
        client: { subject: 0, body: 0, signature: 0 },
        vendor: { subject: 0, body: 0, signature: 0 }
      },
      sampleSubjects: [],
      emailCount: 0,
      hasNMLS: false,
      nmlsNumber: null
    };
  }

  const contact = emailData[fromEmail];
  contact.emailCount++;

  // Store sample subjects
  if (contact.sampleSubjects.length < 5 && email.subject) {
    contact.sampleSubjects.push(email.subject.substring(0, 80));
  }

  const bodyText = email.body.join('\n');
  const fullText = email.subject + '\n' + bodyText;

  // Check for NMLS number (strong LO indicator)
  const nmlsMatch = fullText.match(/nmls\s*#?\s*(\d{4,})/i);
  if (nmlsMatch) {
    contact.hasNMLS = true;
    contact.nmlsNumber = nmlsMatch[1];
  }

  // Score each category
  for (const [category, patterns] of Object.entries(SIGNALS)) {
    // Subject patterns
    for (const pattern of patterns.subject || []) {
      if (pattern.test(email.subject)) {
        contact.signals[category].subject++;
      }
    }

    // Body patterns
    for (const pattern of patterns.body || []) {
      if (pattern.test(bodyText)) {
        contact.signals[category].body++;
      }
    }

    // Signature patterns (check last 20 lines)
    const sigLines = email.body.slice(-20).join('\n');
    for (const pattern of patterns.signature || []) {
      if (pattern.test(sigLines)) {
        contact.signals[category].signature++;
      }
    }
  }
}

function classifyContact(contact) {
  const scores = {
    loanOfficer: 0,
    client: 0,
    vendor: 0,
    internal: 0,
    unknown: 0
  };

  const domain = contact.email.split('@')[1];

  // Check internal
  if (INTERNAL_DOMAINS.some(d => domain.includes(d))) {
    scores.internal = 100;
    return { classification: 'internal', confidence: 100, scores };
  }

  // NMLS is strong LO signal
  if (contact.hasNMLS) {
    scores.loanOfficer += 40;
  }

  // Score from content signals
  const lo = contact.signals.loanOfficer;
  scores.loanOfficer += (lo.subject * 15) + (lo.body * 10) + (lo.signature * 25);

  const cl = contact.signals.client;
  scores.client += (cl.subject * 15) + (cl.body * 12) + (cl.signature * 5);

  const vn = contact.signals.vendor;
  scores.vendor += (vn.subject * 12) + (vn.body * 10) + (vn.signature * 20);

  // Personal email domain boosts client likelihood
  if (PERSONAL_DOMAINS.includes(domain)) {
    scores.client += 15;
  }

  // Find highest score
  const maxScore = Math.max(...Object.values(scores));
  let classification = 'unknown';

  if (maxScore >= 20) {
    classification = Object.entries(scores).find(([k, v]) => v === maxScore)[0];
  }

  // Calculate confidence (0-100)
  const totalSignals = lo.subject + lo.body + lo.signature + cl.subject + cl.body + cl.signature + vn.subject + vn.body + vn.signature;
  let confidence = Math.min(95, maxScore);

  if (totalSignals === 0) {
    confidence = 10; // No signals, low confidence
  }

  return { classification, confidence, scores };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CONTACT CLASSIFICATION BY EMAIL CONTENT');
  console.log('='.repeat(60));
  console.log('');

  // Load existing contacts to analyze
  const pf = JSON.parse(fs.readFileSync('./data/priority-contacts.json'));
  const on = JSON.parse(fs.readFileSync('./data/onenation-contacts-final.json'));

  const allEmails = new Set();
  (pf.contacts || []).forEach(c => {
    const email = (c.email || c.name || '').toLowerCase();
    const match = email.match(/[\w.-]+@[\w.-]+/);
    if (match) allEmails.add(match[0]);
  });
  (on.contacts || []).forEach(c => {
    if (c.email) allEmails.add(c.email.toLowerCase());
  });

  console.log('Total contacts to classify:', allEmails.size);
  console.log('');

  // Scan mbox files
  let emailData = {};
  for (const mboxPath of MBOX_PATHS) {
    const data = await scanMbox(mboxPath, Array.from(allEmails));
    emailData = { ...emailData, ...data };
  }

  console.log('\nContacts with email content found:', Object.keys(emailData).length);

  // Classify each contact
  const results = {
    loanOfficer: [],
    client: [],
    vendor: [],
    internal: [],
    unknown: []
  };

  for (const [email, contact] of Object.entries(emailData)) {
    const { classification, confidence, scores } = classifyContact(contact);
    results[classification].push({
      email,
      confidence,
      scores,
      emailCount: contact.emailCount,
      hasNMLS: contact.hasNMLS,
      nmlsNumber: contact.nmlsNumber,
      sampleSubjects: contact.sampleSubjects,
      signals: contact.signals
    });
  }

  // Sort by confidence
  for (const category of Object.keys(results)) {
    results[category].sort((a, b) => b.confidence - a.confidence);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  CLASSIFICATION RESULTS');
  console.log('='.repeat(60));

  console.log('\nLOAN OFFICERS (referral partners):', results.loanOfficer.length);
  console.log('Top 20:');
  results.loanOfficer.slice(0, 20).forEach(c => {
    const nmls = c.hasNMLS ? ` [NMLS: ${c.nmlsNumber}]` : '';
    console.log(`  ${c.confidence}% - ${c.email}${nmls}`);
    if (c.sampleSubjects.length > 0) {
      console.log(`       Subject: "${c.sampleSubjects[0]}"`);
    }
  });

  console.log('\nCLIENTS/BORROWERS:', results.client.length);
  console.log('Top 20:');
  results.client.slice(0, 20).forEach(c => {
    console.log(`  ${c.confidence}% - ${c.email}`);
  });

  console.log('\nVENDORS:', results.vendor.length);
  console.log('Top 10:');
  results.vendor.slice(0, 10).forEach(c => {
    console.log(`  ${c.confidence}% - ${c.email}`);
  });

  console.log('\nINTERNAL:', results.internal.length);
  console.log('\nUNKNOWN:', results.unknown.length);

  // Save full results
  fs.writeFileSync('./data/contact-classification.json', JSON.stringify(results, null, 2));
  console.log('\nFull results saved to: data/contact-classification.json');

  // Quick stats
  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Loan Officers:  ${results.loanOfficer.length} (ready to tag)`);
  console.log(`  Clients:        ${results.client.length} (ready to tag)`);
  console.log(`  Vendors:        ${results.vendor.length} (ready to tag)`);
  console.log(`  Internal:       ${results.internal.length} (exclude)`);
  console.log(`  Unknown:        ${results.unknown.length} (needs review)`);
}

main().catch(console.error);
