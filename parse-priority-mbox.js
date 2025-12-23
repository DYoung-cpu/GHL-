/**
 * Priority Financial MBOX Contact Extractor
 */

const fs = require('fs');
const readline = require('readline');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/priority-contacts.json';
const PROGRESS_INTERVAL = 10000;

const contacts = new Map();
let emailCount = 0;
let currentEmail = {};
let inHeaders = false;

function parseEmailField(value) {
  const results = [];
  if (!value) return results;
  const parts = value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const angleMatch = trimmed.match(/(?:"?([^"<]+)"?\s*)?<([^>]+)>/);
    if (angleMatch) {
      const name = angleMatch[1]?.trim() || '';
      const email = angleMatch[2]?.trim().toLowerCase();
      if (email && email.includes('@')) {
        results.push({ name, email });
      }
      continue;
    }
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      results.push({ name: '', email: emailMatch[1].toLowerCase() });
    }
  }
  return results;
}

function parseName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  let decoded = fullName.replace(/"/g, '').trim();
  if (decoded.includes('@') || decoded.includes('noreply')) {
    return { firstName: '', lastName: '' };
  }
  const parts = decoded.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

function addContact(email, name, type) {
  if (!email || !email.includes('@')) return;
  const skipPatterns = ['noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
    'bounce', 'unsubscribe', 'mailchimp', 'sendgrid', 'amazonses', 'notifications', 'daemon'];
  const emailLower = email.toLowerCase();
  if (skipPatterns.some(p => emailLower.includes(p))) return;

  const existing = contacts.get(emailLower);
  const { firstName, lastName } = parseName(name);

  if (existing) {
    existing.occurrences++;
    if (type === 'sent_to') existing.sentTo++;
    if (type === 'received_from') existing.receivedFrom++;
    if (!existing.firstName && firstName) existing.firstName = firstName;
    if (!existing.lastName && lastName) existing.lastName = lastName;
    if (!existing.fullName && name) existing.fullName = name;
  } else {
    contacts.set(emailLower, {
      email: emailLower, firstName, lastName, fullName: name || '',
      occurrences: 1, sentTo: type === 'sent_to' ? 1 : 0,
      receivedFrom: type === 'received_from' ? 1 : 0,
      firstSeen: new Date().toISOString()
    });
  }
}

function processEmail() {
  if (!currentEmail.from && !currentEmail.to) return;
  const fromEmail = currentEmail.from?.[0]?.email || '';
  const isSent = fromEmail.includes('dyoung') || fromEmail.includes('davidyoung') || fromEmail.includes('priority');

  if (currentEmail.from) {
    for (const c of currentEmail.from) addContact(c.email, c.name, 'received_from');
  }
  if (currentEmail.to) {
    for (const c of currentEmail.to) addContact(c.email, c.name, isSent ? 'sent_to' : 'cc_with');
  }
  if (currentEmail.cc) {
    for (const c of currentEmail.cc) addContact(c.email, c.name, 'cc');
  }
  emailCount++;
  if (emailCount % PROGRESS_INTERVAL === 0) {
    console.log('Processed ' + emailCount.toLocaleString() + ' emails, ' + contacts.size.toLocaleString() + ' unique contacts...');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Priority Financial MBOX Contact Extractor');
  console.log('='.repeat(60));
  const stats = fs.statSync(MBOX_PATH);
  console.log('File size: ' + (stats.size / 1024 / 1024 / 1024).toFixed(2) + ' GB');
  console.log('Starting extraction...\n');

  const startTime = Date.now();
  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      if (Object.keys(currentEmail).length > 0) processEmail();
      currentEmail = {};
      inHeaders = true;
      continue;
    }
    if (line === '' && inHeaders) { inHeaders = false; continue; }
    if (inHeaders) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
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
          case 'from': currentEmail.from = parseEmailField(value); currentEmail._lastHeader = 'from'; break;
          case 'to': currentEmail.to = parseEmailField(value); currentEmail._lastHeader = 'to'; break;
          case 'cc': currentEmail.cc = parseEmailField(value); currentEmail._lastHeader = 'cc'; break;
        }
      }
    }
  }
  if (Object.keys(currentEmail).length > 0) processEmail();

  const elapsed = (Date.now() - startTime) / 1000;
  const contactArray = Array.from(contacts.values()).sort((a, b) => b.occurrences - a.occurrences);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    extractedAt: new Date().toISOString(),
    source: 'priorityfinancial.net mbox',
    totalEmails: emailCount,
    uniqueContacts: contactArray.length,
    contacts: contactArray
  }, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Total emails: ' + emailCount.toLocaleString());
  console.log('Unique contacts: ' + contacts.size.toLocaleString());
  console.log('Time: ' + elapsed.toFixed(1) + ' seconds');
  console.log('Saved to: ' + OUTPUT_PATH);
}

main().catch(console.error);
