/**
 * LLM Batch Processor
 *
 * Processes all contacts using Gemini AI to extract:
 * - Contact info (name, phone, company, title, NMLS)
 * - Relationship classification
 * - Email summaries and history
 * - Deal information
 *
 * Processes multiple emails per contact and aggregates best data.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const INDEX_PATH = path.join(DATA_DIR, 'email-index.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'llm-enriched-contacts.json');
const PROGRESS_PATH = path.join(DATA_DIR, 'llm-progress.json');

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Configuration
const CONFIG = {
  emailsPerContact: 5,      // Process up to 5 emails per contact
  delayBetweenCalls: 500,   // ms between API calls (rate limiting)
  saveEvery: 10,            // Save progress every N contacts
  maxRetries: 3,            // Retry failed extractions
};

/**
 * Build an index of all emails by sender for fast lookup
 * This scans the mbox once and creates an in-memory index
 */
async function buildEmailIndex(targetEmails) {
  console.log('\n📧 Building email index from mbox files...');

  const emailIndex = {}; // email -> [{date, subject, position, mboxFile}]

  for (const mboxPath of MBOX_PATHS) {
    if (!fs.existsSync(mboxPath)) {
      console.log(`  Skipping (not found): ${path.basename(mboxPath)}`);
      continue;
    }

    console.log(`  Scanning: ${path.basename(mboxPath)}`);

    const fileSize = fs.statSync(mboxPath).size;
    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
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
        process.stdout.write(`\r    ${pct}% | ${emailCount} emails | ${matchCount} matches`);
      }

      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Index previous email if it's from a target
        if (currentEmail && currentEmail.isTarget) {
          const key = currentEmail.fromEmail.toLowerCase();
          if (!emailIndex[key]) emailIndex[key] = [];

          emailIndex[key].push({
            date: currentEmail.date,
            subject: currentEmail.subject,
            fromName: currentEmail.fromName,
            mboxPath: mboxPath,
            startLine: currentEmail.startLine,
            body: currentEmail.body.join('\n')
          });
          matchCount++;
        }

        emailCount++;
        currentEmail = {
          fromEmail: '',
          fromName: '',
          subject: '',
          date: '',
          body: [],
          isTarget: false,
          inHeaders: true,
          startLine: lineCount
        };
        continue;
      }

      if (!currentEmail) continue;

      // Parse headers
      if (currentEmail.inHeaders) {
        const lower = line.toLowerCase();

        if (lower.startsWith('from:')) {
          const val = line.substring(5).trim();
          const emailMatch = val.match(/<([^>]+)>/) || val.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
            currentEmail.isTarget = targetEmails.has(currentEmail.fromEmail);
          }
          const nameMatch = val.match(/^"?([^"<]+)"?\s*</);
          if (nameMatch) currentEmail.fromName = nameMatch[1].trim();
        }

        if (lower.startsWith('subject:')) {
          currentEmail.subject = line.substring(8).trim();
        }

        if (lower.startsWith('date:')) {
          currentEmail.date = line.substring(5).trim();
        }

        if (line === '') currentEmail.inHeaders = false;
      } else if (currentEmail.isTarget) {
        // Capture body for target emails
        currentEmail.body.push(line);
        if (currentEmail.body.length > 300) currentEmail.body.shift();
      }
    }

    // Don't forget the last email
    if (currentEmail && currentEmail.isTarget) {
      const key = currentEmail.fromEmail.toLowerCase();
      if (!emailIndex[key]) emailIndex[key] = [];
      emailIndex[key].push({
        date: currentEmail.date,
        subject: currentEmail.subject,
        fromName: currentEmail.fromName,
        mboxPath: mboxPath,
        startLine: currentEmail.startLine,
        body: currentEmail.body.join('\n')
      });
    }

    console.log(`\r    100% | ${emailCount} emails | ${matchCount} matches`);
  }

  return emailIndex;
}

/**
 * Aggregate multiple extractions into a single contact profile
 */
