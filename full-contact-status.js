/**
 * Full Contact Status for David Young
 * Scans ALL sources and compares with GHL
 */

const fs = require('fs');
const https = require('https');
const readline = require('readline');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

// All mbox files
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Classification signals
const SIGNALS = {
  loanOfficer: {
    body: [
      /i\s*have\s*a\s*(client|borrower|customer)/i,
      /referring\s*(a|my|this)/i,
      /can\s*you\s*(quote|price|run)/i,
      /borrower[:\s]/i,
      /please\s*(call|contact)\s*(my|the)\s*(client|borrower)/i,
    ],
    signature: [
      /nmls\s*#?\s*\d+/i,
      /loan\s*officer/i,
      /mortgage\s*(loan\s*)?(officer|originator|consultant|banker|advisor)/i,
      /\bMLO\b/,
      /branch\s*manager/i,
    ]
  },
  client: {
    body: [
      /attached\s*(are\s*)?(my|the)\s*(pay\s*stub|w-?2|tax|bank\s*statement)/i,
      /here\s*(are|is)\s*my\s*(documents?|paperwork)/i,
      /my\s*(wife|husband|spouse)\s*and\s*i/i,
      /we\s*(are|want)\s*(to\s*)?(buy|purchase|refinance)/i,
      /when\s*(will|do)\s*(we|i)\s*(close|fund|sign)/i,
      /dob|ss#|social\s*security/i,
      /fico\s*\d{3}/i,
    ]
  }
};

const INTERNAL_DOMAINS = ['priorityfinancial.net', 'onenationhomeloans.com', 'lendwisemtg.com'];
const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'icloud.com', 'outlook.com', 'me.com', 'msn.com', 'comcast.net', 'sbcglobal.net', 'att.net', 'verizon.net', 'live.com', 'ymail.com'];

// GHL API
function ghlRequest(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getGHLContacts() {
  const contacts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const res = await ghlRequest(`/contacts/?locationId=${LOCATION_ID}&limit=100&page=${page}`);
    const batch = res.contacts || [];
    contacts.push(...batch);
    if (batch.length < 100) hasMore = false;
    page++;
  }
  return contacts;
}

async function scanMbox(mboxPath) {
  const contacts = {};

  if (!fs.existsSync(mboxPath)) {
    console.log('  Skipping (not found):', mboxPath.split('/').pop());
    return contacts;
  }

  console.log('  Scanning:', mboxPath.split('/').pop());

  const rl = readline.createInterface({
    input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let current = { from: '', to: '', cc: '', subject: '', body: [] };
  let inHeaders = false;
  let inBody = false;

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous
      if (current.from || current.to) {
        processEmail(current, contacts);
      }
      current = { from: '', to: '', cc: '', subject: '', body: [] };
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
      const lower = line.toLowerCase();
      if (lower.startsWith('from:')) current.from = line.substring(5).trim();
      else if (lower.startsWith('to:')) current.to = line.substring(3).trim();
      else if (lower.startsWith('cc:')) current.cc = line.substring(3).trim();
      else if (lower.startsWith('subject:')) current.subject = line.substring(8).trim();
    }

    if (inBody && current.body.length < 80) {
      current.body.push(line);
    }
  }

  if (current.from || current.to) {
    processEmail(current, contacts);
  }

  return contacts;
}

