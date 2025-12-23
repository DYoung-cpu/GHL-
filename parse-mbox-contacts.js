/**
 * MBOX Contact Extractor - Phase 1
 * Streams through large mbox file and extracts contacts from headers
 * Designed for 8GB+ files - uses streaming, not loading into memory
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts.json';
const PROGRESS_INTERVAL = 10000; // Log progress every N emails

// Contact storage - using Map for deduplication by email
const contacts = new Map();
let emailCount = 0;
let lineCount = 0;
let currentEmail = {};
let inHeaders = false;

// Parse email address from header value like "John Smith <john@example.com>" or just "john@example.com"
function parseEmailField(value) {
  const results = [];
  if (!value) return results;

  // Handle multiple addresses separated by comma
  const parts = value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Pattern: "Name" <email> or Name <email>
    const angleMatch = trimmed.match(/(?:"?([^"<]+)"?\s*)?<([^>]+)>/);
    if (angleMatch) {
      const name = angleMatch[1]?.trim() || '';
      const email = angleMatch[2]?.trim().toLowerCase();
      if (email && email.includes('@')) {
        results.push({ name, email });
      }
      continue;
    }

    // Pattern: just email@domain.com
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      results.push({ name: '', email: emailMatch[1].toLowerCase() });
    }
  }

  return results;
}

// Parse name into first/last
function parseName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };

  // Decode quoted-printable if needed
  let decoded = fullName;
  if (fullName.includes('=?')) {
    try {
      decoded = fullName.replace(/=\?[^?]+\?[BQ]\?([^?]+)\?=/gi, (match, encoded) => {
        try {
          return Buffer.from(encoded, 'base64').toString('utf-8');
        } catch {
          return encoded;
        }
      });
    } catch {}
  }

  // Remove quotes
  decoded = decoded.replace(/"/g, '').trim();

  // Skip if it looks like an email or company name
  if (decoded.includes('@') || decoded.includes('noreply') || decoded.includes('no-reply')) {
    return { firstName: '', lastName: '' };
  }

  const parts = decoded.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else {
    // Take first and last parts
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
  }
}

// Add contact to map with deduplication
function addContact(email, name, type) {
  if (!email || !email.includes('@')) return;

  // Skip obvious non-contacts
  const skipPatterns = [
    'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
    'bounce', 'unsubscribe', 'mailchimp', 'sendgrid', 'amazonses',
    'notifications', 'alert', 'system', 'automated', 'daemon'
  ];

  const emailLower = email.toLowerCase();
  if (skipPatterns.some(p => emailLower.includes(p))) return;

  const existing = contacts.get(emailLower);
  const { firstName, lastName } = parseName(name);

  if (existing) {
    existing.occurrences++;
    if (type === 'sent_to') existing.sentTo++;
    if (type === 'received_from') existing.receivedFrom++;
    // Update name if we have better info
    if (!existing.firstName && firstName) existing.firstName = firstName;
    if (!existing.lastName && lastName) existing.lastName = lastName;
    if (!existing.fullName && name) existing.fullName = name;
  } else {
    contacts.set(emailLower, {
      email: emailLower,
      firstName,
      lastName,
      fullName: name || '',
      occurrences: 1,
      sentTo: type === 'sent_to' ? 1 : 0,
      receivedFrom: type === 'received_from' ? 1 : 0,
      firstSeen: new Date().toISOString()
    });
  }
}

// Process completed email
function processEmail() {
  if (!currentEmail.from && !currentEmail.to) return;

  // Determine if this is sent or received
  const fromEmail = currentEmail.from?.[0]?.email || '';
  const isSent = fromEmail.includes('dyoung') || fromEmail.includes('onenation');

  // Add From contacts
  if (currentEmail.from) {
    for (const contact of currentEmail.from) {
      addContact(contact.email, contact.name, 'received_from');
    }
  }

  // Add To contacts (these are people David sent to if isSent)
  if (currentEmail.to) {
    for (const contact of currentEmail.to) {
      addContact(contact.email, contact.name, isSent ? 'sent_to' : 'cc_with');
    }
  }

  // Add CC contacts
  if (currentEmail.cc) {
    for (const contact of currentEmail.cc) {
      addContact(contact.email, contact.name, 'cc');
    }
  }

  // Add Reply-To contacts
  if (currentEmail.replyTo) {
    for (const contact of currentEmail.replyTo) {
      addContact(contact.email, contact.name, 'reply_to');
    }
  }

  emailCount++;

  // Progress update
  if (emailCount % PROGRESS_INTERVAL === 0) {
    console.log(`Processed ${emailCount.toLocaleString()} emails, ${contacts.size.toLocaleString()} unique contacts...`);
  }
}

// Save results
function saveResults() {
  const contactArray = Array.from(contacts.values())
    .sort((a, b) => b.occurrences - a.occurrences);

  const output = {
    extractedAt: new Date().toISOString(),
    source: 'onenationhomeloans.com mbox',
    totalEmails: emailCount,
    uniqueContacts: contactArray.length,
    contacts: contactArray
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nSaved ${contactArray.length} contacts to ${OUTPUT_PATH}`);
}

// Main processing
async function main() {
  console.log('='.repeat(60));
  console.log('  MBOX Contact Extractor - Phase 1');
  console.log('='.repeat(60));
  console.log(`\nSource: ${MBOX_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  // Check file exists
  if (!fs.existsSync(MBOX_PATH)) {
    console.error('ERROR: mbox file not found!');
    process.exit(1);
  }

  const stats = fs.statSync(MBOX_PATH);
  console.log(`File size: ${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('Starting extraction...\n');

  const startTime = Date.now();

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineCount++;

    // New email starts with "From " at beginning of line (mbox format)
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (Object.keys(currentEmail).length > 0) {
        processEmail();
      }
      currentEmail = {};
      inHeaders = true;
      continue;
    }

    // Empty line marks end of headers
    if (line === '' && inHeaders) {
      inHeaders = false;
      continue;
    }

    // Parse headers
    if (inHeaders) {
      // Handle multi-line headers (continuation lines start with whitespace)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Append to previous header
        if (currentEmail._lastHeader) {
          currentEmail[currentEmail._lastHeader] += ' ' + line.trim();
        }
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const header = line.substring(0, colonIndex).toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        switch (header) {
          case 'from':
            currentEmail.from = parseEmailField(value);
            currentEmail._lastHeader = 'from';
            break;
          case 'to':
            currentEmail.to = parseEmailField(value);
            currentEmail._lastHeader = 'to';
            break;
          case 'cc':
            currentEmail.cc = parseEmailField(value);
            currentEmail._lastHeader = 'cc';
            break;
          case 'reply-to':
            currentEmail.replyTo = parseEmailField(value);
            currentEmail._lastHeader = 'replyTo';
            break;
        }
      }
    }
  }

  // Process last email
  if (Object.keys(currentEmail).length > 0) {
    processEmail();
  }

  const elapsed = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('  EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTotal emails processed: ${emailCount.toLocaleString()}`);
  console.log(`Unique contacts found: ${contacts.size.toLocaleString()}`);
  console.log(`Time elapsed: ${elapsed.toFixed(1)} seconds`);
  console.log(`Speed: ${(emailCount / elapsed).toFixed(0)} emails/second`);

  saveResults();

  // Show top contacts
  const top10 = Array.from(contacts.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  console.log('\nTop 10 contacts by frequency:');
  top10.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.email} (${c.occurrences} occurrences)`);
  });
}

main().catch(console.error);
