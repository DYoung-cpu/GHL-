/**
 * Batch Email Body Extractor
 *
 * Runs ONCE to extract phone, company, title, NMLS, DRE from email signatures
 * for all 391 confirmed contacts. Saves to enrichment-cache.json
 *
 * This is the data compilation step - run this BEFORE parsing/training.
 *
 * UPDATED: Now uses shared extractor.js for all extraction logic including:
 * - HTML-to-text conversion
 * - MIME quoted-printable decoding
 * - Signature quality assessment
 * - Improved quote/forward stripping
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import shared extractor - use ALL functions from here
const extractor = require('./utils/extractor');

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const INDEX_PATH = path.join(DATA_DIR, 'email-index.json');
const CACHE_PATH = path.join(DATA_DIR, 'enrichment-cache.json');
const AUDIT_LOG_PATH = path.join(DATA_DIR, 'extraction-audit.json');

const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

/**
 * Process a single mbox file and extract data for target emails
 */
async function processMboxFile(mboxPath, targetEmails, cache, stats) {
  if (!fs.existsSync(mboxPath)) {
    console.log(`  Skipping (not found): ${mboxPath}`);
    return;
  }

  const fileSize = fs.statSync(mboxPath).size;
  console.log(`  Processing: ${path.basename(mboxPath)} (${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);

  const rl = readline.createInterface({
    input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = { from: '', gmailLabels: '', body: [], textPlainBody: [], base64Buffer: [], inHeaders: false, inBody: false, currentMimeType: null, inBase64: false, textPlainIsBase64: false };
  let emailCount = 0;
  let matchCount = 0;
  let spamSkipped = 0;
  let lastProgress = 0;

  for await (const line of rl) {
    // Progress indicator every 100k lines
    stats.lines++;
    if (stats.lines - lastProgress >= 100000) {
      process.stdout.write(`\r    Lines: ${(stats.lines / 1000000).toFixed(1)}M | Emails: ${emailCount} | Matches: ${matchCount} | Spam skipped: ${spamSkipped}`);
      lastProgress = stats.lines;
    }

    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Decode any remaining base64 buffer before processing
      if (currentEmail.base64Buffer && currentEmail.base64Buffer.length > 0) {
        try {
          const base64Content = currentEmail.base64Buffer.join('');
          const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
          currentEmail.textPlainBody = currentEmail.textPlainBody || [];
          currentEmail.textPlainBody.push(...decoded.split('\n'));
        } catch (e) {
          // Ignore decode errors
        }
      }

      // Process previous email (skip spam/trash per project rules)
      const isSpamOrTrash = currentEmail.gmailLabels &&
        (currentEmail.gmailLabels.toLowerCase().includes('spam') ||
         currentEmail.gmailLabels.toLowerCase().includes('trash'));

      if (isSpamOrTrash) {
        spamSkipped++;
      } else if (currentEmail.body.length > 0) {
        const fromEmail = extractEmailFromHeader(currentEmail.from);
        if (fromEmail && targetEmails.has(fromEmail.toLowerCase())) {
          matchCount++;

          // Prefer text/plain body if available (no HTML/attachments)
          const rawBody = currentEmail.textPlainBody?.length > 5
            ? currentEmail.textPlainBody.join('\n')
            : currentEmail.body.join('\n');

          // Use shared extractor which handles:
          // - HTML-to-text conversion
          // - MIME quoted-printable decoding
          // - Quote/forward stripping
          // - Signature quality assessment
          const rawExtracted = extractor.extractFromBody(rawBody);

          // Filter out David's data to avoid attribution errors
          const extracted = filterDavidData(rawExtracted);

          // Extract name from From header
          const fromName = extractNameFromHeader(currentEmail.from);

          const phones = extracted.phones || [];
          const nmls = extracted.nmls;
          const dre = extracted.dre;
          const company = extracted.company;
          const title = extracted.title;
          const signatureQuality = extracted.signatureQuality || 'unknown';
          const signatureSample = extracted.signatureSample || '';

          // Update cache for this email
          const key = fromEmail.toLowerCase();
          if (!cache[key]) {
            cache[key] = {
              email: key,
              name: null,
              firstName: null,
              lastName: null,
              phones: [],
              nmls: null,
              dre: null,
              companies: [],
              titles: [],
              emailsProcessed: 0,
              sampleSignatures: [],
              signatureQuality: 'unknown',
              qualityCounts: { excellent: 0, good: 0, fair: 0, poor: 0, garbage: 0, unknown: 0 },
              filteredData: [] // Track what was filtered as David's data
            };
          }

          // Merge data
          cache[key].emailsProcessed++;

          // Ensure qualityCounts exists (for existing cache entries)
          if (!cache[key].qualityCounts) {
            cache[key].qualityCounts = { excellent: 0, good: 0, fair: 0, poor: 0, garbage: 0, unknown: 0 };
          }

          // Track signature quality distribution
          cache[key].qualityCounts[signatureQuality] = (cache[key].qualityCounts[signatureQuality] || 0) + 1;

          // Set overall quality to best quality seen
          const qualityRank = { excellent: 5, good: 4, fair: 3, poor: 2, garbage: 1, unknown: 0 };
          const currentQuality = cache[key].signatureQuality || 'unknown';
          if (qualityRank[signatureQuality] > qualityRank[currentQuality]) {
            cache[key].signatureQuality = signatureQuality;
          }

          // Store name from From header (take first valid one)
          if (fromName && !cache[key].name) {
            cache[key].name = fromName;
            // Split into first/last name
            const nameParts = fromName.split(/\s+/);
            if (nameParts.length >= 2) {
              cache[key].firstName = nameParts[0];
              cache[key].lastName = nameParts.slice(1).join(' ');
            } else if (nameParts.length === 1) {
              cache[key].firstName = nameParts[0];
            }
          }

          // Track filtered David data for debugging
          if (extracted.filteredNmls || extracted.filteredPhones || extracted.filteredCompany) {
            cache[key].filteredData = cache[key].filteredData || [];
            cache[key].filteredData.push({
              filteredNmls: extracted.filteredNmls,
              filteredPhones: extracted.filteredPhones,
              filteredCompany: extracted.filteredCompany
            });
          }

          if (phones.length) {
            for (const p of phones) {
              if (!cache[key].phones.includes(p)) {
                cache[key].phones.push(p);
              }
            }
          }
          if (nmls && !cache[key].nmls) cache[key].nmls = nmls;
          if (dre && !cache[key].dre) cache[key].dre = dre;
          if (company && !cache[key].companies.includes(company)) {
            cache[key].companies.push(company);
          }
          if (title && !cache[key].titles.includes(title)) {
            cache[key].titles.push(title);
          }

          // Store sample signature (first 3, prefer good quality)
          if (cache[key].sampleSignatures.length < 3 && signatureSample.trim() && signatureQuality !== 'garbage') {
            cache[key].sampleSignatures.push(signatureSample.substring(0, 500));
          }
        }
      }

      emailCount++;
      currentEmail = { from: '', gmailLabels: '', body: [], textPlainBody: [], base64Buffer: [], inHeaders: true, inBody: false, currentMimeType: null, inBase64: false, textPlainIsBase64: false };
      continue;
    }

    // Capture From header
    if (currentEmail.inHeaders && line.toLowerCase().startsWith('from:')) {
      currentEmail.from = line.substring(5).trim();
    }

    // Capture X-Gmail-Labels header (for spam/trash filtering)
    if (currentEmail.inHeaders && line.toLowerCase().startsWith('x-gmail-labels:')) {
      currentEmail.gmailLabels = line.substring(15).trim();
    }

    // End of headers
    if (line === '' && currentEmail.inHeaders) {
      currentEmail.inHeaders = false;
      currentEmail.inBody = true;
      continue;
    }

    // Capture body - but track MIME parts to get text/plain only
    if (currentEmail.inBody) {
      // Track MIME content type
      if (line.toLowerCase().startsWith('content-type:')) {
        currentEmail.currentMimeType = line.toLowerCase();
        // Reset base64 flag for new MIME part
        currentEmail.textPlainIsBase64 = false;
      }

      // Detect base64 encoding for current MIME part
      if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
        currentEmail.inBase64 = true;
        // If we're in text/plain, mark it as base64 encoded
        if (currentEmail.currentMimeType?.includes('text/plain')) {
          currentEmail.textPlainIsBase64 = true;
        }
      }

      // Track when we enter/exit text/plain sections
      if (currentEmail.currentMimeType?.includes('text/plain')) {
        // Don't include MIME headers in body
        if (!line.startsWith('Content-') && !line.startsWith('--') && line.trim()) {
          if (currentEmail.textPlainIsBase64) {
            // Collect base64 lines for later decoding
            if (/^[A-Za-z0-9+\/=]+$/.test(line.trim()) && line.trim().length > 10) {
              currentEmail.base64Buffer.push(line.trim());
            }
          } else {
            currentEmail.textPlainBody = currentEmail.textPlainBody || [];
            currentEmail.textPlainBody.push(line);
          }
        }
      }

      // MIME boundary - decode base64 if we have it, then reset
      if (line.startsWith('--') && line.length > 20) {
        // Decode base64 buffer if we have text/plain base64 content
        if (currentEmail.base64Buffer.length > 0) {
          try {
            const base64Content = currentEmail.base64Buffer.join('');
            const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
            currentEmail.textPlainBody = currentEmail.textPlainBody || [];
            currentEmail.textPlainBody.push(...decoded.split('\n'));
          } catch (e) {
            // Ignore decode errors
          }
          currentEmail.base64Buffer = [];
        }
        currentEmail.inBase64 = false;
        currentEmail.currentMimeType = null;
        currentEmail.textPlainIsBase64 = false;
      }

      // Also keep full body as fallback
      currentEmail.body.push(line);
      if (currentEmail.body.length > 200) {
        currentEmail.body.shift();
      }
    }
  }

  console.log(`\n    Complete: ${emailCount} emails, ${matchCount} matches, ${spamSkipped} spam/trash skipped`);
}

/**
 * Extract email address from From header
 */
function extractEmailFromHeader(fromHeader) {
  // Try to extract email from "Name <email>" format
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1];

  // Try bare email
  const emailMatch = fromHeader.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) return emailMatch[0];

  return null;
}

/**
 * Extract display name from From header
 * Examples:
 *   "Ken Aiken" <loanwebusa@verizon.net> -> Ken Aiken
 *   Ken Aiken <loanwebusa@verizon.net> -> Ken Aiken
 *   loanwebusa@verizon.net -> null
 */
function extractNameFromHeader(fromHeader) {
  if (!fromHeader) return null;

  // Pattern 1: "Name" <email> or 'Name' <email>
  const quotedMatch = fromHeader.match(/^["']([^"']+)["']\s*</);
  if (quotedMatch) return quotedMatch[1].trim();

  // Pattern 2: Name <email> (no quotes)
  const unquotedMatch = fromHeader.match(/^([^<]+)</);
  if (unquotedMatch) {
    const name = unquotedMatch[1].trim();
    // Make sure it's not just an email address
    if (name && !name.includes('@')) {
      return name;
    }
  }

  return null;
}

/**
 * David Young's known data - filter this out to avoid attribution errors
 */
const DAVID_DATA = {
  nmls: ['62043'],
  phones: ['8182239999', '3109547772', '8189363800'],
  emails: [
    'david@lendwisemtg.com',
    'davidyoung@priorityfinancial.net',
    'dyoung@onenationhomeloans.com',
    'david@priorityfinancial.net',
    'dyoung1946@gmail.com'
  ],
  companies: ['lendwise', 'priority financial', 'one nation']
};

/**
 * Filter out David's data from extracted results
 */
function filterDavidData(extracted) {
  const result = { ...extracted };

  // Filter NMLS
  if (result.nmls && DAVID_DATA.nmls.includes(result.nmls)) {
    result.nmls = null;
    result.filteredNmls = extracted.nmls; // Keep record of what was filtered
  }

  // Filter phones
  if (result.phones && result.phones.length) {
    const originalPhones = [...result.phones];
    result.phones = result.phones.filter(p => !DAVID_DATA.phones.includes(p));
    if (result.phones.length < originalPhones.length) {
      result.filteredPhones = originalPhones.filter(p => DAVID_DATA.phones.includes(p));
    }
  }

  // Filter company if it matches David's companies
  if (result.company) {
    const companyLower = result.company.toLowerCase();
    if (DAVID_DATA.companies.some(dc => companyLower.includes(dc))) {
      result.filteredCompany = result.company;
      result.company = null;
    }
  }

  return result;
}

/**
 * Main extraction process
 */
async function main() {
  console.log('='.repeat(60));
  console.log('  BATCH EMAIL BODY EXTRACTOR');
  console.log('='.repeat(60));
  console.log();

  // Load email index
  console.log('Loading email index...');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH));

  // Get confirmed contacts (those with exchange - davidSent > 0)
  const confirmed = Object.values(index).filter(c => c.davidSent > 0);
  console.log(`Found ${confirmed.length} confirmed contacts with email exchange`);

  // Build set of target emails
  const targetEmails = new Set();
  for (const contact of confirmed) {
    targetEmails.add(contact.email.toLowerCase());
    if (contact.altEmails) {
      for (const alt of contact.altEmails) {
        targetEmails.add(alt.toLowerCase());
      }
    }
  }
  console.log(`Tracking ${targetEmails.size} email addresses`);
  console.log();

  // Load existing cache or create new
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    console.log('Loading existing cache...');
    cache = JSON.parse(fs.readFileSync(CACHE_PATH));
    console.log(`Loaded ${Object.keys(cache).length} cached entries`);
  }

  // Process mbox files
  console.log('\nScanning mbox files for email bodies...');
  const stats = { lines: 0 };

  for (const mboxPath of MBOX_PATHS) {
    await processMboxFile(mboxPath, targetEmails, cache, stats);

    // Save progress after each file
    console.log('  Saving progress...');
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  EXTRACTION COMPLETE');
  console.log('='.repeat(60));

  const entries = Object.values(cache);
  const withName = entries.filter(c => c.name).length;
  const withPhone = entries.filter(c => c.phones.length > 0).length;
  const withNMLS = entries.filter(c => c.nmls).length;
  const withDRE = entries.filter(c => c.dre).length;
  const withCompany = entries.filter(c => c.companies.length > 0).length;
  const withTitle = entries.filter(c => c.titles.length > 0).length;
  const withFilteredData = entries.filter(c => c.filteredData?.length > 0).length;

  // Signature quality stats
  const qualityStats = { excellent: 0, good: 0, fair: 0, poor: 0, garbage: 0, unknown: 0 };
  entries.forEach(c => {
    qualityStats[c.signatureQuality] = (qualityStats[c.signatureQuality] || 0) + 1;
  });

  console.log(`\nTotal contacts enriched: ${entries.length}`);
  console.log(`  With name: ${withName}`);
  console.log(`  With phone numbers: ${withPhone}`);
  console.log(`  With NMLS: ${withNMLS}`);
  console.log(`  With DRE: ${withDRE}`);
  console.log(`  With company: ${withCompany}`);
  console.log(`  With title: ${withTitle}`);
  console.log(`  Had David's data filtered: ${withFilteredData}`);

  console.log(`\nSignature Quality Distribution:`);
  console.log(`  Excellent: ${qualityStats.excellent} (${(qualityStats.excellent/entries.length*100).toFixed(1)}%)`);
  console.log(`  Good:      ${qualityStats.good} (${(qualityStats.good/entries.length*100).toFixed(1)}%)`);
  console.log(`  Fair:      ${qualityStats.fair} (${(qualityStats.fair/entries.length*100).toFixed(1)}%)`);
  console.log(`  Poor:      ${qualityStats.poor} (${(qualityStats.poor/entries.length*100).toFixed(1)}%)`);
  console.log(`  Garbage:   ${qualityStats.garbage} (${(qualityStats.garbage/entries.length*100).toFixed(1)}%)`);
  console.log(`  Unknown:   ${qualityStats.unknown} (${(qualityStats.unknown/entries.length*100).toFixed(1)}%)`);

  const garbageRate = qualityStats.garbage / entries.length * 100;
  if (garbageRate > 10) {
    console.log(`\n⚠️  GARBAGE rate ${garbageRate.toFixed(1)}% is above 10% target`);
  } else {
    console.log(`\n✅ GARBAGE rate ${garbageRate.toFixed(1)}% is below 10% target`);
  }

  console.log(`\nSaved to: ${CACHE_PATH}`);

  // Generate extraction audit log
  console.log('\nGenerating extraction audit log...');
  const auditLog = generateAuditLog(cache, confirmed);
  fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(auditLog, null, 2));
  console.log(`Audit log saved to: ${AUDIT_LOG_PATH}`);
}