function processEmail(email, contacts) {
  // Extract all email addresses
  const allText = email.from + ' ' + email.to + ' ' + email.cc;
  const emails = allText.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];

  const bodyText = email.body.join('\n');

  emails.forEach(e => {
    const addr = e.toLowerCase();
    if (!contacts[addr]) {
      contacts[addr] = {
        email: addr,
        sentCount: 0,
        receivedCount: 0,
        subjects: [],
        hasNMLS: false,
        nmlsNumber: null,
        isLO: 0,
        isClient: 0,
        name: null
      };
    }

    const c = contacts[addr];

    // Determine direction
    if (email.from.toLowerCase().includes(addr)) {
      c.sentCount++;
    } else {
      c.receivedCount++;
    }

    // Store subject samples
    if (c.subjects.length < 3 && email.subject) {
      c.subjects.push(email.subject.substring(0, 60));
    }

    // Check for NMLS
    const nmlsMatch = bodyText.match(/nmls\s*#?\s*(\d{4,})/i);
    if (nmlsMatch && email.from.toLowerCase().includes(addr)) {
      c.hasNMLS = true;
      c.nmlsNumber = nmlsMatch[1];
    }

    // LO signals (only if THEY sent it)
    if (email.from.toLowerCase().includes(addr)) {
      SIGNALS.loanOfficer.body.forEach(p => { if (p.test(bodyText)) c.isLO++; });
      SIGNALS.loanOfficer.signature.forEach(p => { if (p.test(bodyText)) c.isLO++; });
    }

    // Client signals (only if THEY sent it OR you sent to them with their info)
    if (email.from.toLowerCase().includes(addr)) {
      SIGNALS.client.body.forEach(p => { if (p.test(bodyText)) c.isClient++; });
    }
    // Also check if YOU sent them an email with their personal info
    if (email.to.toLowerCase().includes(addr) || email.cc.toLowerCase().includes(addr)) {
      if (/dob|ss#|social\s*security|fico\s*\d{3}/i.test(bodyText)) {
        c.isClient += 2;
      }
    }

    // Try to extract name from From header
    if (!c.name && email.from.toLowerCase().includes(addr)) {
      const nameMatch = email.from.match(/^([^<@]+)/);
      if (nameMatch) {
        const name = nameMatch[1].replace(/"/g, '').trim();
        if (name && name.length > 1 && !name.includes('@')) {
          c.name = name;
        }
      }
    }
  });
}

function classifyContact(c) {
  const domain = c.email.split('@')[1];

  // Internal
  if (INTERNAL_DOMAINS.some(d => domain === d)) {
    return { type: 'internal', confidence: 100 };
  }

  // Has NMLS = likely LO
  if (c.hasNMLS) {
    // But check if they're a CLIENT who happens to be an LO
    if (c.isClient > c.isLO) {
      return { type: 'client_lo', confidence: 80 }; // LO who is YOUR client
    }
    return { type: 'loan_officer', confidence: 90 };
  }

  // Strong LO signals
  if (c.isLO >= 3) {
    return { type: 'loan_officer', confidence: 75 };
  }

  // Strong client signals
  if (c.isClient >= 2) {
    return { type: 'client', confidence: 75 };
  }

  // Personal email domain
  if (PERSONAL_DOMAINS.includes(domain)) {
    if (c.isClient > 0) return { type: 'client', confidence: 60 };
    return { type: 'prospect', confidence: 50 };
  }

  // Some LO signals
  if (c.isLO > 0) {
    return { type: 'loan_officer', confidence: 50 };
  }

  // Some client signals
  if (c.isClient > 0) {
    return { type: 'client', confidence: 50 };
  }

  return { type: 'unknown', confidence: 20 };
}

async function main() {
  console.log('='.repeat(70));
  console.log('  FULL CONTACT STATUS - DAVID YOUNG');
  console.log('='.repeat(70));

  // 1. Get GHL contacts
  console.log('\n1. Fetching GHL contacts...');
  const ghlContacts = await getGHLContacts();
  console.log('   Found:', ghlContacts.length, 'contacts in GHL');

  const ghlEmails = new Set(ghlContacts.map(c => (c.email || '').toLowerCase()).filter(e => e));

  // 2. Scan mbox files
  console.log('\n2. Scanning email archives...');
  let allMboxContacts = {};
  for (const path of MBOX_PATHS) {
    const contacts = await scanMbox(path);
    // Merge
    for (const [email, data] of Object.entries(contacts)) {
      if (!allMboxContacts[email]) {
        allMboxContacts[email] = data;
      } else {
        const existing = allMboxContacts[email];
        existing.sentCount += data.sentCount;
        existing.receivedCount += data.receivedCount;
        if (data.hasNMLS) existing.hasNMLS = true;
        if (data.nmlsNumber) existing.nmlsNumber = data.nmlsNumber;
        existing.isLO += data.isLO;
        existing.isClient += data.isClient;
        if (!existing.name && data.name) existing.name = data.name;
        data.subjects.forEach(s => {
          if (existing.subjects.length < 3) existing.subjects.push(s);
        });
      }
    }
  }
  console.log('   Found:', Object.keys(allMboxContacts).length, 'unique email addresses');

  // 3. Load extracted contact files
  console.log('\n3. Loading extracted contact files...');
  const pf = JSON.parse(fs.readFileSync('./data/priority-contacts.json'));
  const on = JSON.parse(fs.readFileSync('./data/onenation-contacts-final.json'));

  const pfEmails = new Set((pf.contacts || []).map(c => {
    const match = (c.email || c.name || '').toLowerCase().match(/[\w.-]+@[\w.-]+/);
    return match ? match[0] : null;
  }).filter(e => e));

  const onEmails = new Set((on.contacts || []).map(c => (c.email || '').toLowerCase()).filter(e => e));

  // Merge One Nation data (has names)
  (on.contacts || []).forEach(c => {
    const email = (c.email || '').toLowerCase();
    if (email && allMboxContacts[email]) {
      if (c.firstName || c.lastName) {
        allMboxContacts[email].name = (c.firstName + ' ' + c.lastName).trim();
      }
    }
  });

  console.log('   Priority Financial file:', pfEmails.size, 'emails');
  console.log('   One Nation file:', onEmails.size, 'emails');

  // 4. Classify all contacts
  console.log('\n4. Classifying contacts...');

  const results = {
    inGHL: {
      loan_officer: [],
      client: [],
      client_lo: [],
      prospect: [],
      internal: [],
      unknown: []
    },
    notInGHL: {
      loan_officer: [],
      client: [],
      client_lo: [],
      prospect: [],
      internal: [],
      unknown: []
    }
  };

  for (const [email, contact] of Object.entries(allMboxContacts)) {
    const { type, confidence } = classifyContact(contact);
    const inGHL = ghlEmails.has(email);
    const bucket = inGHL ? results.inGHL : results.notInGHL;

    bucket[type].push({
      email,
      name: contact.name,
      confidence,
      sent: contact.sentCount,
      received: contact.receivedCount,
      hasNMLS: contact.hasNMLS,
      nmlsNumber: contact.nmlsNumber,
      subjects: contact.subjects
    });
  }

  // Sort by confidence
  for (const section of [results.inGHL, results.notInGHL]) {
    for (const type of Object.keys(section)) {
      section[type].sort((a, b) => b.confidence - a.confidence);
    }
  }

  // 5. Print results
  console.log('\n' + '='.repeat(70));
  console.log('  IN GHL (already imported)');
  console.log('='.repeat(70));

  for (const [type, contacts] of Object.entries(results.inGHL)) {
    if (contacts.length === 0) continue;
    console.log(`\n${type.toUpperCase()}: ${contacts.length}`);
    contacts.slice(0, 5).forEach(c => {
      const nmls = c.hasNMLS ? ` [NMLS:${c.nmlsNumber}]` : '';
      const name = c.name ? ` (${c.name})` : '';
      console.log(`  ${c.confidence}% ${c.email}${name}${nmls}`);
    });
    if (contacts.length > 5) console.log(`  ... and ${contacts.length - 5} more`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  NOT IN GHL (need to import)');
  console.log('='.repeat(70));

  for (const [type, contacts] of Object.entries(results.notInGHL)) {
    if (contacts.length === 0) continue;
    console.log(`\n${type.toUpperCase()}: ${contacts.length}`);
    contacts.slice(0, 10).forEach(c => {
      const nmls = c.hasNMLS ? ` [NMLS:${c.nmlsNumber}]` : '';
      const name = c.name ? ` (${c.name})` : '';
      console.log(`  ${c.confidence}% ${c.email}${name}${nmls}`);
    });
    if (contacts.length > 10) console.log(`  ... and ${contacts.length - 10} more`);
  }

  // 6. Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));

  const inGHLTotal = Object.values(results.inGHL).reduce((sum, arr) => sum + arr.length, 0);
  const notInGHLTotal = Object.values(results.notInGHL).reduce((sum, arr) => sum + arr.length, 0);

  console.log('\nIN GHL:');
  console.log('  Loan Officers:    ', results.inGHL.loan_officer.length);
  console.log('  Clients (LOs):    ', results.inGHL.client_lo.length);
  console.log('  Clients:          ', results.inGHL.client.length);
  console.log('  Prospects:        ', results.inGHL.prospect.length);
  console.log('  Internal:         ', results.inGHL.internal.length);
  console.log('  Unknown:          ', results.inGHL.unknown.length);
  console.log('  TOTAL:            ', inGHLTotal);

  console.log('\nNOT IN GHL (ready to import):');
  console.log('  Loan Officers:    ', results.notInGHL.loan_officer.length);
  console.log('  Clients (LOs):    ', results.notInGHL.client_lo.length);
  console.log('  Clients:          ', results.notInGHL.client.length);
  console.log('  Prospects:        ', results.notInGHL.prospect.length);
  console.log('  Internal:         ', results.notInGHL.internal.length, '(exclude)');
  console.log('  Unknown:          ', results.notInGHL.unknown.length, '(needs review)');
  console.log('  TOTAL:            ', notInGHLTotal);

  // Save full results
  fs.writeFileSync('./data/full-contact-status.json', JSON.stringify(results, null, 2));
  console.log('\nFull results saved to: data/full-contact-status.json');
}

main().catch(console.error);
