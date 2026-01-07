/**
 * Agent 2: Contact Enricher
 *
 * Purpose: Extract full contact details from email content
 * Runs ONLY on contacts that passed exchange validation
 *
 * Extracts:
 *   - First Name, Last Name
 *   - Phone (from signature)
 *   - NMLS # (if loan officer)
 *   - DRE # (if realtor)
 *   - Company, Title
 *   - Contact classification with confidence
 *
 * Uses definitive signals for 100% accuracy classification:
 *   - NMLS = Loan Officer
 *   - Rate Lock/Loan Estimate = Client
 *   - DRE# = Realtor
 *
 * UPDATED: Now uses shared extraction module with:
 *   - Base64 decoding for Outlook emails
 *   - Improved garbage line filtering (allows formatted signatures)
 *   - Supabase logging for tracking
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Import shared extraction utilities
const extractor = require('../utils/extractor');
const supabase = require('../utils/supabase-client');
const { isPersonalEmail } = require('../auto-classifier');

// Mbox file paths (same as index builder)
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Regex patterns for extraction
const PATTERNS = {
  // Phone patterns
  phone: /(?:\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,

  // NMLS - definitive loan officer signal
  nmls: /NMLS\s*[#:]?\s*(\d{4,7})/gi,

  // DRE/CalBRE - definitive realtor signal
  dre: /(?:DRE|CalBRE|BRE)\s*[#:]?\s*(\d{7,9})/gi,

  // Name from "From:" header (captures "First Last" before email)
  nameFromHeader: /^["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)["']?\s*</i,

  // Company patterns
  company: /(?:^|\n)([A-Z][A-Za-z0-9\s&,'.-]+(?:Inc|LLC|Corp|Company|Group|Bank|Lending|Mortgage|Realty|Properties)\.?)\s*(?:\n|$)/gim
};

// Definitive classification signals
const DEFINITIVE_SIGNALS = {
  loan_officer: {
    patterns: ['NMLS', 'Loan Officer', 'Mortgage Loan Originator', 'MLO', 'Branch Manager'],
    confidence: 1.0
  },
  client: {
    patterns: ['Rate Lock', 'Loan Estimate', 'Closing Disclosure', 'Documentation Request', 'Pre-Approval', 'Pre-Qual'],
    confidence: 1.0
  },
  realtor: {
    patterns: ['DRE#', 'DRE #', 'CalBRE', 'Real Estate Agent', 'Realtor'],
    confidence: 1.0
  },
  title_escrow: {
    patterns: ['Escrow Officer', 'Title Officer', 'Escrow Number'],
    confidence: 1.0
  }
};

/**
 * TITLE_ROLE_MAP: Maps job title keywords to role categories
 * Priority order matters - finance/hr/compliance should override NMLS detection
 * because someone with NMLS but "Controller" title is Finance, not a loan officer
 */
const TITLE_ROLE_MAP = {
  // Non-mortgage roles - these OVERRIDE NMLS detection
  finance: ['controller', 'cfo', 'accountant', 'accounting', 'bookkeeper', 'finance', 'treasurer', 'comptroller'],
  hr: ['hr', 'human resources', 'recruiter', 'recruiting', 'talent', 'people operations'],
  compliance: ['compliance', 'risk manager', 'auditor', 'quality control', 'qc manager'],
  operations: ['operations manager', 'ops manager', 'director of operations', 'evp operations', 'vp operations'],
  admin: ['receptionist', 'administrative assistant', 'office administrator', 'executive assistant'],
  marketing: ['marketing', 'social media', 'content manager', 'brand manager'],
  it: ['it manager', 'developer', 'software engineer', 'tech support', 'systems admin'],

  // Mortgage-specific roles (only if no override above)
  loan_officer: ['loan officer', 'mlo', 'mortgage loan originator', 'loan consultant', 'loan advisor', 'mortgage consultant', 'senior loan officer'],
  processor: ['processor', 'loan processor', 'processing manager', 'sr processor'],
  underwriter: ['underwriter', 'underwriting manager', 'sr underwriter'],
  closer: ['closer', 'closing coordinator', 'funder', 'funding manager', 'post closer'],
  manager: ['branch manager', 'sales manager', 'regional manager', 'area manager', 'production manager'],

  // External partner roles
  realtor: ['realtor', 'real estate agent', 'broker associate', 'real estate broker', 'real estate professional'],
  title_escrow: ['escrow officer', 'title officer', 'settlement agent', 'escrow assistant'],
  attorney: ['attorney', 'lawyer', 'counsel', 'paralegal'],
  insurance: ['insurance agent', 'insurance broker', 'ins agent'],
  appraiser: ['appraiser', 'appraisal manager']
};

