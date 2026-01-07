/**
 * AUTO-CLASSIFIER: 100% Accuracy Rules
 *
 * This module contains definitive classification rules that should
 * result in 100% confidence auto-tagging without human review.
 *
 * Signals checked (in priority order):
 * 0. Personal email domain → client (100%) - CHECKED FIRST!
 * 1. Job title keywords → type (100%)
 * 2. Company name keywords → type (100%)
 * 3. NMLS number → loan_officer (100%)
 * 4. DRE number → realtor (100%)
 * 5. Known domain mapping → type (100%)
 * 6. Domain patterns → type (95%)
 */

// ============================================================
// PERSONAL EMAIL DOMAINS (100% = Client/Borrower)
// These are NEVER business contacts - always clients
// ============================================================
const PERSONAL_DOMAINS = [
  // Major free email providers
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'mail.com', 'email.com',
  'zoho.com', 'zohomail.com',
  'yandex.com', 'yandex.ru',
  'gmx.com', 'gmx.net',
  'fastmail.com', 'fastmail.fm',
  'tutanota.com', 'tutamail.com',
  'inbox.com', 'hushmail.com',
  // ISP-based personal emails
  'att.net', 'sbcglobal.net', 'bellsouth.net',
  'verizon.net', 'comcast.net', 'cox.net', 'charter.net',
  'earthlink.net', 'juno.com', 'netzero.com',
  'roadrunner.com', 'optonline.net', 'frontier.com',
  // Regional/country-specific
  'btinternet.com', 'virginmedia.com', 'sky.com',
  'web.de', 't-online.de', 'orange.fr', 'free.fr'
];

// ============================================================
// DEFINITIVE TITLE KEYWORDS (100% confidence)
// ============================================================
const TITLE_KEYWORDS = {
  loan_officer: [
    'loan officer', 'mortgage loan originator', 'mlo', 'loan consultant',
    'loan advisor', 'mortgage consultant', 'mortgage banker', 'loan originator',
    'senior loan officer', 'sr. loan officer', 'home loan specialist',
    'mortgage specialist', 'lending officer'
  ],
  realtor: [
    'realtor', 'real estate agent', 'broker associate', 'real estate broker',
    'listing agent', 'buyer\'s agent', 'real estate professional',
    'real estate salesperson', 'licensed realtor'
  ],
  title_escrow: [
    'escrow officer', 'title officer', 'settlement agent', 'escrow assistant',
    'escrow coordinator', 'title rep', 'title representative', 'closer',
    'escrow closer', 'title closer', 'settlement coordinator',
    'sr. escrow officer', 'senior escrow officer'
  ],
  processor: [
    'loan processor', 'processor', 'processing manager', 'sr processor',
    'senior processor', 'jr processor', 'loan processing'
  ],
  underwriter: [
    'underwriter', 'underwriting manager', 'sr underwriter', 'senior underwriter',
    'mortgage underwriter', 'loan underwriter'
  ],
  attorney: [
    'attorney', 'lawyer', 'counsel', 'legal counsel', 'paralegal',
    'closing attorney', 'real estate attorney'
  ],
  insurance: [
    'insurance agent', 'insurance broker', 'insurance specialist',
    'homeowner insurance', 'hazard insurance'
  ],
  appraiser: [
    'appraiser', 'appraisal', 'real estate appraiser', 'certified appraiser'
  ],
  finance: [
    'controller', 'cfo', 'accountant', 'accounting manager', 'bookkeeper',
    'finance manager', 'comptroller', 'treasurer', 'finance director'
  ],
  hr: [
    'human resources', 'hr manager', 'hr director', 'recruiter',
    'talent acquisition', 'people operations'
  ],
  compliance: [
    'compliance officer', 'compliance manager', 'risk manager',
    'quality control', 'qc manager'
  ]
};

