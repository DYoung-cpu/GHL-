/**
 * Agent 4: Final Validator
 *
 * Purpose: Quality checks on all enriched contacts before export
 *
 * Validates:
 *   - Required fields present (email, has exchange)
 *   - Phone number format
 *   - Name looks like a person (not company)
 *   - Classification confidence threshold
 *   - No spam/system email addresses
 *
 * Categorizes:
 *   - CONFIRMED: Passed all checks, ready for GHL
 *   - UNASSIGNED: Missing required data or low confidence
 *   - SPAM: Detected as marketing/system email
 */

const fs = require('fs');
const path = require('path');

// Spam/system email patterns
const SPAM_PATTERNS = {
  prefixes: [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'mailer', 'bounce', 'postmaster', 'admin', 'support',
    'info', 'sales', 'contact', 'hello', 'team', 'newsletter',
    'notifications', 'alerts', 'updates', 'news', 'marketing',
    'promo', 'billing', 'accounts', 'help', 'service', 'leads',
    'media', 'press', 'hr', 'careers', 'jobs', 'legal',
    'feedback', 'inquiries', 'general', 'office', 'orders',
    '1800', '800', '888', '877'
  ],
  domains: [
    'mailchimp', 'sendgrid', 'constantcontact', 'hubspot',
    'salesforce', 'mailgun', 'sparkpost', 'mandrill',
    'amazonses', 'postmark', 'sendinblue', 'mailjet'
  ]
};

// Company name patterns (not a person)
const COMPANY_PATTERNS = /\b(inc|llc|corp|ltd|company|group|bank|lending|mortgage|loans|funding|capital|financial|insurance|realty|properties|services|solutions|network|systems|media|studio|tech|labs|holdings|enterprises|associates|partners|consulting|agency|foundation|academy|institute|university|college)\b/i;

/**
 * Check if email is a spam/system address
 */
function isSpamEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  const [prefix, domain] = lower.split('@');

  // Check prefix patterns
  for (const pattern of SPAM_PATTERNS.prefixes) {
    if (prefix.startsWith(pattern) || prefix === pattern) {
      return { isSpam: true, reason: `prefix: ${pattern}` };
    }
  }

  // Check domain patterns
  for (const pattern of SPAM_PATTERNS.domains) {
    if (domain?.includes(pattern)) {
      return { isSpam: true, reason: `domain: ${pattern}` };
    }
  }

  // Check for numeric prefix (1800, etc.)
  if (/^\d{3,4}/.test(prefix)) {
    return { isSpam: true, reason: 'numeric prefix' };
  }

  return { isSpam: false };
}

/**
 * Check if name looks like a company (not a person)
 */
function isCompanyName(name) {
  if (!name) return false;

  // Check for company patterns
  if (COMPANY_PATTERNS.test(name)) {
    return true;
  }

  // No space = probably not a full name
  if (!name.includes(' ') && name.length > 15) {
    return true;
  }

  return false;
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  if (!phone) return false;

  // Extract digits
  const digits = phone.replace(/\D/g, '');

  // Must be 10 digits (US)
  if (digits.length !== 10) return false;

  // Area code can't start with 0 or 1
  if (digits[0] === '0' || digits[0] === '1') return false;

  // Can't be all same digit
  if (/^(\d)\1{9}$/.test(digits)) return false;

  return true;
}

/**
 * Validate a single contact
 */
function validateContact(contact) {
  const issues = [];
  let status = 'confirmed'; // Start optimistic

  // Required: email
  if (!contact.email) {
    issues.push('Missing email');
    status = 'unassigned';
  }

  // Check for spam email
  const spamCheck = isSpamEmail(contact.email);
  if (spamCheck.isSpam) {
    issues.push(`Spam email: ${spamCheck.reason}`);
    status = 'spam';
  }

  // Required: email exchange
  if (!contact.hasExchange) {
    issues.push('No email exchange with David');
    if (status !== 'spam') status = 'unassigned';
  }

  // Check name
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  if (!fullName) {
    issues.push('Missing name');
  } else if (isCompanyName(fullName)) {
    issues.push('Name looks like company');
    if (status !== 'spam') status = 'unassigned';
  }

  // Check phone (warning, not blocking)
  if (contact.phones?.length > 0) {
    const hasValidPhone = contact.phones.some(p => isValidPhone(p));
    if (!hasValidPhone) {
      issues.push('Phone format invalid');
    }
  } else {
    issues.push('No phone number');
  }

  // Classification confidence
  if (contact.classification?.type === 'unknown') {
    issues.push('Unknown contact type');
  } else if (contact.classification?.confidence < 0.5) {
    issues.push('Low classification confidence');
  }

  return {
    email: contact.email,
    status: status,
    issues: issues,
    passedChecks: issues.length === 0,
    contact: contact
  };
}

