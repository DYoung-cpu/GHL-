/**
 * Indexed Batch Test - Scans mbox ONCE, then processes multiple contacts
 * Much faster than scanning per-contact
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Test contacts
const TEST_CONTACTS = new Set([
  'ldsegura007@gmail.com',           // Dave Segura
  'cedricjohnson@priorityfinancial.net', // Cedric Johnson
  'loanwebusa@verizon.net',          // Ken Aiken
  'kaileykild@gmail.com',            // Kailey Kildunne
]);

/**
 * Build email index for target contacts (single mbox scan)
 */
async function buildIndex() {
  console.log('📧 Building email index (single scan)...');
  const startTime = Date.now();

  const emailIndex = {}; // email -> [{date, subject, fromName, body}]

  const fileSize = fs.statSync(MBOX_PATH).size;
  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = null;
  let lineCount = 0;
  let emailCount = 0;
  let matchCount = 0;
  let bytePosition = 0;

  for await (const line of rl) {
    lineCount++;
    bytePosition += Buffer.byteLength(line, 'utf-8') + 1;

    if (lineCount % 2000000 === 0) {
      const pct = ((bytePosition / fileSize) * 100).toFixed(1);
      process.stdout.write(`\r   ${pct}% | ${emailCount} emails | ${matchCount} matches`);
    }

    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Save previous email if target
      if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
        const key = currentEmail.fromEmail.toLowerCase();
        if (!emailIndex[key]) emailIndex[key] = [];

        // Keep max 3 emails per contact for testing
        if (emailIndex[key].length < 3) {
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
          currentEmail.isTarget = TEST_CONTACTS.has(currentEmail.fromEmail);
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

  // Last email
  if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
    const key = currentEmail.fromEmail.toLowerCase();
    if (!emailIndex[key]) emailIndex[key] = [];
    if (emailIndex[key].length < 3) {
      emailIndex[key].push({
        date: currentEmail.date,
        subject: currentEmail.subject,
        fromName: currentEmail.fromName,
        body: currentEmail.body.join('\n')
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\r   100% | ${emailCount} emails | ${matchCount} matches (${elapsed}s)`);

  return emailIndex;
}

/**
 * Aggregate extractions
 */
function aggregateExtractions(contactEmail, extractions) {
  const valid = extractions.filter(e => !e.error);
  if (valid.length === 0) {
    return { email: contactEmail, status: 'failed', error: 'No successful extractions' };
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

  const relCounts = {};
  valid.forEach(e => {
    const t = e.relationship?.type;
    if (t) relCounts[t] = (relCounts[t] || 0) + 1;
  });
  const topRel = Object.entries(relCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    email: contactEmail,
    status: 'success',
    contact: {
      name: getBest('senderContact', 'name'),
      phone: getBest('senderContact', 'phone'),
      phones: Array.from(allPhones),
      company: getBest('senderContact', 'company'),
      title: getBest('senderContact', 'title'),
      nmls: getBest('senderContact', 'nmls'),
      dre: getBest('senderContact', 'dre'),
      confidence: Math.max(...valid.map(e => e.senderContact?.confidence || 0))
    },
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
    _meta: {
      emailsProcessed: extractions.length,
      successful: valid.length,
      processedAt: new Date().toISOString()
    }
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           INDEXED BATCH TEST - 4 CONTACTS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Build index (single scan)
  const emailIndex = await buildIndex();

  console.log(`\n📊 Index built: ${Object.keys(emailIndex).length} contacts with emails\n`);

  // Step 2: Process each contact
  const results = [];

  for (const contactEmail of TEST_CONTACTS) {
    const emails = emailIndex[contactEmail];

    console.log('═'.repeat(70));
    console.log(`PROCESSING: ${contactEmail}`);
    console.log('═'.repeat(70));

    if (!emails || emails.length === 0) {
      console.log('   ⚠️  No emails found in index');
      results.push({ email: contactEmail, status: 'no_emails' });
      continue;
    }

    console.log(`   Found ${emails.length} emails in index`);
    emails.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.date?.substring(0, 16) || 'no date'} | ${e.subject?.substring(0, 50) || 'no subject'}`);
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
        console.log(`      Relationship: ${result.relationship?.type || 'unknown'}`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
        extractions.push({ error: err.message });
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n📊 Aggregating...');
    const aggregated = aggregateExtractions(contactEmail, extractions);

    console.log('\n✅ FINAL PROFILE:');
    console.log('─'.repeat(50));
    console.log(`   Name: ${aggregated.contact?.name || '(none)'}`);
    console.log(`   Phone: ${aggregated.contact?.phone || '(none)'}`);
    console.log(`   Company: ${aggregated.contact?.company || '(none)'}`);
    console.log(`   Title: ${aggregated.contact?.title || '(none)'}`);
    console.log(`   NMLS: ${aggregated.contact?.nmls || '(none)'}`);
    console.log(`   Relationship: ${aggregated.relationship?.type} (${aggregated.relationship?.confidence}%)`);
    console.log(`   Confidence: ${aggregated.contact?.confidence}%`);

    if (aggregated.emailHistory?.length > 0) {
      console.log('\n   📧 Email Summaries:');
      aggregated.emailHistory.forEach(eh => {
        console.log(`      • ${eh.summary}`);
      });
    }

    results.push(aggregated);
    console.log('');
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('TEST COMPLETE');
  console.log('═'.repeat(70));

  console.log('\n📊 Summary:');
  results.forEach(r => {
    const status = r.status === 'success' ? '✅' : r.status === 'no_emails' ? '⚠️' : '❌';
    console.log(`   ${status} ${r.email}: ${r.contact?.name || '(no name)'} - ${r.relationship?.type || 'N/A'}`);
  });

  // Save results
  const outputPath = path.join(__dirname, 'data/test-batch-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
}

main().catch(console.error);
