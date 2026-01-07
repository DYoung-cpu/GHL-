/**
 * Comprehensive Contact Extractor
 *
 * LAYER 1: Pre-extraction (no API calls)
 * - Use existing names from email-index.json
 * - Extract names from From headers
 * - Extract names from subject lines
 * - Merge contacts with altEmails
 *
 * LAYER 2: Mbox scanning (both files)
 * - Scan ALL emails from target contacts
 * - Extract From header names
 * - Collect email bodies for LLM
 *
 * LAYER 3: LLM enrichment (only for missing data)
 * - Phone, company, title, NMLS, DRE
 * - Relationship classification
 * - Email summaries
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const INDEX_PATH = path.join(DATA_DIR, 'email-index.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'comprehensive-contacts.json');
const PROGRESS_PATH = path.join(DATA_DIR, 'comprehensive-progress.json');

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

/**
 * LAYER 1: Extract what we can WITHOUT any API calls
 */
function preExtractFromIndex(index) {
  console.log('\n📋 LAYER 1: Pre-extraction from existing data...\n');

  const contacts = {};
  let namesFromIndex = 0;
  let namesFromSubjects = 0;

  let skippedNoExchange = 0;

  for (const [email, data] of Object.entries(index)) {
    // HARD GATE: Bi-directional exchange required
    // Contact must have BOTH sent AND received emails (real conversation)
    const hasBidirectional = data.davidSent > 0 && data.davidReceived > 0;
    if (!hasBidirectional) {
      skippedNoExchange++;
      continue;
    }

    const contact = {
      email: email.toLowerCase(),
      altEmails: (data.altEmails || []).map(e => e.toLowerCase()),
      preExtracted: {
        name: null,
        nameSource: null,
        nameConfidence: 0
      },
      fromIndex: {
        davidSent: data.davidSent,
        davidReceived: data.davidReceived,
        totalEmails: data.totalEmails,
        firstContact: data.firstContact,
        lastContact: data.lastContact,
        subjects: data.subjects || []
      },
      needsLLM: true, // Will be set to false if we have good data
      emails: [] // Will be filled by mbox scan
    };

    // Source 1: Name already in index
    if (data.name) {
      contact.preExtracted.name = data.name;
      contact.preExtracted.nameSource = 'email_index';
      contact.preExtracted.nameConfidence = 90;
      namesFromIndex++;
    }

    // Source 2: Try to extract from subject lines
    if (!contact.preExtracted.name && data.subjects?.length > 0) {
      const extractedName = extractNameFromSubjects(data.subjects, email);
      if (extractedName) {
        contact.preExtracted.name = extractedName.name;
        contact.preExtracted.nameSource = 'subject_line';
        contact.preExtracted.nameConfidence = extractedName.confidence;
        namesFromSubjects++;
      }
    }

    contacts[email] = contact;
  }

  console.log(`   Contacts loaded: ${Object.keys(contacts).length}`);
  console.log(`   Skipped (no bi-directional exchange): ${skippedNoExchange}`);
  console.log(`   Names from index: ${namesFromIndex}`);
  console.log(`   Names from subjects: ${namesFromSubjects}`);
  console.log(`   Still need name extraction: ${Object.values(contacts).filter(c => !c.preExtracted.name).length}`);

  return contacts;
}

/**
 * Extract name from subject lines
 */
