/**
 * Event-Emitting Orchestrator
 *
 * Modified orchestrator that emits events for UI updates
 * and pauses to ask questions when confidence is below 80%.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import contact enricher for actual data extraction
const {
  enrichContact,
  classifyByTitle,
  TITLE_ROLE_MAP,
  NON_LO_OVERRIDE_ROLES
} = require('./agents/contact-enricher');

// NEW: Auto-classifier for 100% confidence auto-tagging
const { autoClassify, shouldAutoTag } = require('./auto-classifier');

// Import learning module for feedback loop
let learning = null;
try {
  learning = require('./utils/learning');
} catch (e) {
  console.log('Learning module not available');
}

// Import targeted extraction function for live extraction
const { extractSignatureForEmail } = require('./utils/extractor');

// Data paths
const DATA_DIR = path.join(__dirname, 'data');
const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge/knowledge-base.json');
const ENRICHMENT_CACHE_PATH = path.join(DATA_DIR, 'enrichment-cache.json');
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

/**
 * Load enrichment cache (pre-extracted email data)
 */
function loadEnrichmentCache() {
  try {
    if (fs.existsSync(ENRICHMENT_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(ENRICHMENT_CACHE_PATH));
    }
  } catch (e) {
    console.error('Failed to load enrichment cache:', e.message);
  }
  return {};
}

/**
 * Save enrichment cache to disk
 */
function saveEnrichmentCache(cache) {
  try {
    fs.writeFileSync(ENRICHMENT_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('Failed to save enrichment cache:', e.message);
  }
}

const CONFIDENCE_THRESHOLD = 0.8; // Ask user if below this

// Customer service email patterns to filter out (no real person)
const CS_EMAIL_PATTERNS = /^(customerservice|customer-service|support|noreply|no-reply|info|news|team|marketing|notifications|alerts|admin|webmaster|postmaster|mailer-daemon|reply|do-not-reply|donotreply|efolder|feedback|hello|contact|sales|billing|help|service|enquiries|inquiries)@/i;

// Mortgage domain patterns -> auto-classify as loan_officer
const MTG_DOMAIN_PATTERNS = /(mortgage|mtg|lending|lend|homeloan|homeloans|loan(?!mart)|loans)(?!depot)/i;

function isCustomerServiceEmail(email) {
  return CS_EMAIL_PATTERNS.test(email);
}

function isMortgageDomain(email) {
  const domain = email.split('@')[1] || '';
  return MTG_DOMAIN_PATTERNS.test(domain);
}

// David Young's emails
const DAVID_EMAILS = [
  'david@lendwisemtg.com',
  'davidyoung@priorityfinancial.net',
  'dyoung@onenationhomeloans.com',
  'david@priorityfinancial.net',
  'davidyoung@onenationhomeloans.com'
].map(e => e.toLowerCase());

function isDavidEmail(email) {
  return DAVID_EMAILS.includes(email?.toLowerCase());
}

/**
 * Load knowledge base
 */
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH));
    }
  } catch (e) {}
  return { patterns: {}, corrections: [], stats: {} };
}

/**
 * Save to knowledge base
 */
function saveToKnowledgeBase(type, patterns) {
  const kb = loadKnowledgeBase();
  if (!kb.patterns[type]) {
    kb.patterns[type] = { openers: [], subjects: [], signatures: [] };
  }

  for (const category of ['openers', 'subjects', 'signatures']) {
    for (const pattern of patterns[category] || []) {
      if (!kb.patterns[type][category].includes(pattern)) {
        kb.patterns[type][category].push(pattern);
      }
    }
  }

  kb.stats.totalTrainingSamples = (kb.stats.totalTrainingSamples || 0) + 1;
  kb.stats.byType = kb.stats.byType || {};
  kb.stats.byType[type] = (kb.stats.byType[type] || 0) + 1;
  kb.updatedAt = new Date().toISOString();

  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(kb, null, 2));
}

/**
 * Classify contact using knowledge base + definitive signals
 */
