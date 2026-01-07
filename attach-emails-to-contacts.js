/**
 * Attach email correspondence to GHL contacts as notes
 * Game changer: Links all email history to contact records
 */

const fs = require('fs');
const https = require('https');
const readline = require('readline');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Target contacts to attach emails to
const targetContacts = [
  { name: 'Marc Shenkman', email: 'marcshenkman@priorityfinancial.net' },
  { name: 'Brenda Perry', email: 'brenda@priorityfinancial.net' },
  { name: 'Anthony Amini', email: 'anthonyamini@priorityfinancial.net' },
  { name: 'Alberto Martinez', email: 'albertomartinez@priorityfinancial.net' }
];

// GHL API helper
function ghlRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Search or create contact
async function getOrCreateContact(name, email) {
  // Search for existing contact
  const searchRes = await ghlRequest('GET',
    `/contacts/?locationId=${LOCATION_ID}&query=${encodeURIComponent(email)}`);

  if (searchRes.data.contacts && searchRes.data.contacts.length > 0) {
    console.log('  Found existing contact: ' + searchRes.data.contacts[0].id);
    return searchRes.data.contacts[0];
  }

  // Create new contact
  const nameParts = name.split(' ');
  const createRes = await ghlRequest('POST', '/contacts/', {
    locationId: LOCATION_ID,
    email: email,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' '),
    tags: ['Priority Financial', 'Email Import']
  });

  if (createRes.data.contact) {
    console.log('  Created new contact: ' + createRes.data.contact.id);
    return createRes.data.contact;
  }

  console.log('  ERROR creating contact:', createRes.data);
  return null;
}

// Add note to contact
async function addNoteToContact(contactId, noteBody) {
  const res = await ghlRequest('POST', `/contacts/${contactId}/notes`, {
    body: noteBody
  });
  return res.status === 200 || res.status === 201;
}

// Extract emails for a specific person
async function extractEmailsForContact(targetEmail) {
  const emails = [];
  const targetLower = targetEmail.toLowerCase();

  console.log('  Scanning mbox for: ' + targetEmail);

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = { from: '', to: '', cc: '', subject: '', date: '', body: [] };
  let inHeaders = false;
  let inBody = false;
  let emailCount = 0;

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      // Save previous email if it involves target
      if (currentEmail.from || currentEmail.to) {
        const from = currentEmail.from.toLowerCase();
        const to = currentEmail.to.toLowerCase();
        const cc = currentEmail.cc.toLowerCase();

        if (from.includes(targetLower) || to.includes(targetLower) || cc.includes(targetLower)) {
          emails.push({
            date: currentEmail.date,
            from: currentEmail.from,
            to: currentEmail.to,
            subject: currentEmail.subject,
            body: currentEmail.body.join('\n').substring(0, 2000)
          });
        }
      }

      emailCount++;
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

    if (inBody && currentEmail.body.length < 50) {
      currentEmail.body.push(line);
    }
  }

  // Check last email
  if (currentEmail.from || currentEmail.to) {
    const from = currentEmail.from.toLowerCase();
    const to = currentEmail.to.toLowerCase();
    const cc = currentEmail.cc.toLowerCase();

    if (from.includes(targetLower) || to.includes(targetLower) || cc.includes(targetLower)) {
      emails.push({
        date: currentEmail.date,
        from: currentEmail.from,
        to: currentEmail.to,
        subject: currentEmail.subject,
        body: currentEmail.body.join('\n').substring(0, 2000)
      });
    }
  }

  console.log('  Found ' + emails.length + ' emails');
  return emails;
}

// Clean email body for note
function cleanBody(body) {
  return body
    .replace(/Content-Type:.*$/gm, '')
    .replace(/Content-Transfer.*$/gm, '')
    .replace(/boundary=.*$/gm, '')
    .replace(/--[a-zA-Z0-9_=-]+$/gm, '')
    .replace(/charset=.*$/gm, '')
    .replace(/=\r?\n/g, '')
    .replace(/=3D/g, '=')
    .replace(/=E2=80=99/g, "'")
    .replace(/=E2=80=9C/g, '"')
    .replace(/=E2=80=9D/g, '"')
    .replace(/=C2=A0/g, ' ')
    .replace(/\[image:.*?\]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 1500);
}

// Format email as note
function formatEmailNote(email) {
  const cleanedBody = cleanBody(email.body);

  return `📧 EMAIL CORRESPONDENCE
━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${email.date}
Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
━━━━━━━━━━━━━━━━━━━━━━━━

${cleanedBody}

━━━━━━━━━━━━━━━━━━━━━━━━
[Imported from Priority Financial email archive]`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  ATTACH EMAILS TO GHL CONTACTS');
  console.log('='.repeat(60));
  console.log('\nThis will:');
  console.log('1. Find/create contacts in GHL');
  console.log('2. Search mbox for all correspondence');
  console.log('3. Add emails as notes to each contact\n');

  const results = [];

  for (const target of targetContacts) {
    console.log('\n' + '─'.repeat(50));
    console.log('Processing: ' + target.name);
    console.log('─'.repeat(50));

    // Get or create contact
    const contact = await getOrCreateContact(target.name, target.email);
    if (!contact) {
      console.log('  SKIPPED - Could not get/create contact');
      continue;
    }

    // Extract emails
    const emails = await extractEmailsForContact(target.email);

    // Sort by date (newest first)
    emails.sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch {
        return 0;
      }
    });

    // Add notes for each email (limit to 50 most recent to avoid overload)
    const emailsToAdd = emails.slice(0, 50);
    let added = 0;

    for (const email of emailsToAdd) {
      const noteBody = formatEmailNote(email);
      const success = await addNoteToContact(contact.id, noteBody);
      if (success) added++;

      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('  Added ' + added + ' email notes to contact');

    results.push({
      name: target.name,
      email: target.email,
      contactId: contact.id,
      totalEmails: emails.length,
      notesAdded: added
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('  COMPLETE');
  console.log('='.repeat(60));
  console.log('\nResults:');
  results.forEach(r => {
    console.log(`  ${r.name}: ${r.notesAdded} notes added (${r.totalEmails} total emails found)`);
  });

  fs.writeFileSync('./data/email-import-results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved results to: data/email-import-results.json');
}

// Run with preview mode first
const args = process.argv.slice(2);
if (args.includes('--preview')) {
  console.log('PREVIEW MODE - Will only show what would be imported\n');

  (async () => {
    for (const target of targetContacts) {
      console.log('\n' + target.name + ' (' + target.email + ')');
      const emails = await extractEmailsForContact(target.email);
      console.log('  Would import ' + Math.min(emails.length, 50) + ' of ' + emails.length + ' emails');

      // Show sample
      if (emails.length > 0) {
        console.log('  Sample subjects:');
        emails.slice(0, 5).forEach(e => {
          console.log('    - ' + (e.subject || '(no subject)').substring(0, 60));
        });
      }
    }
  })();
} else {
  main().catch(console.error);
}
