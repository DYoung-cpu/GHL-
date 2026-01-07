/**
 * Test LLM Extractor
 *
 * Tests the Gemini-powered email extraction on specific contacts
 * and compares results with the old regex-based extraction.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { extractFromEmail, extractContactProfile } = require('./utils/llm-extractor');

// Load dotenv
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

const CACHE_PATH = path.join(__dirname, 'data/enrichment-cache.json');

/**
 * Decode base64 content if present
 */
function decodeBase64Content(body) {
  // Check if this looks like base64 (long alphanumeric strings)
  const lines = body.split('\n');
  const base64Lines = [];
  const textLines = [];
  let inBase64Block = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect base64 content (long alphanumeric strings with +/=)
    if (/^[A-Za-z0-9+\/=]{40,}$/.test(trimmed)) {
      base64Lines.push(trimmed);
      inBase64Block = true;
    } else if (inBase64Block && base64Lines.length > 0) {
      // End of base64 block - try to decode
      try {
        const decoded = Buffer.from(base64Lines.join(''), 'base64').toString('utf-8');
        if (decoded && /[a-zA-Z]{3,}/.test(decoded)) { // Has readable text
          textLines.push(decoded);
        }
      } catch (e) {
        // Ignore decode errors
      }
      base64Lines.length = 0;
      inBase64Block = false;
      textLines.push(line);
    } else {
      textLines.push(line);
    }
  }

  // Decode any remaining base64
  if (base64Lines.length > 0) {
    try {
      const decoded = Buffer.from(base64Lines.join(''), 'base64').toString('utf-8');
      if (decoded && /[a-zA-Z]{3,}/.test(decoded)) {
        textLines.push(decoded);
      }
    } catch (e) {
      // Ignore
    }
  }

  return textLines.join('\n');
}

/**
 * Find emails from a specific sender in mbox files
 */
async function findEmailsFromSender(targetEmail, limit = 5) {
  const emails = [];
  const targetLower = targetEmail.toLowerCase();

  for (const mboxPath of MBOX_PATHS) {
    if (!fs.existsSync(mboxPath)) continue;

    console.log(`Scanning ${path.basename(mboxPath)} for ${targetEmail}...`);

    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = null;
    let lineCount = 0;

    for await (const line of rl) {
      lineCount++;

      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Process previous email if it's from our target
        if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 10) {
          // Decode base64 content before storing
          const rawBody = currentEmail.body.join('\n');
          const decodedBody = decodeBase64Content(rawBody);

          emails.push({
            from: currentEmail.fromEmail,
            fromName: currentEmail.fromName,
            to: currentEmail.to,
            subject: currentEmail.subject,
            date: currentEmail.date,
            body: decodedBody
          });

          if (emails.length >= limit) {
            rl.close();
            break;
          }
        }

        currentEmail = {
          fromEmail: '',
          fromName: '',
          to: '',
          subject: '',
          date: '',
          body: [],
          isTarget: false,
          inHeaders: true
        };
        continue;
      }

      if (!currentEmail) continue;

      // Parse headers
      if (currentEmail.inHeaders) {
        const lowerLine = line.toLowerCase();

        if (lowerLine.startsWith('from:')) {
          const fromValue = line.substring(5).trim();
          currentEmail.fromRaw = fromValue;

          // Extract email address
          const emailMatch = fromValue.match(/<([^>]+)>/) || fromValue.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
            currentEmail.isTarget = currentEmail.fromEmail === targetLower;
          }

          // Extract display name
          const nameMatch = fromValue.match(/^"?([^"<]+)"?\s*</);
          if (nameMatch) {
            currentEmail.fromName = nameMatch[1].trim();
          }
        }

        if (lowerLine.startsWith('to:')) {
          currentEmail.to = line.substring(3).trim();
        }

        if (lowerLine.startsWith('subject:')) {
          currentEmail.subject = line.substring(8).trim();
        }

        if (lowerLine.startsWith('date:')) {
          currentEmail.date = line.substring(5).trim();
        }

        // End of headers
        if (line === '') {
          currentEmail.inHeaders = false;
        }
      } else if (currentEmail.isTarget) {
        // Only capture body for target emails
        currentEmail.body.push(line);

        // Limit body size
        if (currentEmail.body.length > 300) {
          currentEmail.body.shift();
        }
      }
    }

    if (emails.length >= limit) break;
  }

  return emails;
}

/**
 * Load current regex-based extraction results for comparison
 */