function extractNameFromSubjects(subjects, email) {
  const emailUser = email.split('@')[0].toLowerCase();

  for (const subject of subjects) {
    // Decode base64 subjects
    let decoded = subject;
    const b64Match = subject.match(/=\?UTF-8\?B\?([^?]+)\?=/i);
    if (b64Match) {
      try {
        decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
      } catch (e) { }
    }

    // Pattern: "Name - Topic" or "Topic - Name"
    // e.g., "Free Rate Update Intro - Ken Aiken"
    const dashPattern = decoded.match(/^(.+?)\s*-\s*(.+)$/);
    if (dashPattern) {
      const part1 = dashPattern[1].trim();
      const part2 = dashPattern[2].trim();

      // Check if either part looks like a name (First Last)
      for (const part of [part2, part1]) {
        const nameMatch = part.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
        if (nameMatch) {
          const potentialName = `${nameMatch[1]} ${nameMatch[2]}`;
          // Make sure it's not David Young
          if (!potentialName.toLowerCase().includes('david young')) {
            return { name: potentialName, confidence: 75 };
          }
        }
      }
    }

    // Pattern: "Re: Name File" or "Name Loan"
    const filePattern = decoded.match(/(?:Re:|Fwd?:)?\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:File|Loan|Application|DSCR)/i);
    if (filePattern) {
      const potentialName = `${filePattern[1]} ${filePattern[2]}`;
      if (!potentialName.toLowerCase().includes('david young')) {
        return { name: potentialName, confidence: 70 };
      }
    }

    // Pattern: "Name's Topic" e.g., "Ken's Lamia DSCR"
    const possessivePattern = decoded.match(/([A-Z][a-z]+)'s\s/);
    if (possessivePattern) {
      // This gives us first name only
      return { name: possessivePattern[1], confidence: 50 };
    }
  }

  return null;
}

/**
 * LAYER 2: Scan mbox files for From header names and email bodies
 */
async function scanMboxFiles(contacts) {
  console.log('\n📧 LAYER 2: Scanning mbox files...\n');

  const targetEmails = new Set(Object.keys(contacts));
  // DISABLED: Don't add alt emails as targets
  // The altEmails in email-index.json are incorrect (contain other people from threads)
  // for (const contact of Object.values(contacts)) {
  //   contact.altEmails.forEach(alt => targetEmails.add(alt));
  // }

  let totalMatches = 0;
  let namesFromHeaders = 0;

  for (const mboxPath of MBOX_PATHS) {
    if (!fs.existsSync(mboxPath)) {
      console.log(`   Skipping (not found): ${path.basename(path.dirname(mboxPath))}`);
      continue;
    }

    console.log(`   Scanning: ${path.basename(path.dirname(mboxPath))}`);

    const fileSize = fs.statSync(mboxPath).size;
    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = null;
    let lineCount = 0;
    let emailCount = 0;
    let bytePosition = 0;

    for await (const line of rl) {
      lineCount++;
      bytePosition += Buffer.byteLength(line, 'utf-8') + 1;

      if (lineCount % 2000000 === 0) {
        const pct = ((bytePosition / fileSize) * 100).toFixed(1);
        process.stdout.write(`\r     ${pct}% | ${emailCount} emails | ${totalMatches} matches`);
      }

      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Process previous email
        if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 10) {
          const contactKey = findContactKey(contacts, currentEmail.fromEmail);
          if (contactKey && contacts[contactKey].emails.length < 5) {
            contacts[contactKey].emails.push({
              fromName: currentEmail.fromName,
              subject: currentEmail.subject,
              date: currentEmail.date,
              body: currentEmail.body.join('\n')
            });
            totalMatches++;

            // Update name from From header if we don't have one
            if (currentEmail.fromName && !contacts[contactKey].preExtracted.name) {
              const cleanName = cleanFromName(currentEmail.fromName);
              if (cleanName && !isDavidOrTeam(cleanName)) {
                contacts[contactKey].preExtracted.name = cleanName;
                contacts[contactKey].preExtracted.nameSource = 'from_header';
                contacts[contactKey].preExtracted.nameConfidence = 85;
                namesFromHeaders++;
              }
            }
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

          // Extract email
          const emailMatch = val.match(/<([^>]+)>/) || val.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
            currentEmail.isTarget = targetEmails.has(currentEmail.fromEmail);
          }

          // Extract name from From header
          const nameMatch = val.match(/^"?([^"<]+)"?\s*</);
          if (nameMatch) {
            currentEmail.fromName = nameMatch[1].trim();
          }
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
    if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 10) {
      const contactKey = findContactKey(contacts, currentEmail.fromEmail);
      if (contactKey && contacts[contactKey].emails.length < 5) {
        contacts[contactKey].emails.push({
          fromName: currentEmail.fromName,
          subject: currentEmail.subject,
          date: currentEmail.date,
          body: currentEmail.body.join('\n')
        });
        totalMatches++;
      }
    }

    console.log(`\r     100% | ${emailCount} emails | ${totalMatches} matches`);
  }

  console.log(`\n   Total emails indexed: ${totalMatches}`);
  console.log(`   Names from From headers: ${namesFromHeaders}`);

  // Count contacts with emails
  const withEmails = Object.values(contacts).filter(c => c.emails.length > 0).length;
  console.log(`   Contacts with emails: ${withEmails}`);

  return contacts;
}

