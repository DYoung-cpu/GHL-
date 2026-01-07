/**
 * Email Parser Orchestrator
 *
 * Coordinates the multi-agent email parsing system.
 * Ensures agents run in proper sequence:
 *   1. Index Builder - Scan mbox files, build email index
 *   2. Exchange Validator - Check for bi-directional communication
 *   3. Contact Enricher - Extract details from emails
 *   4. Document Extractor - Pull ID documents (optional)
 *   5. Final Validator - Quality checks, categorization
 *
 * Output: Export-ready JSON with confirmed, unassigned, spam categories
 */

const fs = require('fs');
const path = require('path');

// Import agents
const indexBuilder = require('./index-builder');
const exchangeValidator = require('./agents/exchange-validator');
const contactEnricher = require('./agents/contact-enricher');
const documentExtractor = require('./agents/document-extractor');
const finalValidator = require('./agents/final-validator');

// Import Supabase client (if tables exist)
let supabase = null;
try {
  supabase = require('./utils/supabase-client');
} catch (e) {
  console.log('Note: Supabase client not available, running in local mode');
}

// Data paths
const DATA_DIR = path.join(__dirname, 'data');
const PATHS = {
  emailIndex: path.join(DATA_DIR, 'email-index.json'),
  exchangeValidation: path.join(DATA_DIR, 'exchange-validation.json'),
  enrichedContacts: path.join(DATA_DIR, 'enriched-contacts.json'),
  extractedDocuments: path.join(DATA_DIR, 'extracted-documents.json'),
  finalValidation: path.join(DATA_DIR, 'final-validation.json'),
  exportReady: path.join(DATA_DIR, 'export-ready.json')
};

/**
 * Workflow state
 */
let workflowState = {
  id: null,
  status: 'pending',
  startedAt: null,
  completedAt: null,
  currentAgent: null,
  steps: {
    indexBuilder: { status: 'pending', contacts: 0 },
    exchangeValidator: { status: 'pending', confirmed: 0, unconfirmed: 0 },
    contactEnricher: { status: 'pending', enriched: 0 },
    documentExtractor: { status: 'pending', documents: 0 },
    finalValidator: { status: 'pending', confirmed: 0, unassigned: 0, spam: 0 }
  },
  errors: []
};

/**
 * Update workflow state (local and Supabase)
 */
async function updateState(updates) {
  Object.assign(workflowState, updates);

  // Try to sync to Supabase
  if (supabase && workflowState.id) {
    try {
      await supabase.updateWorkflow(workflowState.id, {
        status: workflowState.status,
        current_agent: workflowState.currentAgent,
        processed_contacts: workflowState.steps.finalValidator.confirmed || 0,
        error: workflowState.errors.length > 0 ? workflowState.errors.join('; ') : null
      });
    } catch (e) {
      // Supabase sync failed, continue with local state
    }
  }

  // Save local state
  fs.writeFileSync(
    path.join(DATA_DIR, 'workflow-state.json'),
    JSON.stringify(workflowState, null, 2)
  );
}

/**
 * Run the index builder
 */
async function runIndexBuilder() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  STEP 1: BUILD EMAIL INDEX');
  console.log('='.repeat(60));

  workflowState.currentAgent = 'index_builder';
  workflowState.steps.indexBuilder.status = 'running';
  await updateState({ status: 'indexing' });

  try {
    // Check if index already exists and is recent
    if (fs.existsSync(PATHS.emailIndex)) {
      const stats = fs.statSync(PATHS.emailIndex);
      const hoursSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

      if (hoursSinceModified < 24) {
        console.log('Using existing email index (less than 24 hours old)');
        const index = JSON.parse(fs.readFileSync(PATHS.emailIndex));
        workflowState.steps.indexBuilder = {
          status: 'complete',
          contacts: Object.keys(index).length,
          usedExisting: true
        };
        await updateState({});
        return index;
      }
    }

    // Build fresh index
    const index = await indexBuilder.main();
    workflowState.steps.indexBuilder = {
      status: 'complete',
      contacts: Object.keys(index).length
    };
    await updateState({});
    return index;

  } catch (error) {
    workflowState.steps.indexBuilder.status = 'failed';
    workflowState.errors.push(`Index builder: ${error.message}`);
    await updateState({ status: 'failed' });
    throw error;
  }
}

/**
 * Run exchange validator
 */
async function runExchangeValidator() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  STEP 2: VALIDATE EMAIL EXCHANGES');
  console.log('='.repeat(60));

  workflowState.currentAgent = 'exchange_validator';
  workflowState.steps.exchangeValidator.status = 'running';
  await updateState({ status: 'validating' });

  try {
    const results = await exchangeValidator.main();
    workflowState.steps.exchangeValidator = {
      status: 'complete',
      confirmed: results.stats.confirmed,
      unconfirmed: results.stats.total - results.stats.confirmed
    };
    await updateState({});
    return results;

  } catch (error) {
    workflowState.steps.exchangeValidator.status = 'failed';
    workflowState.errors.push(`Exchange validator: ${error.message}`);
    await updateState({ status: 'failed' });
    throw error;
  }
}

/**
 * Run contact enricher
 */
async function runContactEnricher() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  STEP 3: ENRICH CONTACTS');
  console.log('='.repeat(60));

  workflowState.currentAgent = 'contact_enricher';
  workflowState.steps.contactEnricher.status = 'running';
  await updateState({ status: 'enriching' });

  try {
    const enriched = await contactEnricher.main();
    workflowState.steps.contactEnricher = {
      status: 'complete',
      enriched: enriched.length
    };
    await updateState({});
    return enriched;

  } catch (error) {
    workflowState.steps.contactEnricher.status = 'failed';
    workflowState.errors.push(`Contact enricher: ${error.message}`);
    await updateState({ status: 'failed' });
    throw error;
  }
}

