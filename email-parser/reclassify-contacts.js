/**
 * Reclassify Contacts Script
 *
 * Re-applies the new title-based classification logic to all existing contacts
 * in the enrichment cache. Flags uncertain contacts for manual review.
 *
 * Run after updating contact-enricher.js with new classification logic.
 */

const fs = require('fs');
const path = require('path');

// Import classification functions from contact-enricher
const {
  classifyByTitle,
  TITLE_ROLE_MAP,
  NON_LO_OVERRIDE_ROLES
} = require('./agents/contact-enricher');

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const CACHE_PATH = path.join(DATA_DIR, 'enrichment-cache.json');
const REVIEW_PATH = path.join(DATA_DIR, 'needs-review.json');

/**
 * Reclassify a single contact using the new title-based logic
 */
function reclassifyContact(contact) {
  const result = {
    email: contact.email,
    originalType: contact.classification?.type || contact.signatureQuality || 'unknown',
    newType: null,
    signal: null,
    confidence: 0,
    needsReview: false,
    reviewReason: null,
    titles: contact.titles || [],
    nmls: contact.nmls,
    emailsProcessed: contact.emailsProcessed || 0
  };

  // Get all titles (may be array from enrichment-cache or single string)
  const titles = Array.isArray(contact.titles) ? contact.titles : (contact.title ? [contact.title] : []);

  // Try title-based classification first
  if (titles.length > 0) {
    const titleClassification = classifyByTitle(titles);
    if (titleClassification) {
      result.newType = titleClassification.type;
      result.signal = titleClassification.signal;
      result.confidence = titleClassification.confidence;

      // Flag for review if has NMLS but classified as non-LO
      if (contact.nmls && NON_LO_OVERRIDE_ROLES.includes(titleClassification.type)) {
        result.needsReview = true;
        result.reviewReason = `Has NMLS ${contact.nmls} but title suggests ${titleClassification.type}`;
      }

      return result;
    }
  }

  // No title match - fall back to NMLS/DRE
  if (contact.nmls) {
    result.newType = 'loan_officer';
    result.signal = 'NMLS';
    result.confidence = 0.85;

    // Flag for review if high email volume but no title (likely internal staff)
    if (contact.emailsProcessed > 10 && titles.length === 0) {
      result.needsReview = true;
      result.reviewReason = `High email volume (${contact.emailsProcessed}) with NMLS but no extracted title`;
    }
  } else if (contact.dre) {
    result.newType = 'realtor';
    result.signal = 'DRE#';
    result.confidence = 1.0;
  } else {
    // No definitive signals - keep as unknown or use existing
    result.newType = result.originalType === 'unknown' ? 'unknown' : result.originalType;
    result.confidence = 0;

    // Flag high-volume contacts with no classification
    if (contact.emailsProcessed > 20 && result.newType === 'unknown') {
      result.needsReview = true;
      result.reviewReason = `High email volume (${contact.emailsProcessed}) but no classification signals`;
    }
  }

  return result;
}

/**
 * Main reclassification process
 */
async function main() {
  console.log('='.repeat(60));
  console.log('  CONTACT RECLASSIFICATION');
  console.log('='.repeat(60));
  console.log();

  // Load enrichment cache
  if (!fs.existsSync(CACHE_PATH)) {
    console.log('ERROR: Enrichment cache not found at:', CACHE_PATH);
    console.log('Run batch-extract.js first.');
    return;
  }

  console.log('Loading enrichment cache...');
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH));
  const contacts = Object.values(cache);
  console.log(`Found ${contacts.length} contacts to reclassify`);
  console.log();

  // Reclassify each contact
  const results = {
    total: contacts.length,
    changed: 0,
    needsReview: [],
    byType: {},
    changes: []
  };

  for (const contact of contacts) {
    const reclassified = reclassifyContact(contact);

    // Track type distribution
    results.byType[reclassified.newType] = (results.byType[reclassified.newType] || 0) + 1;

    // Track changes
    if (reclassified.newType !== reclassified.originalType) {
      results.changed++;
      results.changes.push({
        email: contact.email,
        from: reclassified.originalType,
        to: reclassified.newType,
        signal: reclassified.signal,
        titles: reclassified.titles
      });
    }

    // Track needs review
    if (reclassified.needsReview) {
      results.needsReview.push({
        email: contact.email,
        currentType: reclassified.newType,
        reason: reclassified.reviewReason,
        titles: reclassified.titles,
        nmls: reclassified.nmls,
        emailsProcessed: reclassified.emailsProcessed,
        sampleSignatures: contact.sampleSignatures?.slice(0, 2) || []
      });
    }

    // Update the cache entry
    cache[contact.email].classification = {
      type: reclassified.newType,
      confidence: reclassified.confidence,
      signal: reclassified.signal
    };
    cache[contact.email].needsReview = reclassified.needsReview;
  }

  // Save updated cache
  console.log('Saving updated enrichment cache...');
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  // Save needs-review list
  console.log('Saving needs-review list...');
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(results.needsReview, null, 2));

  // Print summary
  console.log();
  console.log('='.repeat(60));
  console.log('  RECLASSIFICATION RESULTS');
  console.log('='.repeat(60));
  console.log();
  console.log(`Total contacts: ${results.total}`);
  console.log(`Classifications changed: ${results.changed}`);
  console.log(`Needs manual review: ${results.needsReview.length}`);
  console.log();

  console.log('Type Distribution:');
  const sortedTypes = Object.entries(results.byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = ((count / results.total) * 100).toFixed(1);
    console.log(`  ${type.padEnd(15)} ${count.toString().padStart(4)} (${pct}%)`);
  }

  console.log();
  console.log('Notable Changes:');
  const notableChanges = results.changes.filter(c =>
    NON_LO_OVERRIDE_ROLES.includes(c.to) && c.from === 'loan_officer'
  );
  for (const change of notableChanges.slice(0, 10)) {
    console.log(`  ${change.email}`);
    console.log(`    ${change.from} -> ${change.to} (${change.signal})`);
    if (change.titles.length > 0) {
      console.log(`    Titles: ${change.titles.join(', ')}`);
    }
  }
  if (notableChanges.length > 10) {
    console.log(`  ... and ${notableChanges.length - 10} more`);
  }

  console.log();
  console.log('Files saved:');
  console.log(`  ${CACHE_PATH}`);
  console.log(`  ${REVIEW_PATH}`);
  console.log();
  console.log(`Next: Review ${results.needsReview.length} contacts at http://localhost:3847/`);
}

main().catch(console.error);
