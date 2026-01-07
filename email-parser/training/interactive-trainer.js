/**
 * Interactive Training Mode
 *
 * Terminal-based training interface for building the knowledge base.
 * Shows email samples, asks for classification, learns patterns.
 *
 * Features:
 *   - Present email samples for classification
 *   - Extract patterns from user confirmations
 *   - Save learned patterns to knowledge base
 *   - User corrections improve future accuracy
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Data paths
const DATA_DIR = path.join(__dirname, '../data');
const KNOWLEDGE_PATH = path.join(__dirname, '../knowledge/knowledge-base.json');

// Classification types
const TYPES = {
  '1': 'client',
  '2': 'loan_officer',
  '3': 'realtor',
  '4': 'title_escrow',
  '5': 'attorney',
  '6': 'family_friends',
  '7': 'insurance',
  '8': 'accountant',
  '9': 'unknown',
  's': 'skip',
  'q': 'quit'
};

// Initialize knowledge base structure
function initKnowledgeBase() {
  return {
    patterns: {
      client: { openers: [], subjects: [], signatures: [], documents: [] },
      loan_officer: { openers: [], subjects: [], signatures: [], documents: [] },
      realtor: { openers: [], subjects: [], signatures: [], documents: [] },
      title_escrow: { openers: [], subjects: [], signatures: [], documents: [] },
      attorney: { openers: [], subjects: [], signatures: [], documents: [] },
      family_friends: { openers: [], subjects: [], signatures: [], documents: [] },
      insurance: { openers: [], subjects: [], signatures: [], documents: [] },
      accountant: { openers: [], subjects: [], signatures: [], documents: [] }
    },
    corrections: [],
    stats: {
      totalTrainingSamples: 0,
      byType: {}
    },
    updatedAt: new Date().toISOString()
  };
}

/**
 * Load or initialize knowledge base
 */
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH));
    }
  } catch (e) {
    console.log('Creating new knowledge base...');
  }

  const kb = initKnowledgeBase();
  saveKnowledgeBase(kb);
  return kb;
}

/**
 * Save knowledge base
 */
function saveKnowledgeBase(kb) {
  kb.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(kb, null, 2));
}

/**
 * Extract potential patterns from email content
 */
function extractPatterns(email) {
  const patterns = {
    openers: [],
    subjects: [],
    signatures: []
  };

  // Extract opener (first non-empty line of body)
  if (email.body) {
    const lines = email.body.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const opener = lines[0].trim();
      if (opener.length > 10 && opener.length < 200) {
        patterns.openers.push(opener);
      }
    }
  }

  // Extract subject patterns
  if (email.subject) {
    patterns.subjects.push(email.subject);
  }

  // Extract signature patterns (look for professional indicators)
  if (email.body) {
    const signatureArea = email.body.split('\n').slice(-20).join('\n');

    // Look for professional patterns
    const professionalPatterns = [
      /NMLS\s*[#:]?\s*\d+/i,
      /DRE\s*[#:]?\s*\d+/i,
      /CalBRE\s*[#:]?\s*\d+/i,
      /Loan Officer/i,
      /Real Estate Agent/i,
      /Realtor/i,
      /Escrow Officer/i,
      /Title Officer/i,
      /Attorney at Law/i,
      /Branch Manager/i
    ];

    for (const pattern of professionalPatterns) {
      const match = signatureArea.match(pattern);
      if (match) {
        patterns.signatures.push(match[0]);
      }
    }
  }

  return patterns;
}

/**
 * Add patterns to knowledge base for a type
 */
function addPatterns(kb, type, patterns) {
  if (!kb.patterns[type]) return;

  for (const category of ['openers', 'subjects', 'signatures']) {
    for (const pattern of patterns[category] || []) {
      if (!kb.patterns[type][category].includes(pattern)) {
        kb.patterns[type][category].push(pattern);
      }
    }
  }
}

/**
 * Display email sample for classification
 */
function displayEmail(email, index, total) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`  EMAIL ${index + 1} of ${total}`);
  console.log('='.repeat(70));
  console.log('');

  console.log(`From: ${email.name || email.email}`);
  console.log(`Email: ${email.email}`);
  console.log(`Exchange: David sent ${email.davidSent}, received ${email.davidReceived}`);
  console.log('');

  if (email.subjects && email.subjects.length > 0) {
    console.log('Subjects:');
    email.subjects.slice(0, 5).forEach(s => console.log(`  - ${s}`));
    console.log('');
  }

  if (email.body) {
    console.log('Email Preview:');
    console.log('-'.repeat(50));
    const preview = email.body.split('\n').slice(0, 15).join('\n');
    console.log(preview);
    console.log('-'.repeat(50));
    console.log('');
  }

  // Show current classification if any
  if (email.classification && email.classification.type !== 'unknown') {
    console.log(`Current guess: ${email.classification.type} (${Math.round(email.classification.confidence * 100)}% confidence)`);
    console.log('');
  }
}

/**
 * Display menu options
 */
function displayMenu() {
  console.log('Classify this contact:');
  console.log('  1. Client (borrower)');
  console.log('  2. Loan Officer');
  console.log('  3. Realtor');
  console.log('  4. Title/Escrow');
  console.log('  5. Attorney');
  console.log('  6. Family & Friends');
  console.log('  7. Insurance');
  console.log('  8. Accountant');
  console.log('  9. Unknown/Other');
  console.log('  s. Skip this one');
  console.log('  q. Quit training');
  console.log('');
}

/**
 * Interactive training session
 */
