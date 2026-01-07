/**
 * Email Index Builder
 * Scans mbox files and indexes ALL emails by contact
 * Tracks From/To/CC for proper exchange detection
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// David Young's email addresses
const DAVID_EMAILS = [
  'david@lendwisemtg.com',
  'davidyoung@priorityfinancial.net',
  'dyoung@onenationhomeloans.com',
  'david@priorityfinancial.net',
  'davidyoung@onenationhomeloans.com'
].map(e => e.toLowerCase());

// Mbox file paths
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

const OUTPUT_PATH = './data/email-index.json';

/**
 * Extract all email addresses from a header line
 */
function extractEmails(headerValue) {
  if (!headerValue) return [];
  const matches = headerValue.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
  return matches.map(e => e.toLowerCase());
}

/**
 * Check if email is from David Young
 */
function isDavidEmail(email) {
  return DAVID_EMAILS.includes(email.toLowerCase());
}

/**
 * Parse a date from email header
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Scan a single mbox file and build index
 */
async function scanMbox(mboxPath, index) {
  if (!fs.existsSync(mboxPath)) {
    console.log('  Skipping (not found):', path.basename(mboxPath));
    return;
  }

  console.log('  Scanning:', path.basename(mboxPath));

  const rl = readline.createInterface({
    input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let current = {
    from: '',
    to: '',
    cc: '',
    subject: '',
    date: '',
    body: [],
    hasAttachment: false
  };
  let inHeaders = false;
  let inBody = false;
  let emailCount = 0;
  let currentHeader = '';

  for await (const line of rl) {
    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (current.from || current.to) {
        processEmail(current, index);
        emailCount++;
        if (emailCount % 10000 === 0) {
          console.log('    Processed:', emailCount, 'emails');
        }
      }
      current = {
        from: '',
        to: '',
        cc: '',
        subject: '',
        date: '',
        body: [],
        hasAttachment: false
      };
      inHeaders = true;
      inBody = false;
      currentHeader = '';
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

      // Continuation of previous header (starts with whitespace)
      if (line.match(/^\s/) && currentHeader) {
        if (currentHeader === 'from') current.from += ' ' + line.trim();
        else if (currentHeader === 'to') current.to += ' ' + line.trim();
        else if (currentHeader === 'cc') current.cc += ' ' + line.trim();
        else if (currentHeader === 'subject') current.subject += ' ' + line.trim();
      }
      // New header
      else if (lowerLine.startsWith('from:')) {
        current.from = line.substring(5).trim();
        currentHeader = 'from';
      }
      else if (lowerLine.startsWith('to:')) {
        current.to = line.substring(3).trim();
        currentHeader = 'to';
      }
      else if (lowerLine.startsWith('cc:')) {
        current.cc = line.substring(3).trim();
        currentHeader = 'cc';
      }
      else if (lowerLine.startsWith('subject:')) {
        current.subject = line.substring(8).trim();
        currentHeader = 'subject';
      }
      else if (lowerLine.startsWith('date:')) {
        current.date = line.substring(5).trim();
        currentHeader = 'date';
      }
      else if (lowerLine.startsWith('content-disposition:') && lowerLine.includes('attachment')) {
        current.hasAttachment = true;
        currentHeader = '';
      }
      else {
        currentHeader = '';
      }
    }

    // Capture body (limit for performance)
    if (inBody && current.body.length < 100) {
      current.body.push(line);

      // Check for attachment indicator in body
      if (line.includes('Content-Disposition: attachment')) {
        current.hasAttachment = true;
      }
    }
  }

  // Process last email
  if (current.from || current.to) {
    processEmail(current, index);
    emailCount++;
  }

  console.log('    Total:', emailCount, 'emails');
}

/**
 * Process a single email and update the index
 */
function processEmail(email, index) {
  const fromEmails = extractEmails(email.from);
  const toEmails = extractEmails(email.to);
  const ccEmails = extractEmails(email.cc);

  const allEmails = [...new Set([...fromEmails, ...toEmails, ...ccEmails])];
  const bodyText = email.body.join('\n');
  const date = parseDate(email.date);

  // Determine if David is sender or recipient
  const davidIsSender = fromEmails.some(e => isDavidEmail(e));
  const davidIsRecipient = [...toEmails, ...ccEmails].some(e => isDavidEmail(e));

  // Index each non-David email address
  for (const addr of allEmails) {
    if (isDavidEmail(addr)) continue;

    // Initialize contact if not exists
    if (!index[addr]) {
      index[addr] = {
        email: addr,
        altEmails: [],
        name: null,
        davidSent: 0,      // Emails David sent TO this contact
        davidReceived: 0,  // Emails David received FROM this contact
        totalEmails: 0,
        firstContact: null,
        lastContact: null,
        subjects: [],
        hasAttachments: false,
        emailIds: []       // Store email identifiers for later retrieval
      };
    }

    const contact = index[addr];
    contact.totalEmails++;

    // Track direction
    if (fromEmails.includes(addr) && davidIsRecipient) {
      // This contact sent an email that David received
      contact.davidReceived++;
    }
    if (davidIsSender && (toEmails.includes(addr) || ccEmails.includes(addr))) {
      // David sent an email to this contact
      contact.davidSent++;
    }

    // Update dates
    if (date) {
      if (!contact.firstContact || date < contact.firstContact) {
        contact.firstContact = date;
      }
      if (!contact.lastContact || date > contact.lastContact) {
        contact.lastContact = date;
      }
    }

    // Store subject samples (limit to 10)
    if (email.subject && contact.subjects.length < 10) {
      const subj = email.subject.substring(0, 100);
      if (!contact.subjects.includes(subj)) {
        contact.subjects.push(subj);
      }
    }

    // Track attachments
    if (email.hasAttachment) {
      contact.hasAttachments = true;
    }

    // Extract name from From header if this person sent the email
    if (fromEmails.includes(addr) && !contact.name) {
      const nameMatch = email.from.match(/^([^<@]+)/);
      if (nameMatch) {
        let name = nameMatch[1].replace(/"/g, '').replace(/'/g, '').trim();
        // Skip if name looks like an email or is too short
        if (name.length > 2 && !name.includes('@') && name.includes(' ')) {
          contact.name = name;
        }
      }
    }
  }

  // Track alternate emails (same name, different email)
  // This helps merge contacts like Jake Seamons with multiple emails
  for (const addr of allEmails) {
    if (isDavidEmail(addr)) continue;
    const contact = index[addr];
    if (!contact) continue;

    for (const otherAddr of allEmails) {
      if (otherAddr === addr || isDavidEmail(otherAddr)) continue;
      if (!contact.altEmails.includes(otherAddr)) {
        contact.altEmails.push(otherAddr);
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('  EMAIL INDEX BUILDER');
  console.log('='.repeat(60));
  console.log('');
  console.log('David Young emails:', DAVID_EMAILS.join(', '));
  console.log('');

  const index = {};

  // Scan all mbox files
  for (const mboxPath of MBOX_PATHS) {
    await scanMbox(mboxPath, index);
    console.log('');
  }

  // Calculate statistics
  const contacts = Object.values(index);
  const withExchange = contacts.filter(c => c.davidSent > 0 && c.davidReceived > 0);
  const davidSentOnly = contacts.filter(c => c.davidSent > 0 && c.davidReceived === 0);
  const davidReceivedOnly = contacts.filter(c => c.davidSent === 0 && c.davidReceived > 0);

  console.log('='.repeat(60));
  console.log('  INDEX COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Total unique contacts:', contacts.length);
  console.log('  With email exchange (both directions):', withExchange.length);
  console.log('  David sent only (no reply):', davidSentOnly.length);
  console.log('  David received only (no response from David):', davidReceivedOnly.length);
  console.log('');

  // Top contacts by exchange volume
  console.log('Top 20 contacts by exchange:');
  withExchange
    .sort((a, b) => (b.davidSent + b.davidReceived) - (a.davidSent + a.davidReceived))
    .slice(0, 20)
    .forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name || c.email} - Sent: ${c.davidSent}, Received: ${c.davidReceived}`);
    });

  // Save index
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
  console.log('');
  console.log('Index saved to:', OUTPUT_PATH);
  console.log('File size:', Math.round(fs.statSync(OUTPUT_PATH).size / 1024), 'KB');

  return index;
}

// Export for use by other modules
module.exports = { main, DAVID_EMAILS, isDavidEmail };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
