/**
 * Small Batch Test - Process 5 contacts to verify the system works
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Test contacts - mix of different types
const TEST_CONTACTS = [
  'ldsegura007@gmail.com',           // Dave Segura - broker, good signature
  'cedricjohnson@priorityfinancial.net', // Cedric Johnson - colleague
  'loanwebusa@verizon.net',          // Ken Aiken - broker partner
  'kaileykild@gmail.com',            // Kailey Kildunne - colleague/personal
  // Add one more from the cache
];

/**
 * Find multiple emails from a sender
 */
async function findEmailsFrom(targetEmail, limit = 3) {
  const emails = [];
  const targetLower = targetEmail.toLowerCase();

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = null;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    if (line.startsWith('From ') && line.includes('@')) {
      // Save previous email if it's from target
      if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
        emails.push({
          from: currentEmail.fromEmail,
          fromName: currentEmail.fromName,
          subject: currentEmail.subject,
          date: currentEmail.date,
          body: currentEmail.body.join('\n')
        });

        if (emails.length >= limit) {
          rl.close();
          break;
        }
      }

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
          currentEmail.isTarget = currentEmail.fromEmail === targetLower;
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

  return emails;
}

/**
 * Aggregate multiple extractions
 */
function aggregateExtractions(contactEmail, extractions) {
  const valid = extractions.filter(e => !e.error);

  if (valid.length === 0) {
    return { email: contactEmail, status: 'failed', error: 'No successful extractions' };
  }

  // Helper: get best value
  function getBest(field, subfield) {
    const candidates = valid
      .filter(e => {
        const val = subfield ? e[field]?.[subfield] : e[field];
        return val !== null && val !== undefined && val !== '';
      })
      .sort((a, b) => (b.senderContact?.confidence || 0) - (a.senderContact?.confidence || 0));
    return candidates[0] ? (subfield ? candidates[0][field]?.[subfield] : candidates[0][field]) : null;
  }

  // Collect all phones
  const allPhones = new Set();
  valid.forEach(e => {
    if (e.senderContact?.phone) allPhones.add(e.senderContact.phone);
    e.senderContact?.altPhones?.forEach(p => allPhones.add(p));
  });

  // Get relationship counts
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

/**
 * Process a single contact
 */
async function processContact(email) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`PROCESSING: ${email}`);
  console.log('═'.repeat(70));

  // Find emails
  console.log('🔍 Finding emails...');
  const emails = await findEmailsFrom(email, 3);
  console.log(`   Found ${emails.length} emails`);

  if (emails.length === 0) {
    return { email, status: 'no_emails' };
  }

  // Show what we found
  emails.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.date?.substring(0, 16) || 'no date'} | ${e.subject?.substring(0, 50) || 'no subject'}`);
  });

  // Extract from each email
  console.log('\n🤖 Running LLM extraction on each email...');
  const extractions = [];

  for (let i = 0; i < emails.length; i++) {
    const e = emails[i];
    console.log(`   Email ${i + 1}...`);

    try {
      const result = await extractFromEmail({
        from: email,
        fromName: e.fromName || '',
        to: 'david@lendwisemtg.com',
        subject: e.subject || '',
        date: e.date || '',
        body: e.body || ''
      });
      extractions.push(result);

      // Quick summary
      console.log(`      Name: ${result.senderContact?.name || '(none)'}`);
      console.log(`      Phone: ${result.senderContact?.phone || '(none)'}`);
      console.log(`      Relationship: ${result.relationship?.type || 'unknown'}`);
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}`);
      extractions.push({ error: err.message });
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Aggregate
  console.log('\n📊 Aggregating results...');
  const aggregated = aggregateExtractions(email, extractions);

  // Display final result
  console.log('\n✅ FINAL AGGREGATED PROFILE:');
  console.log('─'.repeat(50));
  console.log(`   Name: ${aggregated.contact?.name || '(none)'}`);
  console.log(`   Phone: ${aggregated.contact?.phone || '(none)'}`);
  console.log(`   All Phones: ${aggregated.contact?.phones?.join(', ') || '(none)'}`);
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

  return aggregated;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           SMALL BATCH TEST - 4 CONTACTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  const results = [];

  for (const email of TEST_CONTACTS) {
    const result = await processContact(email);
    results.push(result);

    // Small delay between contacts
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('BATCH TEST COMPLETE');
  console.log('═'.repeat(70));

  console.log('\n📊 Summary:');
  results.forEach(r => {
    const status = r.status === 'success' ? '✅' : '❌';
    console.log(`   ${status} ${r.email}: ${r.contact?.name || '(no name)'} - ${r.relationship?.type || 'unknown'}`);
  });

  // Save results
  const outputPath = path.join(__dirname, 'data/test-batch-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
}

main().catch(console.error);
