/**
 * Re-classify all contacts using the new auto-classifier
 * This applies 100% confidence auto-tagging based on definitive signals
 */

const fs = require('fs');
const path = require('path');
const { autoClassify } = require('./auto-classifier');

const DATA_DIR = path.join(__dirname, 'data');
const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
const indexPath = path.join(DATA_DIR, 'email-index.json');

// Load cache and index (for exchange data)
const cache = JSON.parse(fs.readFileSync(cachePath));
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath)) : {};

// Stats
let autoTagged = 0;
let unchanged = 0;
let upgraded = 0;
const byType = {};

console.log('=== RE-CLASSIFYING WITH AUTO-CLASSIFIER ===\n');

for (const [email, contact] of Object.entries(cache)) {
  // Get exchange data from index (for personal email client detection)
  const exchangeData = index[email] || {};

  // Build contact data for classifier
  const contactData = {
    email,
    title: contact.titles?.[0],
    titles: contact.titles || [],
    company: contact.companies?.[0],
    companies: contact.companies || [],
    nmls: contact.nmls,
    dre: contact.dre,
    // Exchange data for personal email classification
    davidReceived: exchangeData.davidReceived || 0,
    davidSent: exchangeData.davidSent || 0
  };

  // Get auto-classification
  const result = autoClassify(contactData);

  if (result) {
    const oldType = contact.classification?.type;
    const oldConf = contact.classification?.confidence || 0;

    // Only update if confidence improved or type changed
    if (result.confidence > oldConf || oldType !== result.type) {
      contact.classification = result;
      upgraded++;

      // Track types
      byType[result.type] = (byType[result.type] || 0) + 1;
    } else {
      unchanged++;
    }

    if (result.autoTagged) {
      autoTagged++;
    }
  } else {
    unchanged++;
  }
}

// Save updated cache
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

console.log('=== RESULTS ===');
console.log(`Total contacts: ${Object.keys(cache).length}`);
console.log(`Auto-tagged (100%): ${autoTagged}`);
console.log(`Upgraded classifications: ${upgraded}`);
console.log(`Unchanged: ${unchanged}`);

console.log('\n=== BY TYPE ===');
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Show some examples of auto-tagged contacts
console.log('\n=== SAMPLE AUTO-TAGGED ===');
let shown = 0;
for (const [email, contact] of Object.entries(cache)) {
  if (contact.classification?.autoTagged && shown < 10) {
    console.log(`  ${email}`);
    console.log(`    -> ${contact.classification.type} (${contact.classification.signal})`);
    shown++;
  }
}