function aggregateExtractions(contactEmail, extractions) {
  const valid = extractions.filter(e => !e.error);

  if (valid.length === 0) {
    return {
      email: contactEmail,
      status: 'failed',
      error: 'No successful extractions'
    };
  }

  // Helper: get best value for a field (highest confidence that has data)
  function getBest(field, subfield = null) {
    const candidates = valid
      .filter(e => {
        const val = subfield ? e[field]?.[subfield] : e[field];
        return val !== null && val !== undefined && val !== '';
      })
      .map(e => ({
        value: subfield ? e[field]?.[subfield] : e[field],
        confidence: e.senderContact?.confidence || 50
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return candidates[0]?.value || null;
  }

  // Collect all phones found
  const allPhones = new Set();
  valid.forEach(e => {
    if (e.senderContact?.phone) allPhones.add(e.senderContact.phone);
    if (e.senderContact?.altPhones) {
      e.senderContact.altPhones.forEach(p => allPhones.add(p));
    }
  });

  // Collect all relationship signals
  const allSignals = new Set();
  valid.forEach(e => {
    if (e.relationship?.signals) {
      e.relationship.signals.forEach(s => allSignals.add(s));
    }
  });

  // Get most common relationship type
  const relationshipCounts = {};
  valid.forEach(e => {
    const type = e.relationship?.type;
    if (type) relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
  });
  const topRelationship = Object.entries(relationshipCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Collect email summaries
  const emailSummaries = valid
    .filter(e => e.emailAnalysis?.summary)
    .map(e => ({
      date: e._meta?.emailDate,
      subject: e._meta?.emailSubject,
      summary: e.emailAnalysis.summary,
      intent: e.emailAnalysis.intent,
      sentiment: e.emailAnalysis.sentiment
    }))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Collect deal info
  const deals = valid
    .filter(e => e.dealInfo?.hasDealInfo)
    .map(e => ({
      ...e.dealInfo,
      emailDate: e._meta?.emailDate,
      emailSubject: e._meta?.emailSubject
    }));

  // Get best confidence across all extractions
  const maxConfidence = Math.max(...valid.map(e => e.senderContact?.confidence || 0));

  return {
    email: contactEmail,
    status: 'success',

    contact: {
      name: getBest('senderContact', 'name'),
      nameSource: getBest('senderContact', 'nameSource'),
      phone: getBest('senderContact', 'phone'),
      phones: Array.from(allPhones),
      company: getBest('senderContact', 'company'),
      companySource: getBest('senderContact', 'companySource'),
      title: getBest('senderContact', 'title'),
      titleSource: getBest('senderContact', 'titleSource'),
      nmls: getBest('senderContact', 'nmls'),
      dre: getBest('senderContact', 'dre'),
      website: getBest('senderContact', 'website'),
      confidence: maxConfidence
    },

    relationship: {
      type: topRelationship?.[0] || 'unknown',
      confidence: Math.max(...valid.map(e => e.relationship?.confidence || 0)),
      signals: Array.from(allSignals).slice(0, 5),
      isReferralSource: valid.some(e => e.relationship?.isReferralSource)
    },

    emailHistory: emailSummaries.slice(0, 10),

    deals: deals,

    _meta: {
      emailsProcessed: extractions.length,
      successfulExtractions: valid.length,
      processedAt: new Date().toISOString()
    }
  };
}

/**
 * Process a single contact - extract from multiple emails
 */
async function processContact(contactEmail, emails, options = {}) {
  const { debug = false } = options;

  // Sort by date descending (most recent first)
  const sortedEmails = [...emails].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB - dateA;
  });

  // Take up to N emails
  const emailsToProcess = sortedEmails.slice(0, CONFIG.emailsPerContact);

  if (debug) {
    console.log(`  Processing ${emailsToProcess.length} emails for ${contactEmail}`);
  }

  const extractions = [];

  for (const email of emailsToProcess) {
    try {
      const result = await extractFromEmail({
        from: contactEmail,
        fromName: email.fromName || '',
        to: 'david@lendwisemtg.com',
        subject: email.subject || '',
        date: email.date || '',
        body: email.body || ''
      });

      extractions.push(result);
    } catch (err) {
      extractions.push({ error: err.message });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenCalls));
  }

  // Aggregate results
  return aggregateExtractions(contactEmail, extractions);
}

/**
 * Load progress from checkpoint
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  }
  return { processed: {}, lastIndex: 0 };
}

/**
 * Save progress checkpoint
 */
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

/**
 * Main batch processing function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           LLM BATCH PROCESSOR - CONTACT ENRICHMENT               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Load contact index
  console.log('📂 Loading contact index...');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

  // Get contacts that have email exchange (davidSent > 0)
  const contacts = Object.values(index)
    .filter(c => c.davidSent > 0)
    .map(c => c.email.toLowerCase());

  console.log(`   Found ${contacts.length} contacts with email exchange`);

  // Build set for fast lookup
  const targetEmails = new Set(contacts);

  // Build email index
  const emailIndex = await buildEmailIndex(targetEmails);

  const contactsWithEmails = Object.keys(emailIndex).length;
  const totalEmails = Object.values(emailIndex).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n   Indexed ${totalEmails} emails from ${contactsWithEmails} contacts`);

  // Load progress
  const progress = loadProgress();
  console.log(`\n📊 Progress: ${Object.keys(progress.processed).length} contacts already processed`);

  // Process contacts
  console.log('\n🤖 Starting LLM extraction...\n');

  const results = { ...progress.processed };
  let processed = 0;
  let errors = 0;

  const contactList = Object.keys(emailIndex);
  const startIndex = progress.lastIndex || 0;

  for (let i = startIndex; i < contactList.length; i++) {
    const email = contactList[i];

    // Skip if already processed
    if (results[email]) {
      continue;
    }

    const emails = emailIndex[email];
    process.stdout.write(`\r  [${i + 1}/${contactList.length}] Processing: ${email.padEnd(40)}`);

    try {
      const result = await processContact(email, emails);
      results[email] = result;
      processed++;

      if (result.status === 'failed') {
        errors++;
      }
    } catch (err) {
      results[email] = { email, status: 'error', error: err.message };
      errors++;
    }

    // Save progress periodically
    if ((i + 1) % CONFIG.saveEvery === 0) {
      progress.processed = results;
      progress.lastIndex = i + 1;
      saveProgress(progress);

      // Also save full results
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  fs.unlinkSync(PROGRESS_PATH); // Clean up progress file

  // Summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('PROCESSING COMPLETE');
  console.log('═'.repeat(70));

  const successful = Object.values(results).filter(r => r.status === 'success').length;
  const failed = Object.values(results).filter(r => r.status !== 'success').length;

  console.log(`\n📊 Results:`);
  console.log(`   Total contacts: ${Object.keys(results).length}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n💾 Saved to: ${OUTPUT_PATH}`);

  // Stats on data quality
  const withName = Object.values(results).filter(r => r.contact?.name).length;
  const withPhone = Object.values(results).filter(r => r.contact?.phone || r.contact?.phones?.length > 0).length;
  const withCompany = Object.values(results).filter(r => r.contact?.company).length;
  const withNMLS = Object.values(results).filter(r => r.contact?.nmls).length;

  console.log(`\n📈 Data Quality:`);
  console.log(`   With name: ${withName} (${(withName/successful*100).toFixed(1)}%)`);
  console.log(`   With phone: ${withPhone} (${(withPhone/successful*100).toFixed(1)}%)`);
  console.log(`   With company: ${withCompany} (${(withCompany/successful*100).toFixed(1)}%)`);
  console.log(`   With NMLS: ${withNMLS} (${(withNMLS/successful*100).toFixed(1)}%)`);

  // Relationship breakdown
  const relationshipCounts = {};
  Object.values(results).forEach(r => {
    const type = r.relationship?.type || 'unknown';
    relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
  });

  console.log(`\n👥 Relationship Types:`);
  Object.entries(relationshipCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processContact, aggregateExtractions, buildEmailIndex };