// Roles that should NOT be overridden by NMLS detection
const NON_LO_OVERRIDE_ROLES = ['finance', 'hr', 'compliance', 'operations', 'admin', 'marketing', 'it'];

/**
 * Extract phone numbers from text (signature area)
 * Uses shared extractor module for consistent results
 */
function extractPhones(text) {
  // Use shared extractor with proper garbage filtering
  return extractor.extractPhones(text);
}

/**
 * Extract NMLS number from text
 * Uses shared extractor module
 */
function extractNMLS(text) {
  return extractor.extractNMLS(text);
}

/**
 * Extract DRE number from text
 * Uses shared extractor module
 */
function extractDRE(text) {
  return extractor.extractDRE(text);
}

/**
 * Extract name from From: header
 */
function extractName(fromHeader) {
  if (!fromHeader) return { firstName: null, lastName: null };

  // Try "First Last" <email> pattern
  const match = fromHeader.match(PATTERNS.nameFromHeader);
  if (match) {
    const parts = match[1].trim().split(/\s+/);
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
  }

  // Try just the part before @ or <
  const beforeEmail = fromHeader.split(/[<@]/)[0].replace(/['"]/g, '').trim();
  if (beforeEmail && beforeEmail.includes(' ')) {
    const parts = beforeEmail.split(/\s+/);
    if (parts.length >= 2 && parts[0].length > 1) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
  }

  return { firstName: null, lastName: null };
}

/**
 * Classify contact by their extracted job titles
 * This should be checked BEFORE NMLS to catch Finance/HR/Operations people
 * who may have NMLS but aren't active loan officers
 *
 * @param {string[]} titles - Array of titles from enrichment cache
 * @returns {object|null} Classification result or null if no match
 */
function classifyByTitle(titles) {
  if (!titles || titles.length === 0) return null;

  const allTitles = titles.join(' ').toLowerCase();

  // Priority order: Non-LO roles first, then mortgage roles, then external
  const priorityOrder = [
    // These override NMLS detection
    'finance', 'hr', 'compliance', 'operations', 'admin', 'marketing', 'it',
    // Mortgage-specific (only if no override above)
    'processor', 'underwriter', 'closer', 'manager', 'loan_officer',
    // External partners
    'realtor', 'title_escrow', 'attorney', 'insurance', 'appraiser'
  ];

  for (const role of priorityOrder) {
    const keywords = TITLE_ROLE_MAP[role];
    if (!keywords) continue;

    for (const keyword of keywords) {
      if (allTitles.includes(keyword.toLowerCase())) {
        return {
          type: role,
          confidence: 0.95,
          signal: `title:${keyword}`
        };
      }
    }
  }

  return null;
}

/**
 * Classify contact type using definitive signals
 * UPDATED: Now accepts optional enrichedData to check titles first
 */
function classifyContact(emailBody, subjects, enrichedData = null) {
  const allText = (emailBody + ' ' + subjects.join(' ')).toLowerCase();

  // STEP 1: Check titles FIRST (from enrichment cache)
  // This catches Finance/HR/Operations people who have NMLS but aren't active LOs
  if (enrichedData?.titles) {
    const titleClassification = classifyByTitle(enrichedData.titles);
    if (titleClassification) {
      // If title indicates non-LO role, use it even if NMLS present
      if (NON_LO_OVERRIDE_ROLES.includes(titleClassification.type)) {
        return titleClassification;
      }
      // For mortgage roles (processor, underwriter, etc.), use the title classification
      // instead of defaulting to loan_officer just because NMLS exists
      if (['processor', 'underwriter', 'closer', 'manager'].includes(titleClassification.type)) {
        return titleClassification;
      }
    }
  }

  // STEP 2: Check for NMLS (only if title didn't override)
  if (/nmls/i.test(allText)) {
    return { type: 'loan_officer', confidence: 0.9, signal: 'NMLS' };  // Reduced from 1.0
  }

  // Check for DRE (100% realtor)
  if (/(?:dre|calbre)\s*[#:]/i.test(allText)) {
    return { type: 'realtor', confidence: 1.0, signal: 'DRE#' };
  }

  // Check for loan documents (100% client)
  const clientDocs = ['rate lock', 'loan estimate', 'closing disclosure', 'documentation request', 'pre-approval', 'pre-qual'];
  for (const doc of clientDocs) {
    if (allText.includes(doc)) {
      return { type: 'client', confidence: 1.0, signal: doc };
    }
  }

  // Check for escrow/title signals
  if (/escrow\s*(?:officer|number|#)/i.test(allText) || /title\s*officer/i.test(allText)) {
    return { type: 'title_escrow', confidence: 1.0, signal: 'escrow/title' };
  }

  // High-confidence patterns (not 100% but very likely)
  if (/\bi have a client\b/i.test(allText) || /\breferring\b/i.test(allText)) {
    return { type: 'loan_officer', confidence: 0.8, signal: 'referring client' };
  }

  if (/\blisting\b/i.test(allText) || /\bshowing\b/i.test(allText) || /\bmls\b/i.test(allText)) {
    return { type: 'realtor', confidence: 0.7, signal: 'listing/showing' };
  }

  if (/\bpurchas(?:e|ing)\b/i.test(allText) || /\bbuy(?:ing)?\s+(?:a\s+)?(?:house|home)\b/i.test(allText)) {
    return { type: 'client', confidence: 0.7, signal: 'purchasing' };
  }

  if (/\brefin(?:ance|ancing)\b/i.test(allText)) {
    return { type: 'client', confidence: 0.7, signal: 'refinancing' };
  }

  return { type: 'unknown', confidence: 0, signal: null };
}

/**
 * Extract company from signature block
 * Uses shared extractor module
 */
function extractCompany(signatureBlock) {
  return extractor.extractCompany(signatureBlock);
}

/**
 * Extract title from signature block
 * Uses shared extractor module
 */
function extractTitle(signatureBlock) {
  return extractor.extractTitle(signatureBlock);
}

/**
 * Enrich a single contact by scanning their emails
 * UPDATED: Uses shared extractor module with base64 decoding and improved garbage filtering
 */
async function enrichContact(email, validationResult, mboxPaths = MBOX_PATHS) {
  const enriched = {
    email: email.toLowerCase(),
    firstName: null,
    lastName: null,
    phones: [],
    nmls: null,
    dre: null,
    company: null,
    title: null,
    classification: { type: 'unknown', confidence: 0, signal: null },

    // From validation
    hasExchange: validationResult?.hasExchange || false,
    davidSent: validationResult?.davidSent || 0,
    davidReceived: validationResult?.davidReceived || 0,
    totalEmails: validationResult?.totalEmails || 0,
    firstContact: validationResult?.firstContact,
    lastContact: validationResult?.lastContact,
    subjects: validationResult?.subjects || [],
    altEmails: validationResult?.altEmails || [],

    // Enrichment source tracking
    enrichedFrom: []
  };

  // Use name from validation if available
  if (validationResult?.name) {
    const parts = validationResult.name.split(/\s+/);
    if (parts.length >= 2) {
      enriched.firstName = parts[0];
      enriched.lastName = parts.slice(1).join(' ');
    }
  }

  // Scan mbox files for this contact's emails
  let emailsProcessed = 0;

  for (const mboxPath of mboxPaths) {
    if (!fs.existsSync(mboxPath)) continue;

    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = {
      from: '',
      body: [],
      textPlainBody: [],
      base64Buffer: [],
      inHeaders: false,
      inBody: false,
      isRelevant: false,
      currentMimeType: null,
      textPlainIsBase64: false
    };

    for await (const line of rl) {
      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Process previous email if relevant
        if (currentEmail.isRelevant && (currentEmail.body.length > 0 || currentEmail.textPlainBody.length > 0)) {
          // Decode any remaining base64 buffer before processing
          if (currentEmail.base64Buffer.length > 0) {
            const decoded = extractor.decodeBase64(currentEmail.base64Buffer.join(''));
            if (decoded) {
              currentEmail.textPlainBody.push(...decoded.split('\n'));
            }
          }
          processEmailForEnrichment(currentEmail, enriched);
          emailsProcessed++;

          // Stop after processing 20 emails (enough for enrichment)
          if (emailsProcessed >= 20) break;
        }

        currentEmail = {
          from: '',
          body: [],
          textPlainBody: [],
          base64Buffer: [],
          inHeaders: true,
          inBody: false,
          isRelevant: false,
          currentMimeType: null,
          textPlainIsBase64: false
        };
        continue;
      }

      // Check From header
      if (currentEmail.inHeaders && line.toLowerCase().startsWith('from:')) {
        currentEmail.from = line.substring(5).trim();
        if (currentEmail.from.toLowerCase().includes(email.toLowerCase())) {
          currentEmail.isRelevant = true;
        }
      }

      // End of headers
      if (line === '' && currentEmail.inHeaders) {
        currentEmail.inHeaders = false;
        currentEmail.inBody = true;
        continue;
      }

      // Capture body with base64 handling (matching extractor.js pattern)
      if (currentEmail.inBody) {
        // Track MIME content type
        if (line.toLowerCase().startsWith('content-type:')) {
          currentEmail.currentMimeType = line.toLowerCase();
          currentEmail.textPlainIsBase64 = false;
        }

        // Detect base64 encoding
        if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
          if (currentEmail.currentMimeType?.includes('text/plain')) {
            currentEmail.textPlainIsBase64 = true;
          }
        }

        // Capture text/plain content
        if (currentEmail.currentMimeType?.includes('text/plain')) {
          if (!line.startsWith('Content-') && !line.startsWith('--') && line.trim()) {
            if (currentEmail.textPlainIsBase64) {
              if (extractor.isBase64Line(line)) {
                currentEmail.base64Buffer.push(line.trim());
              }
            } else {
              currentEmail.textPlainBody.push(line);
            }
          }
        }

        // MIME boundary - decode base64, reset state
        if (line.startsWith('--') && line.length > 20) {
          if (currentEmail.base64Buffer.length > 0) {
            const decoded = extractor.decodeBase64(currentEmail.base64Buffer.join(''));
            if (decoded) {
              currentEmail.textPlainBody.push(...decoded.split('\n'));
            }
            currentEmail.base64Buffer = [];
          }
          currentEmail.currentMimeType = null;
          currentEmail.textPlainIsBase64 = false;
        }

        // Keep full body as fallback (limit for performance)
        if (currentEmail.body.length < 200) {
          currentEmail.body.push(line);
        }
      }
    }

    // Process last email
    if (currentEmail.isRelevant && (currentEmail.body.length > 0 || currentEmail.textPlainBody.length > 0)) {
      // Decode any remaining base64 buffer
      if (currentEmail.base64Buffer.length > 0) {
        const decoded = extractor.decodeBase64(currentEmail.base64Buffer.join(''));
        if (decoded) {
          currentEmail.textPlainBody.push(...decoded.split('\n'));
        }
      }
      processEmailForEnrichment(currentEmail, enriched);
    }

    if (emailsProcessed >= 20) break;
  }

  // Final classification (combine all sources)
  // UPDATED: Check title FIRST, then NMLS/DRE

  // Try title-based classification first (handles Finance/HR/Ops with NMLS)
  if (enriched.title) {
    const titleClassification = classifyByTitle([enriched.title]);
    if (titleClassification) {
      // Non-LO roles override NMLS
      if (NON_LO_OVERRIDE_ROLES.includes(titleClassification.type)) {
        enriched.classification = titleClassification;
        enriched.needsReview = enriched.nmls ? true : false; // Flag if has NMLS but non-LO title
        return enriched;
      }
      // Mortgage-specific roles (processor, underwriter) also override generic NMLS
      if (['processor', 'underwriter', 'closer', 'manager'].includes(titleClassification.type)) {
        enriched.classification = titleClassification;
        return enriched;
      }
      // loan_officer from title is more specific than just NMLS
      if (titleClassification.type === 'loan_officer') {
        enriched.classification = titleClassification;
        return enriched;
      }
    }
  }

  // Fall back to NMLS/DRE if no title match
  if (enriched.nmls) {
    enriched.classification = { type: 'loan_officer', confidence: 0.85, signal: 'NMLS' };
    // Flag for review if high email volume (likely internal staff, not just a contact)
    if (enriched.davidReceived > 10) {
      enriched.needsReview = true;
    }
  } else if (enriched.dre) {
    enriched.classification = { type: 'realtor', confidence: 1.0, signal: 'DRE#' };
  }

  return enriched;
}

/**
 * Process a single email to extract enrichment data
 * UPDATED: Uses textPlainBody (decoded base64) when available, and shared extractor for signature detection
 */
function processEmailForEnrichment(email, enriched) {
  // Prefer decoded text/plain body, fall back to raw body
  const bodyLines = email.textPlainBody?.length > 5
    ? email.textPlainBody
    : email.body;
  const bodyText = bodyLines.join('\n');

  // Use shared extractor for proper signature detection (handles garbage filtering)
  const signatureBlock = extractor.getSignatureBlock(bodyText);

  // Extract name from From header if not already set
  if (!enriched.firstName) {
    const name = extractName(email.from);
    if (name.firstName) {
      enriched.firstName = name.firstName;
      enriched.lastName = name.lastName;
      enriched.enrichedFrom.push('from_header');
    }
  }

  // Extract phones from signature using shared extractor
  // NOTE: We extract phones from ALL contacts including clients
  // The exchange validator ensures we only have contacts who actually
  // sent emails (davidReceived > 0), so these are real contacts
  const phones = extractor.extractPhones(signatureBlock);
  for (const phone of phones) {
    if (!enriched.phones.includes(phone)) {
      enriched.phones.push(phone);
      enriched.enrichedFrom.push('signature_phone');
    }
  }

  // Extract NMLS from full body (don't classify yet - final classification happens after all data extracted)
  if (!enriched.nmls) {
    const nmls = extractor.extractNMLS(bodyText);
    if (nmls) {
      enriched.nmls = nmls;
      // NOTE: Classification moved to final step so title can override
      enriched.enrichedFrom.push('nmls');
    }
  }

  // Extract DRE from full body
  if (!enriched.dre) {
    const dre = extractor.extractDRE(bodyText);
    if (dre) {
      enriched.dre = dre;
      // NOTE: Classification moved to final step
      enriched.enrichedFrom.push('dre');
    }
  }

  // Extract company from signature
  if (!enriched.company) {
    const company = extractor.extractCompany(signatureBlock);
    if (company) {
      enriched.company = company;
      enriched.enrichedFrom.push('company');
    }
  }

  // Extract title from signature
  if (!enriched.title) {
    const title = extractor.extractTitle(signatureBlock);
    if (title) {
      enriched.title = title;
      enriched.enrichedFrom.push('title');
    }
  }

  // Update classification if still unknown
  if (enriched.classification.type === 'unknown') {
    const classification = classifyContact(bodyText, enriched.subjects);
    if (classification.confidence > enriched.classification.confidence) {
      enriched.classification = classification;
    }
  }
}

/**
 * Enrich all confirmed contacts with optional Supabase logging
 */
async function enrichAllContacts(validationResults, options = {}) {
  const enriched = [];
  const confirmed = validationResults.confirmed || [];
  const { workflowId = null, logToSupabase = false } = options;

  console.log(`Enriching ${confirmed.length} confirmed contacts...`);
  if (logToSupabase) {
    console.log('  Logging results to Supabase...');
  }
  console.log('');

  let processed = 0;
  for (const contact of confirmed) {
    const result = await enrichContact(contact.email, contact);
    enriched.push(result);
    processed++;

    // Log to Supabase if enabled
    if (logToSupabase) {
      try {
        await supabase.logExtraction(workflowId, result.email, {
          phones: result.phones,
          nmls: result.nmls,
          dre: result.dre,
          company: result.company,
          title: result.title,
          signatureSample: result.enrichedFrom.join(', ')
        });
      } catch (e) {
        // Silently continue - don't let logging failures break enrichment
      }
    }

    if (processed % 50 === 0) {
      console.log(`  Processed: ${processed}/${confirmed.length}`);
    }
  }

  return enriched;
}

/**
 * Main execution
 */
async function main() {
  const validationPath = path.join(__dirname, '../data/exchange-validation.json');
  const outputPath = path.join(__dirname, '../data/enriched-contacts.json');

  console.log('='.repeat(60));
  console.log('  AGENT 2: CONTACT ENRICHER');
  console.log('='.repeat(60));
  console.log('');

  // Check for validation results
  if (!fs.existsSync(validationPath)) {
    console.log('ERROR: Exchange validation results not found at:', validationPath);
    console.log('Run exchange-validator.js first.');
    return null;
  }

  console.log('Loading validation results...');
  const validation = JSON.parse(fs.readFileSync(validationPath));
  console.log('Found', validation.confirmed?.length || 0, 'confirmed contacts');
  console.log('');

  // Enrich contacts
  const enriched = await enrichAllContacts(validation);

  // Statistics
  const stats = {
    total: enriched.length,
    withName: enriched.filter(c => c.firstName).length,
    withPhone: enriched.filter(c => c.phones.length > 0).length,
    withNMLS: enriched.filter(c => c.nmls).length,
    withDRE: enriched.filter(c => c.dre).length,
    byType: {}
  };

  // Count by type
  for (const c of enriched) {
    const type = c.classification.type;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  ENRICHMENT RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Total enriched:', stats.total);
  console.log('');
  console.log('Extraction Success:');
  console.log('  With Name:', stats.withName, `(${Math.round(stats.withName/stats.total*100)}%)`);
  console.log('  With Phone:', stats.withPhone, `(${Math.round(stats.withPhone/stats.total*100)}%)`);
  console.log('  With NMLS (Loan Officer):', stats.withNMLS);
  console.log('  With DRE (Realtor):', stats.withDRE);
  console.log('');
  console.log('Classification:');
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Save results
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log('');
  console.log('Results saved to:', outputPath);

  return enriched;
}

// Export for use by orchestrator
module.exports = {
  enrichContact,
  enrichAllContacts,
  extractPhones,
  extractNMLS,
  extractDRE,
  extractName,
  extractTitle,
  extractCompany,
  classifyContact,
  classifyByTitle,
  TITLE_ROLE_MAP,
  NON_LO_OVERRIDE_ROLES,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