// ============================================================
// DEFINITIVE COMPANY NAME KEYWORDS (100% confidence)
// ============================================================
const COMPANY_KEYWORDS = {
  title_escrow: [
    'title company', 'title insurance', 'escrow company', 'escrow services',
    'settlement services', 'title services', 'title agency',
    'fidelity national', 'first american title', 'old republic title',
    'chicago title', 'stewart title', 'commonwealth land title',
    'north american title', 'ticor title', 'lawyers title'
  ],
  loan_officer: [
    'mortgage', 'mortg', 'mtg', 'home loans', 'home lending',
    'lending', 'loan company', 'loan services'
  ],
  realtor: [
    'realty', 'real estate', 'realtors', 'properties', 'keller williams',
    'coldwell banker', 'century 21', 're/max', 'berkshire hathaway',
    'compass real', 'sotheby\'s'
  ],
  insurance: [
    'insurance company', 'insurance agency', 'insurance services',
    'insurance group'
  ]
};

// ============================================================
// KNOWN COMPANY DOMAINS (100% confidence)
// ============================================================
const KNOWN_DOMAINS = {
  // Title/Escrow companies
  title_escrow: [
    'fnf.com', 'fntg.com', 'firstam.com', 'oldrepublictitle.com',
    'stewart.com', 'chicagotitle.com', 'ticortitle.com', 'ltic.com',
    'northamericantitle.com', 'wfgtitle.com', 'titleresources.com'
  ],
  // Major lenders (loan officers)
  loan_officer: [
    'wellsfargo.com', 'chase.com', 'bankofamerica.com', 'usbank.com',
    'rfrocketmortgage.com', 'quickenloans.com', 'uwm.com', 'pnc.com',
    'flagstar.com', 'pennymac.com', 'loanDepot.com', 'caliberhomeloans.com',
    'freedommortgage.com', 'newrez.com', 'mrcooper.com'
  ],
  // Real estate brokerages
  realtor: [
    'kw.com', 'kwrealty.com', 'coldwellbanker.com', 'century21.com',
    'remax.com', 'compass.com', 'bhhs.com', 'sothebysrealty.com',
    'realogy.com', 'exp.com', 'exprealty.com'
  ]
};

// ============================================================
// DOMAIN PATTERNS (95% confidence)
// ============================================================
const DOMAIN_PATTERNS = {
  title_escrow: /title|escrow|settlement/i,
  loan_officer: /mortgage|mtg|lending|loan|homeloan/i,
  realtor: /realty|realtor|realtors|realestate|properties|homes|brokerage/i,
  insurance: /insurance|ins\b/i
};

// Non-LO roles that should OVERRIDE NMLS detection
const NON_LO_TITLE_TYPES = ['finance', 'hr', 'compliance', 'admin', 'marketing', 'it'];

/**
 * Auto-classify a contact based on definitive signals
 * Returns classification with 100% confidence if definitive match found
 *
 * PRIORITY ORDER:
 * 1. Job Title (highest priority - Finance/HR override NMLS)
 * 2. Company Name keywords
 * 3. DRE Number → Realtor
 * 4. NMLS Number → Loan Officer (only if no non-LO title)
 * 5. Known domains
 * 6. Domain patterns
 *
 * @param {object} contact - Contact data with email, title, company, nmls, dre
 * @returns {object} { type, confidence, signal, autoTagged }
 */