function classifyContact(contact, emailBody = '') {
  const allText = (emailBody + ' ' + (contact.subjects || []).join(' ')).toLowerCase();

  // Definitive signals (100% accuracy)
  if (/nmls\s*[#:]?\s*\d+/i.test(allText)) {
    return { type: 'loan_officer', confidence: 1.0, signal: 'NMLS' };
  }

  if (/(?:dre|calbre)\s*[#:]/i.test(allText)) {
    return { type: 'realtor', confidence: 1.0, signal: 'DRE#' };
  }

  const clientDocs = ['rate lock', 'loan estimate', 'closing disclosure', 'documentation request', 'pre-approval'];
  for (const doc of clientDocs) {
    if (allText.includes(doc)) {
      return { type: 'client', confidence: 1.0, signal: doc };
    }
  }

  if (/escrow\s*(?:officer|number)/i.test(allText)) {
    return { type: 'title_escrow', confidence: 1.0, signal: 'escrow' };
  }

  // High-confidence patterns
  if (/\bi have a client\b/i.test(allText) || /\breferring\b/i.test(allText)) {
    return { type: 'loan_officer', confidence: 0.85, signal: 'referring' };
  }

  if (/\blisting\b/i.test(allText) || /\bshowing\b/i.test(allText)) {
    return { type: 'realtor', confidence: 0.75, signal: 'listing' };
  }

  if (/\bpurchas(?:e|ing)\b/i.test(allText) || /\bbuying\s+(?:a\s+)?home\b/i.test(allText)) {
    return { type: 'client', confidence: 0.75, signal: 'purchasing' };
  }

  if (/\brefin(?:ance|ancing)\b/i.test(allText)) {
    return { type: 'client', confidence: 0.75, signal: 'refinancing' };
  }

  // Check knowledge base patterns
  const kb = loadKnowledgeBase();
  for (const [type, patterns] of Object.entries(kb.patterns || {})) {
    for (const subject of patterns.subjects || []) {
      if (allText.includes(subject.toLowerCase())) {
        return { type, confidence: 0.7, signal: `learned: ${subject}` };
      }
    }
  }

  return { type: 'unknown', confidence: 0, signal: null };
}

/**
 * Extract patterns from email for learning
 */
function extractPatterns(email) {
  const patterns = { openers: [], subjects: [], signatures: [] };

  if (email.subject) {
    patterns.subjects.push(email.subject);
  }

  return patterns;
}

/**
 * Main orchestration with events
 */
async function run(options = {}) {
  console.log('[ORCH] run() called with options:', Object.keys(options));
  const { io, askQuestion } = options;

  const emit = (event, data) => {
    console.log('[ORCH] emit:', event);
    if (io) io.emit(event, data);
    if (global.agentEvents) global.agentEvents.emit(event, data);
  };

  const state = {
    status: 'running',
    startedAt: new Date().toISOString(),
    stats: { total: 0, exchange: 0, enriched: 0, confirmed: 0 }
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });

  emit('status', { status: 'running', message: 'Starting email parser...' });

  try {
    // ========== STEP 1: Load or use existing index ==========
    emit('agent_start', { agent: 'index' });

    const indexPath = path.join(DATA_DIR, 'email-index.json');
    let index;

    if (fs.existsSync(indexPath)) {
      emit('progress', { agent: 'index', message: 'Loading existing email index...' });
      index = JSON.parse(fs.readFileSync(indexPath));
      state.stats.total = Object.keys(index).length;
    } else {
      emit('progress', { agent: 'index', message: 'Index not found. Run index-builder.js first.' });
      emit('error', { message: 'Email index not found' });
      return;
    }

    emit('agent_complete', {
      agent: 'index',
      message: `${state.stats.total} contacts indexed`,
      stats: { total: state.stats.total }
    });

    // ========== STEP 2: Exchange Validation ==========
    emit('agent_start', { agent: 'exchange' });
    emit('progress', { agent: 'exchange', message: 'Validating email exchanges...' });

    const confirmed = [];
    const contacts = Object.values(index);
    let processed = 0;

    for (const contact of contacts) {
      // Skip customer service emails (no real person)
      if (isCustomerServiceEmail(contact.email)) {
        processed++;
        continue;
      }

      const hasExchange = contact.davidSent > 0 && contact.davidReceived > 0;

      if (hasExchange) {
        confirmed.push(contact);
        state.stats.exchange++;
      }

      processed++;
      if (processed % 500 === 0) {
        emit('progress', {
          agent: 'exchange',
          message: `Validated ${processed}/${contacts.length} contacts`
        });
      }
    }

    emit('agent_complete', {
      agent: 'exchange',
      message: `${state.stats.exchange} contacts with email exchange`,
      stats: { exchange: state.stats.exchange }
    });

    // ========== STEP 3: Enrichment with Questions ==========
    emit('agent_start', { agent: 'enricher' });
    emit('progress', { agent: 'enricher', message: 'Loading enrichment cache...' });

    // Load pre-extracted data from batch-extract.js
    const enrichmentCache = loadEnrichmentCache();
    const cacheSize = Object.keys(enrichmentCache).length;
    emit('progress', { agent: 'enricher', message: `Loaded ${cacheSize} cached contacts. Enriching...` });

    const enriched = [];
    processed = 0;

    for (const contact of confirmed) {
      // Look up pre-extracted data from enrichment cache
      // Check primary email AND alternate emails
      const cacheKey = contact.email.toLowerCase();
      let cachedData = enrichmentCache[cacheKey];

      // If no data for primary email, check alternates
      if (!cachedData?.phones?.length && !cachedData?.companies?.length && contact.altEmails) {
        for (const altEmail of contact.altEmails) {
          const altCached = enrichmentCache[altEmail.toLowerCase()];
          if (altCached && (altCached.phones?.length || altCached.companies?.length || altCached.nmls)) {
            cachedData = altCached;
            break;
          }
        }
      }

      // LIVE EXTRACTION: If cache has no useful data, extract from mbox
      // This uses targeted extraction that only scans emails FROM this contact
      const needsLiveExtraction = !cachedData ||
        (!cachedData.phones?.length && !cachedData.nmls && !cachedData.titles?.length && !cachedData.companies?.length);

      if (needsLiveExtraction) {
        try {
          emit('progress', { agent: 'enricher', message: `Live extracting: ${contact.email}` });
          const liveData = await extractSignatureForEmail(contact.email, MBOX_PATHS, { limit: 5 });
          if (liveData) {
            // Merge live data into cache
            cachedData = {
              ...cachedData,
              phones: liveData.phones || [],
              nmls: liveData.nmls,
              dre: liveData.dre,
              companies: liveData.company ? [liveData.company] : [],
              titles: liveData.title ? [liveData.title] : [],
              signatureQuality: liveData.signatureQuality,
              sampleSignatures: liveData.signatureSample ? [liveData.signatureSample] : []
            };
            // Save to cache for future runs
            enrichmentCache[contact.email] = cachedData;
            saveEnrichmentCache(enrichmentCache);
            emit('progress', { agent: 'enricher', message: `Extracted: ${contact.email} - ${liveData.signatureQuality}` });
          }
        } catch (e) {
          emit('progress', { agent: 'enricher', message: `Live extraction failed: ${contact.email}` });
        }
      }

      // Convert cache format to enriched data format
      let enrichedData = null;
      if (cachedData) {
        // Filter out garbage data (base64, email headers, encoded strings)
        const isValidText = (text) => {
          if (!text) return false;
          if (text.length < 3 || text.length > 80) return false;

          // Reject base64 patterns
          if (/[+\/=]{2,}/.test(text)) return false;
          if (/^[A-Za-z0-9+\/=]+$/.test(text) && text.length > 15) return false;

          // Reject email headers
          if (/^(Content-Type|MIME-Version|charset|boundary|Message-ID|Date:|From:|To:|Subject:|X-)/i.test(text)) return false;
          if (/text\/html|text\/plain|multipart|application\//i.test(text)) return false;

          // Reject PDF/binary markers
          if (/^(%PDF|obj|endobj|stream|xref|trailer|startxref)/i.test(text)) return false;
          if (/[^\x20-\x7E]/.test(text)) return false;  // Non-printable chars

          // Must have spaces (real company/title names have spaces)
          if (!/\s/.test(text) && text.length > 15) return false;

          // Must have vowels (readable English)
          if (!/[aeiouAEIOU]/.test(text)) return false;

          // Reject repeated patterns (like KKKK, oooo)
          if (/(.)\1{3,}/.test(text)) return false;

          return true;
        };

        const validPhones = (cachedData.phones || []).filter(p => /^\d{10}$/.test(p) && !/^0{10}$/.test(p));
        const validCompany = cachedData.companies?.find(c => isValidText(c)) || null;
        const validTitle = cachedData.titles?.find(t => isValidText(t)) || null;

        enrichedData = {
          phones: validPhones,
          nmls: cachedData.nmls,
          dre: cachedData.dre,
          company: validCompany,
          title: validTitle
        };
      }

      // ========================================
      // NEW AUTO-CLASSIFICATION SYSTEM
      // Uses definitive signals for 100% confidence auto-tagging
      // ========================================

      // Build contact data object for auto-classifier
      const contactData = {
        email: contact.email,
        title: enrichedData?.title || cachedData?.titles?.[0],
        titles: enrichedData?.titles || cachedData?.titles || [],
        company: enrichedData?.company || cachedData?.companies?.[0],
        companies: enrichedData?.companies || cachedData?.companies || [],
        nmls: enrichedData?.nmls || cachedData?.nmls,
        dre: enrichedData?.dre || cachedData?.dre
      };

      // Try auto-classification first (100% confidence for definitive signals)
      let classification = autoClassify(contactData);

      // If no auto-classification, fall back to old logic
      if (!classification) {
        // Get titles array from enrichment cache
        const titles = enrichedData?.titles || (enrichedData?.title ? [enrichedData.title] : []);

        // Try title-based classification
        if (titles.length > 0) {
          const titleClassification = classifyByTitle(titles);
          if (titleClassification) {
            classification = titleClassification;
          }
        }

        // Still no classification? Check domain patterns
        if (!classification || classification.type === 'unknown') {
          if (isMortgageDomain(contact.email)) {
            classification = { type: 'loan_officer', confidence: 0.85, signal: 'mortgage_domain' };
          } else {
            // Fall back to basic classification from subjects
            classification = { type: 'unknown', confidence: 0, signal: 'no_definitive_signal' };
          }
        }
      }

      const enrichedContact = {
        email: contact.email,
        name: enrichedData?.firstName && enrichedData?.lastName
          ? `${enrichedData.firstName} ${enrichedData.lastName}`
          : contact.name,
        firstName: enrichedData?.firstName || (contact.name ? contact.name.split(' ')[0] : null),
        lastName: enrichedData?.lastName || (contact.name ? contact.name.split(' ').slice(1).join(' ') : null),
        phone: enrichedData?.phones?.[0] || contact.phones?.[0] || null,
        phones: enrichedData?.phones || contact.phones || [],
        company: enrichedData?.company || contact.company || null,
        title: enrichedData?.title || contact.title || null,
        nmls: enrichedData?.nmls || contact.nmls || null,
        dre: enrichedData?.dre || contact.dre || null,
        davidSent: contact.davidSent,
        davidReceived: contact.davidReceived,
        firstContact: contact.firstContact,
        lastContact: contact.lastContact,
        subjects: contact.subjects || [],
        hasAttachments: contact.hasAttachments,
        altEmails: enrichedData?.altEmails || contact.altEmails || [],
        classification: classification
      };

      // Emit current email being processed
      emit('email', {
        email: contact.email,
        name: contact.name,
        subject: contact.subjects?.[0] || 'No subject',
        preview: `Exchange: David sent ${contact.davidSent}, received ${contact.davidReceived}`
      });

      // Skip already-processed contacts (user already answered)
      if (contact._processed) {
        enrichedContact.classification = contact.classification || classification;
        enrichedContact.tags = contact.tags || [];
        enriched.push(enrichedContact);
        state.stats.enriched++;
        processed++;
        continue;
      }

      // If confidence is below threshold, ask user
      if (classification.confidence < CONFIDENCE_THRESHOLD && askQuestion) {
        emit('progress', {
          agent: 'enricher',
          message: `Low confidence (${Math.round(classification.confidence * 100)}%) for ${contact.email}`
        });

        const answer = await askQuestion({
          text: `What type of contact is "${contact.name || contact.email}"?`,
          contact: enrichedContact,
          agent: 'enricher',
          options: [
            { value: 'client', label: 'Client (Borrower)' },
            { value: 'loan_officer', label: 'Loan Officer' },
            { value: 'realtor', label: 'Realtor' },
            { value: 'title_escrow', label: 'Title/Escrow' },
            { value: 'attorney', label: 'Attorney' },
            { value: 'family_friends', label: 'Family & Friends' },
            { value: 'insurance', label: 'Insurance' },
            { value: 'accountant', label: 'Accountant' },
            { value: 'coworker', label: 'Coworker (Staff)' },
            { value: 'skip', label: 'Skip / Unknown' }
          ]
        });

        // Handle new multi-tag format OR legacy single string
        if (answer) {
          if (typeof answer === 'object' && answer.action === 'delete') {
            // DELETE action - remove from index and skip
            const emailToDelete = answer.deleteEmail || contact.email;

            // Remove from index file
            const indexPath = path.join(DATA_DIR, 'email-index.json');
            const currentIndex = JSON.parse(fs.readFileSync(indexPath));
            delete currentIndex[emailToDelete];
            fs.writeFileSync(indexPath, JSON.stringify(currentIndex, null, 2));

            emit('progress', {
              agent: 'enricher',
              message: `DELETED: ${contact.name || emailToDelete} - removed from index`
            });

            // Skip to next contact
            processed++;
            continue;
          } else if (typeof answer === 'object' && answer.tags) {
            // New format: { tags: [], edits: {}, notes: '' }
            const { tags, edits, notes } = answer;

            // Skip if no tags selected or only 'skip' selected
            if (tags.length === 0 || (tags.length === 1 && tags[0] === 'skip')) {
              emit('progress', {
                agent: 'enricher',
                message: `Skipped: ${contact.email}`
              });
            } else {
              // Apply edited fields
              if (edits) {
                if (edits.email) enrichedContact.email = edits.email;
                if (edits.name) {
                  enrichedContact.name = edits.name;
                  enrichedContact.firstName = edits.name.split(' ')[0];
                  enrichedContact.lastName = edits.name.split(' ').slice(1).join(' ');
                }
                if (edits.phone) enrichedContact.phone = edits.phone;
                if (edits.company) enrichedContact.company = edits.company;
                if (edits.title) enrichedContact.title = edits.title;
              }

              // Store tags array and notes
              enrichedContact.tags = tags.filter(t => t !== 'skip');
              enrichedContact.notes = notes || '';

              // Set classification to primary tag (first selected) for backwards compatibility
              enrichedContact.classification = {
                type: enrichedContact.tags[0],
                confidence: 1.0,
                signal: 'user_input',
                allTags: enrichedContact.tags
              };

              // Learn from each tag
              const patterns = extractPatterns(contact);
              for (const tag of enrichedContact.tags) {
                saveToKnowledgeBase(tag, patterns);
              }

              // LEARN FROM CORRECTIONS: Extract patterns from user edits
              if (learning && edits) {
                const originalExtraction = enrichmentCache[contact.email.toLowerCase()];
                const learnResult = learning.learnFromCorrection(contact, edits, originalExtraction);
                if (learnResult.learned) {
                  emit('progress', {
                    agent: 'learning',
                    message: `Learned patterns: ${learnResult.patterns.join(', ')}`
                  });
                }
              }

              // SAVE edits back to email-index.json so contact doesn't reappear
              const indexPath = path.join(DATA_DIR, 'email-index.json');
              const currentIndex = JSON.parse(fs.readFileSync(indexPath));
              currentIndex[contact.email] = {
                ...currentIndex[contact.email],
                name: enrichedContact.name,
                phone: enrichedContact.phone,
                company: enrichedContact.company,
                title: enrichedContact.title,
                tags: enrichedContact.tags,
                notes: enrichedContact.notes,
                classification: enrichedContact.classification,
                _processed: true  // Mark as processed so we skip on restart
              };
              fs.writeFileSync(indexPath, JSON.stringify(currentIndex, null, 2));

              // ALSO save to enrichment-cache.json so data persists
              const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
              const currentCache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath)) : {};
              const cacheKey = contact.email.toLowerCase();
              currentCache[cacheKey] = {
                ...currentCache[cacheKey],
                name: enrichedContact.name,
                firstName: enrichedContact.firstName,
                lastName: enrichedContact.lastName,
                phones: enrichedContact.phone ? [enrichedContact.phone] : (currentCache[cacheKey]?.phones || []),
                companies: enrichedContact.company ? [enrichedContact.company] : (currentCache[cacheKey]?.companies || []),
                titles: enrichedContact.title ? [enrichedContact.title] : (currentCache[cacheKey]?.titles || []),
                classification: enrichedContact.classification,
                tags: enrichedContact.tags,
                notes: enrichedContact.notes,
                manuallyEdited: true,
                editedAt: new Date().toISOString()
              };
              fs.writeFileSync(cachePath, JSON.stringify(currentCache, null, 2));

              emit('progress', {
                agent: 'enricher',
                message: `Saved: ${enrichedContact.email} as [${enrichedContact.tags.join(', ')}]`
              });
            }
          } else if (typeof answer === 'string' && answer !== 'skip') {
            // Legacy single string format
            enrichedContact.classification = {
              type: answer,
              confidence: 1.0,
              signal: 'user_input'
            };
            enrichedContact.tags = [answer];

            // Learn from this correction
            const patterns = extractPatterns(contact);
            saveToKnowledgeBase(answer, patterns);

            // Also learn field-level patterns for future extraction
            if (learning) {
              const originalExtraction = enrichmentCache[contact.email.toLowerCase()];
              learning.learnFromCorrection(contact, {}, originalExtraction);
            }

            // SAVE to email-index.json
            const indexPath = path.join(DATA_DIR, 'email-index.json');
            const currentIndex = JSON.parse(fs.readFileSync(indexPath));
            currentIndex[contact.email] = {
              ...currentIndex[contact.email],
              tags: [answer],
              classification: enrichedContact.classification,
              _processed: true
            };
            fs.writeFileSync(indexPath, JSON.stringify(currentIndex, null, 2));

            // ALSO save to enrichment-cache.json
            const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
            const currentCache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath)) : {};
            const cacheKey = contact.email.toLowerCase();
            currentCache[cacheKey] = {
              ...currentCache[cacheKey],
              classification: enrichedContact.classification,
              tags: [answer],
              manuallyEdited: true,
              editedAt: new Date().toISOString()
            };
            fs.writeFileSync(cachePath, JSON.stringify(currentCache, null, 2));

            emit('progress', {
              agent: 'enricher',
              message: `Saved: ${contact.email} as ${answer}`
            });
          }
        }
      }

      enriched.push(enrichedContact);
      state.stats.enriched++;

      // Emit classification
      emit('classification', {
        email: enrichedContact.email,
        name: enrichedContact.name,
        type: enrichedContact.classification.type,
        confidence: enrichedContact.classification.confidence
      });

      processed++;
      if (processed % 50 === 0) {
        emit('progress', {
          agent: 'enricher',
          message: `Enriched ${processed}/${confirmed.length} contacts`
        });
      }
    }

    // Save enriched contacts
    fs.writeFileSync(
      path.join(DATA_DIR, 'enriched-contacts.json'),
      JSON.stringify(enriched, null, 2)
    );

    // ========================================
    // EXTRACTION VERIFICATION
    // Track contacts with missing data for debugging
    // ========================================
    const unprocessed = enriched.filter(c => {
      const data = enrichmentCache[c.email.toLowerCase()];
      return !data || (!data.phones?.length && !data.nmls && !data.titles?.length && !data.companies?.length);
    });

    const domainOnlyClassified = enriched.filter(c =>
      c.classification?.signal?.includes('domain') ||
      c.classification?.signal?.includes('Domain')
    );

    // Save processing log for debugging
    const processingLog = {
      lastRun: new Date().toISOString(),
      stats: {
        totalConfirmed: confirmed.length,
        enrichedWithData: enriched.length - unprocessed.length,
        enrichedByDomainOnly: domainOnlyClassified.length,
        missingEnrichment: unprocessed.length,
        cacheSize: Object.keys(enrichmentCache).length
      },
      missingData: unprocessed.slice(0, 50).map(c => ({
        email: c.email,
        name: c.name,
        classification: c.classification?.type,
        confidence: c.classification?.confidence,
        signal: c.classification?.signal
      }))
    };
    fs.writeFileSync(
      path.join(DATA_DIR, 'processing-log.json'),
      JSON.stringify(processingLog, null, 2)
    );

    if (unprocessed.length > 0) {
      emit('progress', {
        agent: 'enricher',
        message: `⚠️ ${unprocessed.length} contacts have no extracted data (classified by domain/rules only)`
      });
    }

    emit('agent_complete', {
      agent: 'enricher',
      message: `${state.stats.enriched} contacts enriched (${unprocessed.length} without signature data)`,
      stats: { enriched: state.stats.enriched, missingData: unprocessed.length }
    });

    // ========== STEP 4: Final Validation ==========
    emit('agent_start', { agent: 'validator' });
    emit('progress', { agent: 'validator', message: 'Running final validation...' });

    const results = {
      confirmed: [],
      unassigned: [],
      spam: []
    };

    for (const contact of enriched) {
      // Check for spam
      const emailPrefix = contact.email.split('@')[0].toLowerCase();
      const isSpam = /^(noreply|no-reply|info|news|team|marketing|1800|800|888)/.test(emailPrefix);

      if (isSpam) {
        results.spam.push(contact);
      } else if (contact.classification.type !== 'unknown' && contact.classification.confidence >= 0.5) {
        results.confirmed.push(contact);
        state.stats.confirmed++;
      } else {
        results.unassigned.push(contact);
      }
    }

    // Save final results
    fs.writeFileSync(
      path.join(DATA_DIR, 'final-validation.json'),
      JSON.stringify(results, null, 2)
    );

    // Generate export
    const exportData = {
      confirmed: results.confirmed.map(c => ({
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone || '',
        company: c.company || '',
        title: c.title || '',
        type: c.classification.type,
        tags: c.tags || [c.classification.type],
        notes: c.notes || '',
        confidence: c.classification.confidence,
        davidSent: c.davidSent,
        davidReceived: c.davidReceived,
        firstContact: c.firstContact,
        lastContact: c.lastContact
      })),
      unassigned: results.unassigned.map(c => ({
        email: c.email,
        name: c.name,
        phone: c.phone || '',
        company: c.company || '',
        title: c.title || '',
        tags: c.tags || [],
        notes: c.notes || '',
        davidSent: c.davidSent,
        davidReceived: c.davidReceived
      })),
      spam: results.spam.map(c => ({ email: c.email })),
      summary: {
        total: enriched.length,
        confirmed: results.confirmed.length,
        unassigned: results.unassigned.length,
        spam: results.spam.length
      }
    };

    fs.writeFileSync(
      path.join(DATA_DIR, 'export-ready.json'),
      JSON.stringify(exportData, null, 2)
    );

    emit('agent_complete', {
      agent: 'validator',
      message: `${state.stats.confirmed} confirmed, ${results.unassigned.length} unassigned, ${results.spam.length} spam`,
      stats: { confirmed: state.stats.confirmed }
    });

    // ========== COMPLETE ==========
    state.status = 'complete';
    state.completedAt = new Date().toISOString();

    fs.writeFileSync(
      path.join(DATA_DIR, 'workflow-state.json'),
      JSON.stringify(state, null, 2)
    );

    emit('status', {
      status: 'complete',
      message: `Complete! ${state.stats.confirmed} contacts ready for GHL.`
    });

    return state;

  } catch (error) {
    emit('error', { message: error.message });
    emit('status', { status: 'failed', message: error.message });
    throw error;
  }
}

module.exports = { run };

// Auto-run if executed directly
if (require.main === module) {
  run().catch(err => {
    console.error('Orchestrator failed:', err);
    process.exit(1);
  });
}