/**
 * Validate all contacts and categorize
 */
function validateAllContacts(enrichedContacts) {
  const results = {
    confirmed: [],    // Ready for GHL
    unassigned: [],   // Needs review or missing data
    spam: [],         // Marketing/system emails

    stats: {
      total: enrichedContacts.length,
      confirmed: 0,
      unassigned: 0,
      spam: 0,
      issueBreakdown: {}
    }
  };

  for (const contact of enrichedContacts) {
    const validation = validateContact(contact);

    // Track issues
    for (const issue of validation.issues) {
      results.stats.issueBreakdown[issue] = (results.stats.issueBreakdown[issue] || 0) + 1;
    }

    // Categorize
    switch (validation.status) {
      case 'confirmed':
        results.confirmed.push(validation);
        results.stats.confirmed++;
        break;
      case 'unassigned':
        results.unassigned.push(validation);
        results.stats.unassigned++;
        break;
      case 'spam':
        results.spam.push(validation);
        results.stats.spam++;
        break;
    }
  }

  // Sort confirmed by classification confidence
  results.confirmed.sort((a, b) =>
    (b.contact.classification?.confidence || 0) - (a.contact.classification?.confidence || 0)
  );

  return results;
}

/**
 * Generate final export data
 */
function generateExport(validationResults) {
  const exportData = {
    confirmed: validationResults.confirmed.map(v => ({
      email: v.contact.email,
      firstName: v.contact.firstName,
      lastName: v.contact.lastName,
      phone: v.contact.phones?.[0] || '',
      altPhones: v.contact.phones?.slice(1) || [],
      company: v.contact.company,
      nmls: v.contact.nmls,
      dre: v.contact.dre,
      type: v.contact.classification?.type,
      confidence: v.contact.classification?.confidence,
      davidSent: v.contact.davidSent,
      davidReceived: v.contact.davidReceived,
      firstContact: v.contact.firstContact,
      lastContact: v.contact.lastContact,
      subjects: v.contact.subjects?.slice(0, 5) // First 5 subjects
    })),

    unassigned: validationResults.unassigned.map(v => ({
      email: v.contact.email,
      name: [v.contact.firstName, v.contact.lastName].filter(Boolean).join(' '),
      issues: v.issues,
      davidSent: v.contact.davidSent,
      davidReceived: v.contact.davidReceived
    })),

    spam: validationResults.spam.map(v => ({
      email: v.contact.email,
      reason: v.issues[0]
    })),

    summary: validationResults.stats
  };

  return exportData;
}

/**
 * Main execution
 */
async function main() {
  const enrichedPath = path.join(__dirname, '../data/enriched-contacts.json');
  const validationPath = path.join(__dirname, '../data/final-validation.json');
  const exportPath = path.join(__dirname, '../data/export-ready.json');

  console.log('='.repeat(60));
  console.log('  AGENT 4: FINAL VALIDATOR');
  console.log('='.repeat(60));
  console.log('');

  // Load enriched contacts
  if (!fs.existsSync(enrichedPath)) {
    console.log('ERROR: Enriched contacts not found at:', enrichedPath);
    console.log('Run contact-enricher.js first.');
    return null;
  }

  console.log('Loading enriched contacts...');
  const enriched = JSON.parse(fs.readFileSync(enrichedPath));
  console.log('Loaded', enriched.length, 'contacts');
  console.log('');

  // Validate
  console.log('Running validation checks...');
  const results = validateAllContacts(enriched);

  console.log('');
  console.log('='.repeat(60));
  console.log('  VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Total contacts:', results.stats.total);
  console.log('');
  console.log('Categories:');
  console.log('  CONFIRMED (ready for GHL):', results.stats.confirmed);
  console.log('  UNASSIGNED (needs review):', results.stats.unassigned);
  console.log('  SPAM (auto-removed):', results.stats.spam);
  console.log('');

  console.log('Issue Breakdown:');
  const sortedIssues = Object.entries(results.stats.issueBreakdown)
    .sort((a, b) => b[1] - a[1]);
  for (const [issue, count] of sortedIssues) {
    console.log(`  ${issue}: ${count}`);
  }

  // Generate export
  const exportData = generateExport(results);

  // Save results
  fs.writeFileSync(validationPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

  console.log('');
  console.log('Validation saved to:', validationPath);
  console.log('Export data saved to:', exportPath);

  // Show sample confirmed contacts
  console.log('');
  console.log('Sample Confirmed Contacts:');
  exportData.confirmed.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} <${c.email}>`);
    console.log(`      Type: ${c.type}, Phone: ${c.phone || 'N/A'}`);
  });

  return results;
}

// Export for orchestrator
module.exports = {
  validateContact,
  validateAllContacts,
  generateExport,
  isSpamEmail,
  isCompanyName,
  isValidPhone,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
