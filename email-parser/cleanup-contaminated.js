/**
 * Cleanup script to re-extract only contaminated contacts
 * These contacts were affected by the altEmails bug (now fixed)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Contaminated contacts that need re-extraction
const CONTAMINATED_CONTACTS = [
  'deedee@expressmtgcapital.com',      // Has Sara Cohen's name, David's phone
  'loanwebusa@verizon.net',            // Ken Aiken - has David's phone
  'jesus@fulcrumloans.com',            // Has John Hafner's name, David's phone
  'lisa_melton@pfmgrp.com',            // Has David's phone
  'mhewitt@willowprocessing.com',      // Has David's NMLS
  'anthonyamini@priorityfinancial.net' // Has David's phone (colleague)
];

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

const OUTPUT_PATH = path.join(__dirname, 'data/comprehensive-contacts.json');

/**
 * Find emails from mbox for target contacts ONLY
 * Uses PRIMARY email matching only (no altEmails)
 */
async function buildIndex() {
  console.log('📧 Scanning mbox for contaminated contacts only...');

  const targetSet = new Set(CONTAMINATED_CONTACTS.map(e => e.toLowerCase()));
  const emailIndex = {}; // email -> [{date, subject, fromName, body}]

  for (const mboxPath of MBOX_PATHS) {
    if (!fs.existsSync(mboxPath)) {
      console.log('   Skipping: ' + path.basename(mboxPath) + ' (not found)');
      continue;
    }

    console.log('   Scanning: ' + path.basename(mboxPath));

    const fileSize = fs.statSync(mboxPath).size;
    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = null;
    let bytePosition = 0;
    let emailCount = 0;
    let matchCount = 0;

    for await (const line of rl) {
      bytePosition += Buffer.byteLength(line, 'utf-8') + 1;

      if (emailCount % 5000 === 0) {
        const pct = ((bytePosition / fileSize) * 100).toFixed(1);
        process.stdout.write(`\r   ${pct}% | ${emailCount} emails | ${matchCount} matches`);
      }

      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Save previous email if target
        if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
          const key = currentEmail.fromEmail;
          if (!emailIndex[key]) emailIndex[key] = [];

          if (emailIndex[key].length < 5) { // Keep more emails for better extraction
            emailIndex[key].push({
              date: currentEmail.date,
              subject: currentEmail.subject,
              fromName: currentEmail.fromName,
              body: currentEmail.body.join('\n')
            });
            matchCount++;
          }
        }

        emailCount++;
        currentEmail = {
          fromEmail: '',
          fromName: '',
          subject: '',
          date: '',
          body: [],
          isTarget: false,
          inHeaders: true
        };
        continue;
      }

      if (!currentEmail) continue;

      if (currentEmail.inHeaders) {
        const lower = line.toLowerCase();

        if (lower.startsWith('from:')) {
          const val = line.substring(5).trim();
          const emailMatch = val.match(/<([^>]+)>/) || val.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
            // ONLY match on PRIMARY email - no altEmails
            currentEmail.isTarget = targetSet.has(currentEmail.fromEmail);
          }
          const nameMatch = val.match(/^"?([^"<]+)"?\s*</);
          if (nameMatch) currentEmail.fromName = nameMatch[1].trim();
        }

        if (lower.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
        if (lower.startsWith('date:')) currentEmail.date = line.substring(5).trim();
        if (line === '') currentEmail.inHeaders = false;
      } else if (currentEmail.isTarget) {
        currentEmail.body.push(line);
        if (currentEmail.body.length > 300) currentEmail.body.shift();
      }
    }

    process.stdout.write('\n');
  }

  return emailIndex;
}

/**
 * Aggregate multiple extractions for a contact
 */