function loadRegexResults(email) {
  if (!fs.existsSync(CACHE_PATH)) return null;

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  return cache[email.toLowerCase()] || null;
}

/**
 * Run comparison test for a contact
 */
async function testContact(email, name) {
  console.log('\n' + '='.repeat(70));
  console.log(`TESTING: ${name} (${email})`);
  console.log('='.repeat(70));

  // Load old regex results
  const regexResults = loadRegexResults(email);
  if (regexResults) {
    console.log('\n📋 OLD REGEX EXTRACTION:');
    console.log(`   Name: ${regexResults.name || '(none)'}`);
    console.log(`   Phone: ${regexResults.phones?.join(', ') || '(none)'}`);
    console.log(`   Company: ${regexResults.companies?.join(', ') || '(none)'}`);
    console.log(`   Title: ${regexResults.titles?.join(', ') || '(none)'}`);
    console.log(`   NMLS: ${regexResults.nmls || '(none)'}`);
    console.log(`   Quality: ${regexResults.signatureQuality || 'unknown'}`);

    if (regexResults.sampleSignatures?.length > 0) {
      console.log(`\n   Sample Signature (showing what regex found):`);
      console.log(`   "${regexResults.sampleSignatures[0].substring(0, 200)}..."`);
    }
  } else {
    console.log('\n📋 OLD REGEX EXTRACTION: (no data found)');
  }

  // Find actual emails
  console.log('\n🔍 Finding emails from this contact...');
  const emails = await findEmailsFromSender(email, 3);

  if (emails.length === 0) {
    console.log('❌ No emails found from this sender');
    return null;
  }

  console.log(`✅ Found ${emails.length} emails`);

  // Test LLM extraction on first email
  console.log('\n🤖 LLM EXTRACTION (first email):');
  console.log(`   Subject: ${emails[0].subject}`);
  console.log(`   Date: ${emails[0].date}`);
  console.log(`   Body preview: ${emails[0].body.substring(0, 150).replace(/\n/g, ' ')}...`);

  try {
    const llmResult = await extractFromEmail(emails[0]);

    console.log('\n🎯 LLM EXTRACTION RESULT:');

    if (llmResult.error) {
      console.log(`   ❌ Error: ${llmResult.error}`);
    } else {
      console.log(`   Name: ${llmResult.senderContact?.name || '(none)'} (confidence: ${llmResult.senderContact?.confidence || 0}%)`);
      console.log(`   Phone: ${llmResult.senderContact?.phone || '(none)'}`);
      console.log(`   Company: ${llmResult.senderContact?.company || '(none)'}`);
      console.log(`   Title: ${llmResult.senderContact?.title || '(none)'}`);
      console.log(`   NMLS: ${llmResult.senderContact?.nmls || '(none)'}`);
      console.log(`\n   Relationship: ${llmResult.relationship?.type || 'unknown'} (confidence: ${llmResult.relationship?.confidence || 0}%)`);
      console.log(`   Signals: ${llmResult.relationship?.signals?.join(', ') || '(none)'}`);
      console.log(`\n   Email Intent: ${llmResult.emailAnalysis?.intent || 'unknown'}`);
      console.log(`   Summary: ${llmResult.emailAnalysis?.summary || '(none)'}`);

      if (llmResult.dealInfo?.hasDealInfo) {
        console.log(`\n   📋 Deal Info:`);
        console.log(`      Borrower: ${llmResult.dealInfo.borrowerName || '(none)'}`);
        console.log(`      Property: ${llmResult.dealInfo.propertyAddress || '(none)'}`);
        console.log(`      Loan Amount: ${llmResult.dealInfo.loanAmount || '(none)'}`);
        console.log(`      Rate Quoted: ${llmResult.dealInfo.rateQuoted || '(none)'}`);
      }
    }

    return llmResult;
  } catch (err) {
    console.log(`   ❌ Extraction failed: ${err.message}`);
    return null;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           LLM EMAIL EXTRACTOR - COMPARISON TEST                  ║');
  console.log('║                                                                  ║');
  console.log('║   Testing Gemini AI extraction vs old regex-based extraction    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Test contacts that had wrong data with regex
  const testContacts = [
    { email: 'loanwebusa@verizon.net', name: 'Ken Aiken' },
    { email: 'kaileykild@gmail.com', name: 'Kailey Kildunne' }
  ];

  for (const contact of testContacts) {
    await testContact(contact.email, contact.name);
    // Small delay between contacts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { findEmailsFromSender, testContact };