async function runTrainingSession() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('');
  console.log('='.repeat(70));
  console.log('  INTERACTIVE TRAINING MODE');
  console.log('='.repeat(70));
  console.log('');
  console.log('This training session helps build the knowledge base.');
  console.log('You will be shown email samples and asked to classify them.');
  console.log('Your classifications improve future accuracy.');
  console.log('');

  // Load data
  const enrichedPath = path.join(DATA_DIR, 'enriched-contacts.json');
  if (!fs.existsSync(enrichedPath)) {
    console.log('ERROR: No enriched contacts found. Run the parser first.');
    rl.close();
    return;
  }

  const contacts = JSON.parse(fs.readFileSync(enrichedPath));
  const kb = loadKnowledgeBase();

  // Filter to contacts that need classification
  const needsClassification = contacts.filter(c =>
    !c.classification || c.classification.type === 'unknown' || c.classification.confidence < 0.9
  );

  console.log(`Found ${needsClassification.length} contacts needing classification`);
  console.log('');

  let trained = 0;
  let skipped = 0;

  for (let i = 0; i < needsClassification.length; i++) {
    const contact = needsClassification[i];

    displayEmail(contact, i, needsClassification.length);
    displayMenu();

    const answer = await question('Your choice: ');
    const choice = answer.trim().toLowerCase();

    if (choice === 'q') {
      console.log('');
      console.log('Saving and exiting...');
      break;
    }

    if (choice === 's') {
      skipped++;
      continue;
    }

    const type = TYPES[choice];
    if (type && type !== 'skip' && type !== 'quit' && type !== 'unknown') {
      // Extract and save patterns
      const patterns = extractPatterns(contact);
      addPatterns(kb, type, patterns);

      // Record correction
      kb.corrections.push({
        email: contact.email,
        predictedType: contact.classification?.type,
        actualType: type,
        trainedAt: new Date().toISOString()
      });

      // Update stats
      kb.stats.totalTrainingSamples++;
      kb.stats.byType[type] = (kb.stats.byType[type] || 0) + 1;

      trained++;
      console.log(`  Classified as: ${type}`);
    }

    // Save periodically
    if (trained % 10 === 0) {
      saveKnowledgeBase(kb);
    }
  }

  // Final save
  saveKnowledgeBase(kb);

  console.log('');
  console.log('='.repeat(70));
  console.log('  TRAINING SESSION COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Trained: ${trained} contacts`);
  console.log(`Skipped: ${skipped} contacts`);
  console.log(`Total patterns learned: ${kb.stats.totalTrainingSamples}`);
  console.log('');
  console.log('Knowledge base saved to:', KNOWLEDGE_PATH);

  rl.close();
}

/**
 * Load known clients and extract patterns (batch training)
 */
async function trainFromKnownClients(clientListPath) {
  console.log('');
  console.log('='.repeat(70));
  console.log('  BATCH TRAINING FROM KNOWN CLIENTS');
  console.log('='.repeat(70));
  console.log('');

  if (!fs.existsSync(clientListPath)) {
    console.log('ERROR: Client list not found at:', clientListPath);
    return;
  }

  const clients = JSON.parse(fs.readFileSync(clientListPath));
  const kb = loadKnowledgeBase();

  console.log(`Processing ${clients.length} known clients...`);
  console.log('');

  let processed = 0;
  for (const client of clients) {
    // Extract patterns from known client
    const patterns = extractPatterns(client);
    addPatterns(kb, 'client', patterns);
    processed++;

    if (processed % 50 === 0) {
      console.log(`  Processed: ${processed}/${clients.length}`);
    }
  }

  kb.stats.totalTrainingSamples += processed;
  kb.stats.byType['client'] = (kb.stats.byType['client'] || 0) + processed;
  saveKnowledgeBase(kb);

  console.log('');
  console.log('Batch training complete!');
  console.log(`Extracted patterns from ${processed} known clients`);
  console.log('Knowledge base saved to:', KNOWLEDGE_PATH);
}

/**
 * Show knowledge base stats
 */
function showStats() {
  const kb = loadKnowledgeBase();

  console.log('');
  console.log('='.repeat(70));
  console.log('  KNOWLEDGE BASE STATISTICS');
  console.log('='.repeat(70));
  console.log('');

  console.log('Total training samples:', kb.stats.totalTrainingSamples);
  console.log('Last updated:', kb.updatedAt);
  console.log('');

  console.log('Samples by type:');
  for (const [type, count] of Object.entries(kb.stats.byType || {}).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');

  console.log('Patterns learned:');
  for (const [type, patterns] of Object.entries(kb.patterns)) {
    const total = patterns.openers.length + patterns.subjects.length + patterns.signatures.length;
    if (total > 0) {
      console.log(`  ${type}:`);
      console.log(`    Openers: ${patterns.openers.length}`);
      console.log(`    Subjects: ${patterns.subjects.length}`);
      console.log(`    Signatures: ${patterns.signatures.length}`);
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log('Usage: node interactive-trainer.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  (none)          Start interactive training session');
    console.log('  --stats         Show knowledge base statistics');
    console.log('  --batch <file>  Batch train from a JSON file of known clients');
    console.log('  --help          Show this help message');
    return;
  }

  if (args.includes('--stats')) {
    showStats();
    return;
  }

  const batchIndex = args.indexOf('--batch');
  if (batchIndex !== -1 && args[batchIndex + 1]) {
    await trainFromKnownClients(args[batchIndex + 1]);
    return;
  }

  await runTrainingSession();
}

// Export
module.exports = {
  loadKnowledgeBase,
  saveKnowledgeBase,
  extractPatterns,
  addPatterns,
  runTrainingSession,
  trainFromKnownClients,
  showStats
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