function aggregateExtractions(contactEmail, extractions) {
  const valid = extractions.filter(e => !e.error);
  if (valid.length === 0) {
    return null;
  }

  function getBest(field, subfield) {
    const candidates = valid
      .filter(e => {
        const val = subfield ? e[field]?.[subfield] : e[field];
        return val !== null && val !== undefined && val !== '';
      })
      .sort((a, b) => (b.senderContact?.confidence || 0) - (a.senderContact?.confidence || 0));
    return candidates[0] ? (subfield ? candidates[0][field]?.[subfield] : candidates[0][field]) : null;
  }

  const allPhones = new Set();
  valid.forEach(e => {
    if (e.senderContact?.phone) allPhones.add(e.senderContact.phone);
    e.senderContact?.altPhones?.forEach(p => allPhones.add(p));
  });

  // Remove David's phone numbers
  allPhones.delete('8182239999');
  allPhones.delete('3109547772');
  allPhones.delete('8189363800');

  const relCounts = {};
  valid.forEach(e => {
    const t = e.relationship?.type;
    if (t) relCounts[t] = (relCounts[t] || 0) + 1;
  });
  const topRel = Object.entries(relCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    name: getBest('senderContact', 'name'),
    phone: Array.from(allPhones)[0] || null,
    phones: Array.from(allPhones),
    company: getBest('senderContact', 'company'),
    title: getBest('senderContact', 'title'),
    nmls: getBest('senderContact', 'nmls'),
    dre: getBest('senderContact', 'dre'),
    website: getBest('senderContact', 'website'),
    relationship: {
      type: topRel?.[0] || 'unknown',
      confidence: Math.max(...valid.map(e => e.relationship?.confidence || 0)),
      signals: [...new Set(valid.flatMap(e => e.relationship?.signals || []))].slice(0, 5)
    },
    emailHistory: valid
      .filter(e => e.emailAnalysis?.summary)
      .map(e => ({
        date: e._meta?.emailDate,
        subject: e._meta?.emailSubject,
        summary: e.emailAnalysis.summary,
        intent: e.emailAnalysis.intent
      })),
    confidence: Math.max(...valid.map(e => e.senderContact?.confidence || 0)),
    processedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CLEANUP CONTAMINATED CONTACTS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('Contacts to re-extract:');
  CONTAMINATED_CONTACTS.forEach(e => console.log('  - ' + e));
  console.log('');

  // Load existing data
  const allContacts = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
  console.log(`📂 Loaded ${Object.keys(allContacts).length} contacts from existing file\n`);

  // Build index for contaminated contacts only
  const emailIndex = await buildIndex();

  console.log(`\n📊 Found emails for ${Object.keys(emailIndex).length} contacts\n`);

  // Process each contaminated contact
  for (const contactEmail of CONTAMINATED_CONTACTS) {
    console.log('═'.repeat(60));
    console.log(`REPROCESSING: ${contactEmail}`);
    console.log('═'.repeat(60));

    const emails = emailIndex[contactEmail];

    if (!emails || emails.length === 0) {
      console.log('   ⚠️  No emails found - preserving existing data with phone removed');
      // Just remove David's phone from existing
      if (allContacts[contactEmail]) {
        allContacts[contactEmail].phone = null;
        allContacts[contactEmail].phones = [];
        allContacts[contactEmail].nmls = allContacts[contactEmail].nmls === '62043' ? null : allContacts[contactEmail].nmls;
        allContacts[contactEmail].processedAt = new Date().toISOString();
      }
      continue;
    }

    console.log(`   Found ${emails.length} emails`);
    emails.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.date?.substring(0, 20) || 'no date'} | From: "${e.fromName || '(none)'}" | ${e.subject?.substring(0, 40) || 'no subject'}`);
    });

    console.log('\n🤖 Running LLM extraction...');
    const extractions = [];

    for (let i = 0; i < emails.length; i++) {
      const e = emails[i];
      console.log(`   Email ${i + 1}...`);

      try {
        const result = await extractFromEmail({
          from: contactEmail,
          fromName: e.fromName || '',
          to: 'david@lendwisemtg.com',
          subject: e.subject || '',
          date: e.date || '',
          body: e.body || ''
        });
        extractions.push(result);

        console.log(`      Name: ${result.senderContact?.name || '(none)'}`);
        console.log(`      Phone: ${result.senderContact?.phone || '(none)'}`);
        console.log(`      Company: ${result.senderContact?.company || '(none)'}`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
        extractions.push({ error: err.message });
      }

      await new Promise(r => setTimeout(r, 500));
    }

    // Aggregate
    const aggregated = aggregateExtractions(contactEmail, extractions);

    if (aggregated) {
      console.log('\n✅ NEW DATA:');
      console.log('─'.repeat(50));
      console.log(`   Name: ${aggregated.name || '(none)'}`);
      console.log(`   Phone: ${aggregated.phone || '(none)'}`);
      console.log(`   Company: ${aggregated.company || '(none)'}`);
      console.log(`   NMLS: ${aggregated.nmls || '(none)'}`);
      console.log(`   Relationship: ${aggregated.relationship?.type}`);

      // Update existing contact
      if (allContacts[contactEmail]) {
        Object.assign(allContacts[contactEmail], aggregated);
        allContacts[contactEmail].nameSource = 'llm_cleanup';
      }
    }

    console.log('');
  }

  // Save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allContacts, null, 2));
  console.log('\n═'.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('═'.repeat(60));
  console.log(`\n💾 Updated ${OUTPUT_PATH}`);
}

main().catch(console.error);