/**
 * Find the primary contact key for an email
 * NOTE: We only match on PRIMARY email, not altEmails
 * because altEmails from the index are often incorrect
 * (they contain other people from same email threads)
 */
function findContactKey(contacts, email) {
  email = email.toLowerCase();

  // Direct match only - do NOT use altEmails
  if (contacts[email]) return email;

  // DISABLED: altEmails matching causes wrong data attribution
  // The altEmails in email-index.json contain other people from same threads
  // not actual alternate email addresses for the contact
  /*
  for (const [key, contact] of Object.entries(contacts)) {
    if (contact.altEmails.includes(email)) return key;
  }
  */

  return null;
}

/**
 * Clean up From header name
 */
function cleanFromName(name) {
  if (!name) return null;

  // Remove quotes
  name = name.replace(/^["']|["']$/g, '').trim();

  // Skip if it's just an email
  if (name.includes('@')) return null;

  // Skip if too short
  if (name.length < 3) return null;

  // Skip if it looks like a company
  if (name.match(/inc\.|llc|corp\.|company|mortgage|lending|financial/i)) return null;

  return name;
}

/**
 * Check if name belongs to David or his team
 */
function isDavidOrTeam(name) {
  const lower = name.toLowerCase();
  const teamNames = [
    'david young', 'david', 'anthony amini', 'anthony',
    'sara cohen', 'sara', 'lendwise', 'priority financial'
  ];
  return teamNames.some(t => lower.includes(t));
}

/**
 * PRE-FILTER: Check if email is obviously non-human (skip LLM call)
 * Returns { isHuman: false, reason: '...' } or null if might be human
 */
function preFilterNonHuman(email) {
  const lower = email.toLowerCase();

  // Automated system addresses
  if (/^(noreply|no-reply|donotreply|do-not-reply)/.test(lower)) {
    return { isHuman: false, reason: 'Automated noreply address' };
  }
  if (/^(postmaster|mailer-daemon|bounce|automated|system)@/.test(lower)) {
    return { isHuman: false, reason: 'System address' };
  }
  if (/^(notifications|alerts|updates|newsletter|confirmations)@/.test(lower)) {
    return { isHuman: false, reason: 'Notification/alert address' };
  }

  // Machine-generated domains
  if (/@(mypixmessages|vzwpix|txt\.att)\./.test(lower)) {
    return { isHuman: false, reason: 'SMS gateway' };
  }
  if (/@.*\.onmicrosoft\.com$/.test(lower)) {
    return { isHuman: false, reason: 'Microsoft system address' };
  }
  if (/@(em\d+\.|alert\.|worker\d+\.)/.test(lower)) {
    return { isHuman: false, reason: 'Marketing platform address' };
  }

  // Obvious spam/marketing patterns
  if (/^(order|shipping|billing|receipt|invoice)@/.test(lower)) {
    return { isHuman: false, reason: 'Transactional email address' };
  }

  // Generic business addresses (per user decision: auto-delete all)
  if (/^(info|support|sales|contact|hello|feedback|help|service|admin)@/.test(lower)) {
    return { isHuman: false, reason: 'Generic business address' };
  }

  // DocuSign notifications
  if (/@docusign\.(net|com)$/i.test(lower) || /dse_.*@docusign/i.test(lower)) {
    return { isHuman: false, reason: 'DocuSign notification' };
  }

  // Google Drive/Sheets/Docs notifications
  if (/drive-shares.*@google\.com/i.test(lower) || /@docs\.google\.com/i.test(lower)) {
    return { isHuman: false, reason: 'Google Drive notification' };
  }

  // Vendor notification patterns
  if (/@.*followupboss\.com$/i.test(lower)) {
    return { isHuman: false, reason: 'Vendor notification (Follow Up Boss)' };
  }

  // Adobe notifications
  if (/@adobesign\.com$/i.test(lower) || /@mail\.adobe\.com$/i.test(lower)) {
    return { isHuman: false, reason: 'Adobe notification' };
  }

  // Vimeo notifications
  if (/@vimeo\.com$/i.test(lower)) {
    return { isHuman: false, reason: 'Vimeo notification' };
  }

  // Common notification subdomains (email., mail., notifications., alerts., updates.)
  if (/@(email|mail|notifications?|alerts?|updates?)\./i.test(lower)) {
    return { isHuman: false, reason: 'Notification subdomain' };
  }

  return null; // Might be human - needs LLM check
}

/**
 * LAYER 3: LLM enrichment for contacts missing data
 */
async function enrichWithLLM(contacts, options = {}) {
  const { limit = null, skipExisting = true } = options;

  console.log('\n🤖 LAYER 3: LLM enrichment for missing data...\n');

  // Determine which contacts need LLM processing
  const needsProcessing = Object.entries(contacts)
    .filter(([email, c]) => {
      // Must have emails to process
      if (c.emails.length === 0) return false;

      // Skip if already has complete data
      if (skipExisting && c.llmExtracted) return false;

      return true;
    })
    .slice(0, limit || Infinity);

  console.log(`   Contacts to process: ${needsProcessing.length}`);

  let processed = 0;
  let errors = 0;

  let skippedNonHuman = 0;

  for (const [email, contact] of needsProcessing) {
    processed++;
    process.stdout.write(`\r   [${processed}/${needsProcessing.length}] ${email.padEnd(40)}`);

    // PRE-FILTER: Skip obviously non-human emails (saves LLM calls)
    const nonHumanCheck = preFilterNonHuman(email);
    if (nonHumanCheck) {
      contact.llmExtracted = {
        isHuman: false,
        shouldDelete: true,
        deleteReason: nonHumanCheck.reason
      };
      contact.finalProfile = mergeProfiles(contact);
      skippedNonHuman++;
      continue;
    }

    const extractions = [];

    for (const emailData of contact.emails) {
      try {
        // Decode base64 subject if needed
        let subject = emailData.subject || '';
        const b64Match = subject.match(/=\?(?:UTF-8|utf-8)\?B\?([^?]+)\?=/i);
        if (b64Match) {
          try {
            subject = Buffer.from(b64Match[1], 'base64').toString('utf-8');
          } catch (e) {
            // Keep original if decode fails
          }
        }

        const result = await extractFromEmail({
          from: email,
          fromName: emailData.fromName || contact.preExtracted.name || '',
          to: 'david@lendwisemtg.com',
          subject: subject,
          date: emailData.date || '',
          body: emailData.body || ''
        });
        extractions.push(result);
      } catch (err) {
        extractions.push({ error: err.message });
        errors++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    // Aggregate LLM results
    contact.llmExtracted = aggregateLLMResults(extractions);

    // Merge pre-extracted and LLM data
    contact.finalProfile = mergeProfiles(contact);
  }

  if (skippedNonHuman > 0) {
    console.log(`\n   Pre-filtered non-human: ${skippedNonHuman} (saved LLM calls)`);
  }

  console.log(`\n\n   Processed: ${processed}`);
  console.log(`   Errors: ${errors}`);

  return contacts;
}

/**
 * Aggregate multiple LLM extractions
 */
function aggregateLLMResults(extractions) {
  const valid = extractions.filter(e => !e.error);

  if (valid.length === 0) {
    return { error: 'No successful extractions' };
  }

  // CHECK IF NON-HUMAN - if ANY extraction says isHuman: false, flag for deletion
  const nonHumanResult = valid.find(e => e.isHuman === false);
  if (nonHumanResult) {
    return {
      isHuman: false,
      deleteReason: nonHumanResult.deleteReason || 'Non-human contact detected by LLM',
      shouldDelete: true
    };
  }

  // Get best value by confidence
  function getBest(field, subfield = null) {
    const candidates = valid
      .filter(e => {
        const val = subfield ? e[field]?.[subfield] : e[field];
        return val !== null && val !== undefined && val !== '';
      })
      .sort((a, b) => (b.senderContact?.confidence || 0) - (a.senderContact?.confidence || 0));

    return candidates[0] ? (subfield ? candidates[0][field]?.[subfield] : candidates[0][field]) : null;
  }

  // Collect all phones with validation (must be 10 digits)
  const allPhones = new Set();
  function validatePhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    // Must be exactly 10 digits (US phone)
    if (digits.length === 10) return digits;
    // Handle 11 digits starting with 1 (US country code)
    if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
    return null;
  }

  valid.forEach(e => {
    const validPhone = validatePhone(e.senderContact?.phone);
    if (validPhone) allPhones.add(validPhone);
    if (e.senderContact?.altPhones) {
      e.senderContact.altPhones.forEach(p => {
        const vp = validatePhone(p);
        if (vp) allPhones.add(vp);
      });
    }
  });

  // Get relationship consensus
  const relCounts = {};
  valid.forEach(e => {
    const type = e.relationship?.type;
    if (type && type !== 'unknown') relCounts[type] = (relCounts[type] || 0) + 1;
  });
  const topRel = Object.entries(relCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    name: getBest('senderContact', 'name'),
    phone: getBest('senderContact', 'phone'),
    phones: Array.from(allPhones),
    company: getBest('senderContact', 'company'),
    title: getBest('senderContact', 'title'),
    nmls: getBest('senderContact', 'nmls'),
    dre: getBest('senderContact', 'dre'),
    website: getBest('senderContact', 'website'),
    confidence: Math.max(...valid.map(e => e.senderContact?.confidence || 0)),

    relationship: {
      type: topRel?.[0] || 'unknown',
      confidence: Math.max(...valid.map(e => e.relationship?.confidence || 0)),
      signals: [...new Set(valid.flatMap(e => e.relationship?.signals || []))].slice(0, 5)
    },

    emailSummaries: valid
      .filter(e => e.emailAnalysis?.summary)
      .map(e => ({
        date: e._meta?.emailDate,
        subject: e._meta?.emailSubject,
        summary: e.emailAnalysis.summary,
        intent: e.emailAnalysis.intent
      }))
  };
}

/**
 * Merge pre-extracted and LLM data into final profile
 */
function mergeProfiles(contact) {
  const pre = contact.preExtracted || {};
  const llm = contact.llmExtracted || {};

  // If LLM flagged as non-human, mark for deletion
  if (llm.shouldDelete || llm.isHuman === false) {
    return {
      email: contact.email,
      isHuman: false,
      shouldDelete: true,
      deleteReason: llm.deleteReason || 'Non-human contact'
    };
  }

  return {
    email: contact.email,
    altEmails: contact.altEmails,
    isHuman: true,

    // Name: prefer pre-extracted if high confidence, else LLM
    name: (pre.nameConfidence >= 75 && pre.name) ? pre.name : (llm.name || pre.name || null),
    nameSource: (pre.nameConfidence >= 75 && pre.name) ? pre.nameSource : (llm.name ? 'llm' : pre.nameSource),

    // Contact info from LLM
    phone: llm.phone || null,
    phones: llm.phones || [],
    company: llm.company || null,
    title: llm.title || null,
    nmls: llm.nmls || null,
    dre: llm.dre || null,
    website: llm.website || null,

    // Relationship from LLM
    relationship: llm.relationship || { type: 'unknown', confidence: 0, signals: [] },

    // Email history
    emailHistory: llm.emailSummaries || [],

    // Metadata
    stats: {
      davidSent: contact.fromIndex?.davidSent || 0,
      davidReceived: contact.fromIndex?.davidReceived || 0,
      totalEmails: contact.fromIndex?.totalEmails || 0,
      firstContact: contact.fromIndex?.firstContact,
      lastContact: contact.fromIndex?.lastContact,
      emailsProcessed: contact.emails?.length || 0
    },

    confidence: Math.max(pre.nameConfidence || 0, llm.confidence || 0),
    processedAt: new Date().toISOString()
  };
}

/**
 * Generate summary report
 */
function generateReport(contacts) {
  const all = Object.values(contacts);
  const withFinal = all.filter(c => c.finalProfile);

  console.log('\n' + '═'.repeat(70));
  console.log('COMPREHENSIVE EXTRACTION REPORT');
  console.log('═'.repeat(70));

  console.log('\n📊 OVERVIEW:');
  console.log(`   Total contacts: ${all.length}`);
  console.log(`   Processed with LLM: ${withFinal.length}`);
  console.log(`   With emails found: ${all.filter(c => c.emails?.length > 0).length}`);

  // Name sources
  const nameSources = {};
  withFinal.forEach(c => {
    const src = c.finalProfile.nameSource || 'none';
    nameSources[src] = (nameSources[src] || 0) + 1;
  });

  console.log('\n📛 NAME EXTRACTION SOURCES:');
  Object.entries(nameSources).sort((a,b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`   ${src}: ${count}`);
  });

  // Data completeness
  const withName = withFinal.filter(c => c.finalProfile.name).length;
  const withPhone = withFinal.filter(c => c.finalProfile.phone || c.finalProfile.phones?.length > 0).length;
  const withCompany = withFinal.filter(c => c.finalProfile.company).length;
  const withNMLS = withFinal.filter(c => c.finalProfile.nmls).length;

  console.log('\n📈 DATA COMPLETENESS:');
  console.log(`   With name: ${withName} (${(withName/withFinal.length*100).toFixed(1)}%)`);
  console.log(`   With phone: ${withPhone} (${(withPhone/withFinal.length*100).toFixed(1)}%)`);
  console.log(`   With company: ${withCompany} (${(withCompany/withFinal.length*100).toFixed(1)}%)`);
  console.log(`   With NMLS: ${withNMLS} (${(withNMLS/withFinal.length*100).toFixed(1)}%)`);

  // Relationship breakdown
  const relCounts = {};
  withFinal.forEach(c => {
    const type = c.finalProfile.relationship?.type || 'unknown';
    relCounts[type] = (relCounts[type] || 0) + 1;
  });

  console.log('\n👥 RELATIONSHIP TYPES:');
  Object.entries(relCounts).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       COMPREHENSIVE CONTACT EXTRACTOR                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Load email index
  console.log('\n📂 Loading email index...');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  console.log(`   Loaded ${Object.keys(index).length} contacts from index`);

  // LAYER 1: Pre-extraction
  const contacts = preExtractFromIndex(index);

  // LAYER 2: Mbox scanning
  await scanMboxFiles(contacts);

  // Show what we have before LLM
  const preStats = {
    total: Object.keys(contacts).length,
    withName: Object.values(contacts).filter(c => c.preExtracted.name).length,
    withEmails: Object.values(contacts).filter(c => c.emails.length > 0).length
  };

  console.log('\n📋 PRE-LLM STATUS:');
  console.log(`   Total contacts: ${preStats.total}`);
  console.log(`   Already have name: ${preStats.withName}`);
  console.log(`   Have emails for LLM: ${preStats.withEmails}`);
  console.log(`   Need LLM for name: ${preStats.withEmails - preStats.withName}`);

  // LAYER 3: LLM enrichment
  // For testing, limit to first 10
  const testMode = process.argv.includes('--test');
  const limit = testMode ? 10 : null;

  if (testMode) {
    console.log('\n⚠️  TEST MODE: Processing only 10 contacts');
  }

  await enrichWithLLM(contacts, { limit });

  // Generate report
  generateReport(contacts);

  // Save results - SKIP non-human contacts
  const output = {};
  let humanCount = 0;
  let deletedCount = 0;
  const deletedContacts = [];

  for (const [email, contact] of Object.entries(contacts)) {
    if (contact.finalProfile) {
      // Skip non-human contacts
      if (contact.finalProfile.shouldDelete || contact.finalProfile.isHuman === false) {
        deletedCount++;
        deletedContacts.push({
          email,
          reason: contact.finalProfile.deleteReason || 'Non-human'
        });
        continue;
      }
      output[email] = contact.finalProfile;
      humanCount++;
    }
  }

  // Report deleted contacts
  if (deletedCount > 0) {
    console.log(`\n🗑️  NON-HUMAN CONTACTS REMOVED: ${deletedCount}`);
    deletedContacts.slice(0, 10).forEach(c => {
      console.log(`   - ${c.email}: ${c.reason}`);
    });
    if (deletedContacts.length > 10) {
      console.log(`   ... and ${deletedContacts.length - 10} more`);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved ${humanCount} human contacts to: ${OUTPUT_PATH}`);
  console.log(`   (${deletedCount} non-human contacts excluded)`);
}

// Export for testing
module.exports = {
  preExtractFromIndex,
  extractNameFromSubjects,
  scanMboxFiles,
  enrichWithLLM
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
