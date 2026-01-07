/**
 * Extract phone numbers from email signatures
 * Scans mbox files to find phone numbers in email bodies
 */

const fs = require('fs');
const readline = require('readline');

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Phone number patterns
const PHONE_PATTERNS = [
  /(?:phone|cell|mobile|office|direct|tel|fax)?[:\s]*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/gi,
  /(?:phone|cell|mobile|office|direct|tel)?[:\s]*1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/gi
];

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

  let current = { from: '', body: [] };
  let inHeaders = false;
  let inBody = false;
  let emailCount = 0;

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (current.from) {
        processEmail(current, contacts);
        emailCount++;
      }
      current = { from: '', body: [] };
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
      if (line.toLowerCase().startsWith('from:')) {
        current.from = line.substring(5).trim();
      }
    }

    // Capture body - focus on signature area (last 50 lines are most important)
    if (inBody && current.body.length < 100) {
      current.body.push(line);
    }
  }

  // Process last email
  if (current.from) {
    processEmail(current, contacts);
    emailCount++;
  }

  console.log('    Processed', emailCount, 'emails');
  return contacts;
}

function processEmail(email, contacts) {
  // Extract sender email
  const emailMatch = email.from.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (!emailMatch) return;

  const senderEmail = emailMatch[0].toLowerCase();

  // Extract name from From header
  let name = null;
  const nameMatch = email.from.match(/^([^<@]+)/);
  if (nameMatch) {
    name = nameMatch[1].replace(/"/g, '').trim();
    if (name.includes('@') || name.length < 2) name = null;
  }

  // Search for phone numbers in body (especially signature area)
  const bodyText = email.body.join('\n');
  const signatureText = email.body.slice(-30).join('\n'); // Last 30 lines = signature

  let phones = [];

  // Look for phone patterns
  const phoneMatches = bodyText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  phoneMatches.forEach(p => {
    // Normalize phone
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) {
      const formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      if (!phones.includes(formatted)) {
        phones.push(formatted);
      }
    }
  });

  // Update or create contact
  if (!contacts[senderEmail]) {
    contacts[senderEmail] = {
      email: senderEmail,
      name: name,
      phones: [],
      emailCount: 0
    };
  }

  const c = contacts[senderEmail];
  c.emailCount++;
  if (!c.name && name) c.name = name;

  // Add new phones
  phones.forEach(p => {
    if (!c.phones.includes(p)) {
      c.phones.push(p);
    }
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  EXTRACTING PHONE NUMBERS FROM EMAILS');
  console.log('='.repeat(60));
  console.log('');

  let allContacts = {};

  for (const path of MBOX_PATHS) {
    const contacts = await scanMbox(path);

    // Merge
    for (const [email, data] of Object.entries(contacts)) {
      if (!allContacts[email]) {
        allContacts[email] = data;
      } else {
        const existing = allContacts[email];
        existing.emailCount += data.emailCount;
        if (!existing.name && data.name) existing.name = data.name;
        data.phones.forEach(p => {
          if (!existing.phones.includes(p)) {
            existing.phones.push(p);
          }
        });
      }
    }
  }

  // Count contacts with phones
  const withPhones = Object.values(allContacts).filter(c => c.phones.length > 0);

  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS');
  console.log('='.repeat(60));
  console.log('\nTotal unique senders:', Object.keys(allContacts).length);
  console.log('Contacts WITH phone numbers:', withPhones.length);

  console.log('\nSample contacts with phones:');
  withPhones.slice(0, 30).forEach(c => {
    console.log('  ' + (c.name || 'Unknown') + ' | ' + c.email + ' | ' + c.phones[0]);
  });

  // Save results
  fs.writeFileSync('./data/extracted-phones.json', JSON.stringify(allContacts, null, 2));
  console.log('\nSaved to: data/extracted-phones.json');
}

main().catch(console.error);
