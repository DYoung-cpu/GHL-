/**
 * Agent 1: Exchange Validator
 *
 * Purpose: Determine if a contact has a REAL email exchange with David Young
 * A contact is "confirmed" only if there's bi-directional communication:
 *   - Contact sent email TO David AND David responded, OR
 *   - David sent email TO contact AND contact responded
 *
 * Input: Email address + email index
 * Output: Exchange validation result with metrics
 */

const fs = require('fs');
const path = require('path');

// David Young's email addresses
const DAVID_EMAILS = [
  'david@lendwisemtg.com',
  'davidyoung@priorityfinancial.net',
  'dyoung@onenationhomeloans.com',
  'david@priorityfinancial.net',
  'davidyoung@onenationhomeloans.com'
].map(e => e.toLowerCase());

/**
 * Check if email is David Young
 */
function isDavidEmail(email) {
  return DAVID_EMAILS.includes(email?.toLowerCase());
}

/**
 * Validate email exchange for a single contact
 *
 * @param {string} email - Contact email address
 * @param {object} index - Email index from index-builder
 * @returns {object} Exchange validation result
 */
function validateExchange(email, index) {
  const contact = index[email.toLowerCase()];

  if (!contact) {
    return {
      email: email,
      found: false,
      hasExchange: false,
      error: 'Contact not found in email index'
    };
  }

  // Has exchange = both directions have at least 1 email
  const hasExchange = contact.davidSent > 0 && contact.davidReceived > 0;

  // Calculate exchange score (higher = more valuable contact)
  const exchangeScore = Math.min(contact.davidSent, contact.davidReceived);

  return {
    email: contact.email,
    found: true,
    hasExchange: hasExchange,

    // Direction metrics
    davidSent: contact.davidSent,        // Emails David sent TO this contact
    davidReceived: contact.davidReceived, // Emails David received FROM this contact
    totalEmails: contact.totalEmails,

    // Exchange quality
    exchangeScore: exchangeScore,
    exchangeRatio: contact.davidReceived > 0
      ? (contact.davidSent / contact.davidReceived).toFixed(2)
      : 'N/A',

    // Timeline
    firstContact: contact.firstContact,
    lastContact: contact.lastContact,

    // Content hints
    name: contact.name,
    subjects: contact.subjects || [],
    hasAttachments: contact.hasAttachments,
    altEmails: contact.altEmails || [],

    // Classification hints
    classification: classifyFromSubjects(contact.subjects || [])
  };
}

/**
 * Classify contact type from subject lines (definitive signals only)
 */
function classifyFromSubjects(subjects) {
  const allSubjects = subjects.join(' ').toLowerCase();

  // Definitive CLIENT signals (loan documents)
  const clientSignals = [
    'rate lock', 'loan estimate', 'closing disclosure',
    'documentation request', 'pre-approval', 'pre-qual',
    'docs needed', 'conditions', 'appraisal'
  ];

  for (const signal of clientSignals) {
    if (allSubjects.includes(signal)) {
      return { type: 'client', confidence: 1.0, signal: signal };
    }
  }

  // Look for purchase/refinance keywords
  if (allSubjects.includes('purchase') || allSubjects.includes('buying')) {
    return { type: 'client', confidence: 0.8, signal: 'purchase' };
  }
  if (allSubjects.includes('refinance') || allSubjects.includes('refi')) {
    return { type: 'client', confidence: 0.8, signal: 'refinance' };
  }

  // Referral patterns suggest loan officer
  if (allSubjects.includes('referral') || allSubjects.includes('referring')) {
    return { type: 'loan_officer', confidence: 0.7, signal: 'referral' };
  }

  // Listing/property patterns suggest realtor
  if (allSubjects.includes('listing') || allSubjects.includes('mls') || allSubjects.includes('showing')) {
    return { type: 'realtor', confidence: 0.7, signal: 'listing' };
  }

  return { type: 'unknown', confidence: 0, signal: null };
}

/**
 * Validate all contacts in the index
 *
 * @param {object} index - Email index from index-builder
 * @returns {object} Categorized results
 */
function validateAllContacts(index) {
  const results = {
    confirmed: [],      // Has exchange (both directions)
    davidSentOnly: [],  // David sent but no response
    davidReceivedOnly: [], // Contact sent but David didn't respond
    noExchange: [],     // Neither direction
    stats: {
      total: 0,
      confirmed: 0,
      davidSentOnly: 0,
      davidReceivedOnly: 0,
      noExchange: 0
    }
  };

  const emails = Object.keys(index);
  results.stats.total = emails.length;

  for (const email of emails) {
    const validation = validateExchange(email, index);

    if (validation.hasExchange) {
      results.confirmed.push(validation);
      results.stats.confirmed++;
    } else if (validation.davidSent > 0) {
      results.davidSentOnly.push(validation);
      results.stats.davidSentOnly++;
    } else if (validation.davidReceived > 0) {
      results.davidReceivedOnly.push(validation);
      results.stats.davidReceivedOnly++;
    } else {
      results.noExchange.push(validation);
      results.stats.noExchange++;
    }
  }

  // Sort confirmed by exchange score (most valuable first)
  results.confirmed.sort((a, b) => b.exchangeScore - a.exchangeScore);

  return results;
}

/**
 * Run exchange validation on email index file
 */
async function main() {
  const indexPath = path.join(__dirname, '../data/email-index.json');
  const outputPath = path.join(__dirname, '../data/exchange-validation.json');

  console.log('='.repeat(60));
  console.log('  AGENT 1: EXCHANGE VALIDATOR');
  console.log('='.repeat(60));
  console.log('');

  // Check if index exists
  if (!fs.existsSync(indexPath)) {
    console.log('ERROR: Email index not found at:', indexPath);
    console.log('Run index-builder.js first to create the index.');
    return null;
  }

  console.log('Loading email index...');
  const index = JSON.parse(fs.readFileSync(indexPath));
  console.log('Loaded', Object.keys(index).length, 'contacts');
  console.log('');

  console.log('Validating exchanges...');
  const results = validateAllContacts(index);

  console.log('');
  console.log('='.repeat(60));
  console.log('  VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Total contacts:', results.stats.total);
  console.log('');
  console.log('Exchange Status:');
  console.log('  Confirmed (bi-directional):', results.stats.confirmed);
  console.log('  David sent only (no reply):', results.stats.davidSentOnly);
  console.log('  Contact sent only (no response):', results.stats.davidReceivedOnly);
  console.log('  No exchange at all:', results.stats.noExchange);
  console.log('');

  // Top confirmed contacts
  console.log('Top 20 Confirmed Contacts (by exchange volume):');
  results.confirmed.slice(0, 20).forEach((c, i) => {
    const name = c.name || c.email;
    console.log(`  ${i + 1}. ${name}`);
    console.log(`      Email: ${c.email}`);
    console.log(`      Exchange: David sent ${c.davidSent}, received ${c.davidReceived}`);
    if (c.classification.type !== 'unknown') {
      console.log(`      Likely: ${c.classification.type} (${c.classification.signal})`);
    }
  });

  // Save results
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log('');
  console.log('Results saved to:', outputPath);

  return results;
}

// Export for use by orchestrator
module.exports = {
  validateExchange,
  validateAllContacts,
  isDavidEmail,
  DAVID_EMAILS,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