function autoClassify(contact) {
  const { email, title, titles, company, companies, nmls, dre } = contact;

  // Get all titles (support both single and array)
  const allTitles = [];
  if (title) allTitles.push(title);
  if (titles && Array.isArray(titles)) allTitles.push(...titles);
  const titleText = allTitles.join(' ').toLowerCase();

  // Get all companies (support both single and array)
  const allCompanies = [];
  if (company) allCompanies.push(company);
  if (companies && Array.isArray(companies)) allCompanies.push(...companies);
  const companyText = allCompanies.join(' ').toLowerCase();

  // Extract domain from email
  const domain = (email || '').split('@')[1]?.toLowerCase() || '';

  // ========================================
  // CHECK 0: Personal Email Domain + Exchange Data
  // Personal emails are clients ONLY IF they actually sent emails (davidReceived > 0)
  // If no exchange data provided, we can't determine if it's a real contact
  // ========================================
  if (domain && PERSONAL_DOMAINS.includes(domain)) {
    // Check if exchange data is provided
    const davidReceived = contact.davidReceived || contact.exchangeData?.davidReceived || 0;

    if (davidReceived > 0) {
      // They sent emails - real client
      return {
        type: 'client',
        confidence: 1.0,
        signal: `Personal email + ${davidReceived} emails sent`,
        autoTagged: true,
        isClient: true
      };
    } else {
      // Personal email but no exchange data or never sent
      // Don't auto-tag - needs exchange validation first
      return {
        type: 'unknown',
        confidence: 0.5,
        signal: `Personal email: ${domain} (needs exchange validation)`,
        autoTagged: false,
        isPersonalEmail: true
      };
    }
  }

  // ========================================
  // CHECK 1: Job Title Keywords (HIGHEST PRIORITY)
  // Finance/HR/Compliance staff should NOT be tagged as loan_officer
  // even if they have NMLS
  // ========================================
  if (titleText) {
    for (const [type, keywords] of Object.entries(TITLE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (titleText.includes(keyword.toLowerCase())) {
          return {
            type,
            confidence: 1.0,
            signal: `Title: "${keyword}"`,
            autoTagged: true
          };
        }
      }
    }
  }

  // ========================================
  // CHECK 2: Company Name Keywords (100%)
  // ========================================
  if (companyText) {
    for (const [type, keywords] of Object.entries(COMPANY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (companyText.includes(keyword.toLowerCase())) {
          return {
            type,
            confidence: 1.0,
            signal: `Company: "${keyword}"`,
            autoTagged: true
          };
        }
      }
    }
  }

  // ========================================
  // CHECK 3: NMLS Number → Loan Officer (100%)
  // NMLS takes priority over DRE because many CA mortgage
  // professionals have both licenses, but NMLS indicates
  // they primarily work in lending
  // ========================================
  if (nmls) {
    return {
      type: 'loan_officer',
      confidence: 1.0,
      signal: `NMLS: ${nmls}`,
      autoTagged: true
    };
  }

  // ========================================
  // CHECK 4: DRE Number → Realtor (100%)
  // Only if no NMLS (otherwise they'd be loan_officer above)
  // ========================================
  if (dre) {
    return {
      type: 'realtor',
      confidence: 1.0,
      signal: `DRE: ${dre}`,
      autoTagged: true
    };
  }

  // ========================================
  // CHECK 5: Known Company Domains (100%)
  // ========================================
  if (domain) {
    for (const [type, domains] of Object.entries(KNOWN_DOMAINS)) {
      if (domains.some(d => domain.includes(d) || domain.endsWith(d))) {
        return {
          type,
          confidence: 1.0,
          signal: `Known domain: ${domain}`,
          autoTagged: true
        };
      }
    }
  }

  // ========================================
  // CHECK 6: Domain Patterns (95%)
  // ========================================
  if (domain) {
    for (const [type, pattern] of Object.entries(DOMAIN_PATTERNS)) {
      if (pattern.test(domain)) {
        return {
          type,
          confidence: 0.95,
          signal: `Domain pattern: ${domain}`,
          autoTagged: true
        };
      }
    }
  }

  // No definitive signal found
  return null;
}

/**
 * Check if a contact should skip human review (auto-taggable)
 */
function shouldAutoTag(contact) {
  const result = autoClassify(contact);
  return result && result.confidence >= 0.95;
}

/**
 * Check if an email is from a personal domain (client/borrower)
 * Use this to skip phone extraction for clients
 */
function isPersonalEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase() || '';
  return PERSONAL_DOMAINS.includes(domain);
}

/**
 * Check if a contact is a client (personal email or classified as client)
 */
function isClient(contact) {
  if (isPersonalEmail(contact.email)) return true;
  const result = autoClassify(contact);
  return result && result.type === 'client';
}

module.exports = {
  autoClassify,
  shouldAutoTag,
  isPersonalEmail,
  isClient,
  TITLE_KEYWORDS,
  COMPANY_KEYWORDS,
  KNOWN_DOMAINS,
  DOMAIN_PATTERNS,
  PERSONAL_DOMAINS
};