/**
 * Generate a detailed audit log of the extraction process
 */
function generateAuditLog(cache, confirmedContacts) {
  const timestamp = new Date().toISOString();
  const entries = Object.values(cache);

  // Categorize contacts
  const withName = [];
  const withPhone = [];
  const withNMLS = [];
  const withDRE = [];
  const withCompany = [];
  const withTitle = [];
  const hadFiltered = [];
  const noExtraction = [];
  const missingFromCache = [];

  // Track name sources
  const nameSources = { from_header: 0, signature: 0, body: 0, unknown: 0 };

  entries.forEach(entry => {
    if (entry.name) {
      withName.push({ email: entry.email, name: entry.name, source: entry.nameSource || 'unknown' });
      nameSources[entry.nameSource || 'unknown']++;
    }
    if (entry.phones?.length > 0) {
      withPhone.push({ email: entry.email, phones: entry.phones });
    }
    if (entry.nmls) {
      withNMLS.push({ email: entry.email, nmls: entry.nmls });
    }
    if (entry.dre) {
      withDRE.push({ email: entry.email, dre: entry.dre });
    }
    if (entry.companies?.length > 0) {
      withCompany.push({ email: entry.email, companies: entry.companies });
    }
    if (entry.titles?.length > 0) {
      withTitle.push({ email: entry.email, titles: entry.titles });
    }
    if (entry.filteredData?.length > 0) {
      hadFiltered.push({ email: entry.email, filtered: entry.filteredData });
    }

    // Check for contacts with no useful extraction
    const hasData = entry.name || entry.phones?.length > 0 || entry.nmls ||
                    entry.dre || entry.companies?.length > 0 || entry.titles?.length > 0;
    if (!hasData) {
      noExtraction.push({
        email: entry.email,
        emailsProcessed: entry.emailsProcessed || 0,
        signatureQuality: entry.signatureQuality
      });
    }
  });

  // Find contacts not in cache
  const cacheEmails = new Set(Object.keys(cache));
  confirmedContacts.forEach(contact => {
    if (!cacheEmails.has(contact.email.toLowerCase())) {
      missingFromCache.push({
        email: contact.email,
        davidSent: contact.davidSent,
        davidReceived: contact.davidReceived
      });
    }
  });

  return {
    timestamp,
    summary: {
      totalEnriched: entries.length,
      totalConfirmedContacts: confirmedContacts.length,
      missingFromCache: missingFromCache.length,
      withName: withName.length,
      withPhone: withPhone.length,
      withNMLS: withNMLS.length,
      withDRE: withDRE.length,
      withCompany: withCompany.length,
      withTitle: withTitle.length,
      hadFiltered: hadFiltered.length,
      noExtraction: noExtraction.length
    },
    nameSources,
    details: {
      withName,
      withNMLS,
      withDRE,
      hadFiltered,
      noExtraction: noExtraction.slice(0, 50), // Limit to first 50
      missingFromCache: missingFromCache.slice(0, 50) // Limit to first 50
    }
  };
}

main().catch(console.error);
