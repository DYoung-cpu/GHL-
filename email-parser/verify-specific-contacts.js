/**
 * Verify specific contacts that were problematic before
 * - Ken Aiken (loanwebusa@verizon.net) - name was missing
 * - Dave Segura (ldsegura007@gmail.com) - NMLS was missed
 * - Cedric Johnson (cedricjohnson@priorityfinancial.net) - name was missing
 * - Kailey Kildunne (kaileykild@gmail.com / kaileykildunne@priorityfinancial.net) - wrong data attributed
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Paths
const INDEX_PATH = path.join(__dirname, 'data/email-index.json');
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Contacts to verify
const VERIFY_CONTACTS = [
  {
    email: 'loanwebusa@verizon.net',
    expectedName: 'Ken Aiken',
    description: 'Broker partner - name was missing before'
  },
  {
    email: 'ldsegura007@gmail.com',
    expectedName: 'Dave Segura',
    description: 'Broker - NMLS 249181 was missed due to typo NMSL'
  },
  {
    email: 'cedricjohnson@priorityfinancial.net',
    expectedName: 'Cedric Johnson',
    description: 'Colleague - name was completely missing'
  },
  {
    email: 'kaileykildunne@priorityfinancial.net',
    expectedName: 'Kailey Kildunne',
    description: 'Colleague - had wrong data (Anthony\'s) attributed'
  }
];

/**
 * Extract name from subjects
 */
function extractNameFromSubjects(subjects) {
  for (const subject of subjects || []) {
    // Decode base64
    let decoded = subject;
    const b64Match = subject.match(/=\?UTF-8\?B\?([^?]+)\?=/i);
    if (b64Match) {
      try {
        decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
      } catch (e) { }
    }

    // Pattern: "Topic - Name" or "Name - Topic"
    const dashPattern = decoded.match(/^(.+?)\s*-\s*(.+)$/);
    if (dashPattern) {
      for (const part of [dashPattern[2], dashPattern[1]]) {
        const nameMatch = part.trim().match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
        if (nameMatch) {
          return `${nameMatch[1]} ${nameMatch[2]}`;
        }
      }
    }

    // Pattern: "Name's Topic"
    const possessive = decoded.match(/([A-Z][a-z]+)'s\s/);
    if (possessive) {
      return possessive[1]; // First name only
    }
  }
  return null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       VERIFY SPECIFIC CONTACTS                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Load index
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

  for (const test of VERIFY_CONTACTS) {
    console.log('═'.repeat(70));
    console.log(`VERIFYING: ${test.email}`);
    console.log(`Expected: ${test.expectedName}`);
    console.log(`Issue: ${test.description}`);
    console.log('═'.repeat(70));

    const data = index[test.email];
    if (!data) {
      console.log('❌ NOT FOUND IN INDEX\n');
      continue;
    }

    console.log('\n📋 LAYER 1: Pre-extraction from existing data');
    console.log('─'.repeat(50));
    console.log(`   Name in index: ${data.name || '(null)'}`);
    console.log(`   davidSent: ${data.davidSent}, davidReceived: ${data.davidReceived}`);
    console.log(`   Subjects: ${data.subjects?.slice(0, 3).join(' | ')}`);

    // Try to extract from subjects
    const subjectName = extractNameFromSubjects(data.subjects);
    if (subjectName) {
      console.log(`   ✓ Name from subject: ${subjectName}`);
    }

    // Determine final pre-extracted name
    const preExtractedName = data.name || subjectName || null;
    console.log(`   → Pre-extracted name: ${preExtractedName || '(none - needs LLM)'}`);

    // Now find emails from mbox and run LLM
    console.log('\n📧 LAYER 2: Finding emails from mbox files');
    console.log('─'.repeat(50));

    const emails = await findEmailsFromMbox(test.email, 2);
    console.log(`   Found ${emails.length} emails`);

    if (emails.length === 0) {
      console.log('   ⚠️ No emails found in mbox\n');
      continue;
    }

    // Show From header names
    emails.forEach((e, i) => {
      console.log(`   ${i+1}. From: "${e.fromName || '(none)'}" | Subject: ${e.subject?.substring(0, 40)}`);
    });

    // Run LLM on first email
    console.log('\n🤖 LAYER 3: LLM extraction');
    console.log('─'.repeat(50));

    try {
      const llmResult = await extractFromEmail({
        from: test.email,
        fromName: emails[0].fromName || preExtractedName || '',
        to: 'david@lendwisemtg.com',
        subject: emails[0].subject || '',
        date: emails[0].date || '',
        body: emails[0].body || ''
      });

      console.log(`   LLM name: ${llmResult.senderContact?.name || '(none)'}`);
      console.log(`   LLM phone: ${llmResult.senderContact?.phone || '(none)'}`);
      console.log(`   LLM company: ${llmResult.senderContact?.company || '(none)'}`);
      console.log(`   LLM title: ${llmResult.senderContact?.title || '(none)'}`);
      console.log(`   LLM NMLS: ${llmResult.senderContact?.nmls || '(none)'}`);
      console.log(`   LLM relationship: ${llmResult.relationship?.type || 'unknown'}`);

      // Final merged result
      const finalName = preExtractedName || emails[0].fromName || llmResult.senderContact?.name;

      console.log('\n✅ FINAL RESULT:');
      console.log('─'.repeat(50));
      console.log(`   Name: ${finalName || '(none)'}`);
      console.log(`   Match expected? ${finalName?.toLowerCase().includes(test.expectedName.split(' ')[0].toLowerCase()) ? '✓ YES' : '✗ NO'}`);

    } catch (err) {
      console.log(`   ❌ LLM Error: ${err.message}`);
    }

    console.log('');
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('VERIFICATION COMPLETE');
  console.log('═'.repeat(70));
}

/**
 * Find emails from mbox for a specific sender
 */
async function findEmailsFromMbox(targetEmail, limit = 2) {
  const emails = [];
  const targetLower = targetEmail.toLowerCase();

  for (const mboxPath of MBOX_PATHS) {
    if (!fs.existsSync(mboxPath)) continue;
    if (emails.length >= limit) break;

    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = null;

    for await (const line of rl) {
      if (line.startsWith('From ') && line.includes('@')) {
        if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 10) {
          emails.push({
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
          fromEmail: '', fromName: '', subject: '', date: '',
          body: [], isTarget: false, inHeaders: true
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
        if (currentEmail.body.length > 200) currentEmail.body.shift();
      }
    }
  }

  return emails;
}

main().catch(console.error);