/**
 * Run document extractor (optional)
 */
async function runDocumentExtractor(options = { skipDocs: true }) {
  if (options.skipDocs) {
    console.log('');
    console.log('Skipping document extraction (use --extract-docs to enable)');
    workflowState.steps.documentExtractor.status = 'skipped';
    await updateState({});
    return null;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  STEP 4: EXTRACT DOCUMENTS');
  console.log('='.repeat(60));

  workflowState.currentAgent = 'document_extractor';
  workflowState.steps.documentExtractor.status = 'running';
  await updateState({ status: 'extracting_docs' });

  try {
    const results = await documentExtractor.main();
    const totalDocs = results.reduce((sum, r) => sum + r.documents.length, 0);
    workflowState.steps.documentExtractor = {
      status: 'complete',
      documents: totalDocs
    };
    await updateState({});
    return results;

  } catch (error) {
    workflowState.steps.documentExtractor.status = 'failed';
    workflowState.errors.push(`Document extractor: ${error.message}`);
    // Don't fail the whole workflow for doc extraction
    return null;
  }
}

/**
 * Run final validator
 */
async function runFinalValidator() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  STEP 5: FINAL VALIDATION');
  console.log('='.repeat(60));

  workflowState.currentAgent = 'final_validator';
  workflowState.steps.finalValidator.status = 'running';
  await updateState({ status: 'validating_final' });

  try {
    const results = await finalValidator.main();
    workflowState.steps.finalValidator = {
      status: 'complete',
      confirmed: results.stats.confirmed,
      unassigned: results.stats.unassigned,
      spam: results.stats.spam
    };
    await updateState({});
    return results;

  } catch (error) {
    workflowState.steps.finalValidator.status = 'failed';
    workflowState.errors.push(`Final validator: ${error.message}`);
    await updateState({ status: 'failed' });
    throw error;
  }
}

/**
 * Generate final summary
 */
function generateSummary() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  WORKFLOW COMPLETE');
  console.log('='.repeat(60));
  console.log('');

  const steps = workflowState.steps;

  console.log('Pipeline Summary:');
  console.log(`  1. Index Builder: ${steps.indexBuilder.contacts} contacts indexed`);
  console.log(`  2. Exchange Validator: ${steps.exchangeValidator.confirmed} confirmed exchanges`);
  console.log(`  3. Contact Enricher: ${steps.contactEnricher.enriched} contacts enriched`);
  console.log(`  4. Document Extractor: ${steps.documentExtractor.status === 'skipped' ? 'Skipped' : steps.documentExtractor.documents + ' documents'}`);
  console.log(`  5. Final Validator:`);
  console.log(`       CONFIRMED (GHL-ready): ${steps.finalValidator.confirmed}`);
  console.log(`       UNASSIGNED (review): ${steps.finalValidator.unassigned}`);
  console.log(`       SPAM (removed): ${steps.finalValidator.spam}`);
  console.log('');

  console.log('Output Files:');
  console.log(`  Export-ready data: ${PATHS.exportReady}`);
  console.log(`  Full validation: ${PATHS.finalValidation}`);
  console.log(`  Workflow state: ${path.join(DATA_DIR, 'workflow-state.json')}`);
  console.log('');

  if (workflowState.errors.length > 0) {
    console.log('Warnings/Errors:');
    workflowState.errors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }

  console.log('Duration:', Math.round((Date.now() - new Date(workflowState.startedAt).getTime()) / 1000 / 60), 'minutes');
}

/**
 * Main orchestration function
 */
async function run(options = {}) {
  console.log('');
  console.log('='.repeat(60));
  console.log('  EMAIL PARSER ORCHESTRATOR');
  console.log('='.repeat(60));
  console.log('');
  console.log('Starting multi-agent email parsing workflow...');
  console.log('');

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Initialize workflow
  workflowState.startedAt = new Date().toISOString();
  workflowState.status = 'running';

  // Try to create Supabase workflow record
  if (supabase) {
    try {
      const workflow = await supabase.createWorkflow(0);
      if (workflow?.id) {
        workflowState.id = workflow.id;
        console.log('Supabase workflow ID:', workflowState.id);
      }
    } catch (e) {
      console.log('Note: Running without Supabase tracking');
    }
  }

  try {
    // Step 1: Build email index
    await runIndexBuilder();

    // Step 2: Validate exchanges
    await runExchangeValidator();

    // Step 3: Enrich contacts
    await runContactEnricher();

    // Step 4: Extract documents (optional)
    await runDocumentExtractor(options);

    // Step 5: Final validation
    await runFinalValidator();

    // Complete
    workflowState.completedAt = new Date().toISOString();
    workflowState.status = 'complete';
    workflowState.currentAgent = null;
    await updateState({});

    // Generate summary
    generateSummary();

    return workflowState;

  } catch (error) {
    console.error('');
    console.error('WORKFLOW FAILED:', error.message);
    workflowState.completedAt = new Date().toISOString();
    await updateState({ status: 'failed' });
    throw error;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    skipDocs: !args.includes('--extract-docs')
  };

  if (args.includes('--help')) {
    console.log('Usage: node orchestrator.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --extract-docs   Enable document extraction (slow)');
    console.log('  --help           Show this help message');
    return;
  }

  try {
    await run(options);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  run,
  workflowState,
  PATHS
};

// Run if called directly
if (require.main === module) {
  main();
}
