/**
 * Supabase Client for Email Parser
 * Handles all database operations
 */

const https = require('https');

const SUPABASE_URL = 'https://izcbxqaemlaabpmnqsmm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PzYJhp2dizwuu6pShEhJng_z6FsVdeJ';

/**
 * Make a request to Supabase REST API
 */
function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`Supabase error: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ==================== WORKFLOW OPERATIONS ====================

/**
 * Create a new workflow
 */
async function createWorkflow(totalContacts) {
  const result = await supabaseRequest('POST', '/rest/v1/email_parser_workflow', {
    status: 'pending',
    total_contacts: totalContacts,
    processed_contacts: 0,
    started_at: new Date().toISOString()
  });
  return result[0];
}

/**
 * Update workflow status
 */
async function updateWorkflow(workflowId, updates) {
  await supabaseRequest('PATCH', `/rest/v1/email_parser_workflow?id=eq.${workflowId}`, updates);
}

/**
 * Get current workflow
 */
async function getWorkflow(workflowId) {
  const result = await supabaseRequest('GET', `/rest/v1/email_parser_workflow?id=eq.${workflowId}`);
  return result[0];
}

// ==================== QUEUE OPERATIONS ====================

/**
 * Add task to queue
 */
async function queueTask(workflowId, agent, contactEmail, input = {}) {
  const result = await supabaseRequest('POST', '/rest/v1/email_parser_queue', {
    workflow_id: workflowId,
    agent: agent,
    contact_email: contactEmail,
    status: 'queued',
    input: input
  });
  return result[0];
}

/**
 * Get next queued task for an agent
 */
async function getNextTask(agent) {
  const result = await supabaseRequest('GET',
    `/rest/v1/email_parser_queue?agent=eq.${agent}&status=eq.queued&order=priority.desc,created_at.asc&limit=1`
  );
  return result[0];
}

/**
 * Start processing a task
 */
async function startTask(taskId) {
  await supabaseRequest('PATCH', `/rest/v1/email_parser_queue?id=eq.${taskId}`, {
    status: 'processing',
    started_at: new Date().toISOString()
  });
}

/**
 * Complete a task
 */
async function completeTask(taskId, output) {
  await supabaseRequest('PATCH', `/rest/v1/email_parser_queue?id=eq.${taskId}`, {
    status: 'complete',
    output: output,
    completed_at: new Date().toISOString()
  });
}

/**
 * Fail a task
 */
async function failTask(taskId, error) {
  await supabaseRequest('PATCH', `/rest/v1/email_parser_queue?id=eq.${taskId}`, {
    status: 'failed',
    error: error,
    completed_at: new Date().toISOString()
  });
}

// ==================== CONTACT OPERATIONS ====================

/**
 * Upsert a contact
 */
async function upsertContact(contact) {
  // Check if exists
  const existing = await supabaseRequest('GET',
    `/rest/v1/email_parser_contacts?email=eq.${encodeURIComponent(contact.email)}`
  );

  if (existing && existing.length > 0) {
    // Update
    await supabaseRequest('PATCH',
      `/rest/v1/email_parser_contacts?email=eq.${encodeURIComponent(contact.email)}`,
      { ...contact, updated_at: new Date().toISOString() }
    );
    return existing[0];
  } else {
    // Insert
    const result = await supabaseRequest('POST', '/rest/v1/email_parser_contacts', contact);
    return result[0];
  }
}

/**
 * Get contact by email
 */
async function getContact(email) {
  const result = await supabaseRequest('GET',
    `/rest/v1/email_parser_contacts?email=eq.${encodeURIComponent(email)}`
  );
  return result[0];
}

/**
 * Get contacts by status
 */
async function getContactsByStatus(status, limit = 100) {
  const result = await supabaseRequest('GET',
    `/rest/v1/email_parser_contacts?status=eq.${status}&limit=${limit}`
  );
  return result;
}

// ==================== KNOWLEDGE BASE OPERATIONS ====================

/**
 * Add pattern to knowledge base
 */
async function addPattern(category, patternType, pattern, confidence = 1.0, source = 'training') {
  const result = await supabaseRequest('POST', '/rest/v1/email_parser_knowledge_base', {
    category: category,
    pattern_type: patternType,
    pattern: pattern,
    confidence: confidence,
    source: source
  });
  return result[0];
}

/**
 * Get patterns for a category
 */
async function getPatterns(category) {
  const result = await supabaseRequest('GET',
    `/rest/v1/email_parser_knowledge_base?category=eq.${category}&order=confidence.desc`
  );
  return result;
}

/**
 * Get all patterns
 */
async function getAllPatterns() {
  const result = await supabaseRequest('GET',
    '/rest/v1/email_parser_knowledge_base?order=category,pattern_type,confidence.desc'
  );
  return result;
}

/**
 * Increment pattern match count
 */
async function incrementPatternMatch(patternId) {
  // Get current count
  const current = await supabaseRequest('GET',
    `/rest/v1/email_parser_knowledge_base?id=eq.${patternId}`
  );
  if (current && current[0]) {
    await supabaseRequest('PATCH',
      `/rest/v1/email_parser_knowledge_base?id=eq.${patternId}`,
      { match_count: (current[0].match_count || 0) + 1 }
    );
  }
}

// ==================== CORRECTIONS OPERATIONS ====================

/**
 * Add a correction (for training)
 */
async function addCorrection(contactEmail, predictedType, actualType, userNote) {
  const result = await supabaseRequest('POST', '/rest/v1/email_parser_corrections', {
    contact_email: contactEmail,
    predicted_type: predictedType,
    actual_type: actualType,
    user_note: userNote
  });
  return result[0];
}

/**
 * Get corrections for analysis
 */
async function getCorrections() {
  const result = await supabaseRequest('GET',
    '/rest/v1/email_parser_corrections?order=created_at.desc'
  );
  return result;
}

// ==================== EXTRACTION LOGGING ====================

/**
 * Log an extraction attempt for debugging and tracking
 */
async function logExtraction(workflowId, email, extracted, mboxFile = null) {
  try {
    const result = await supabaseRequest('POST', '/rest/v1/email_parser_extraction_log', {
      workflow_id: workflowId || null,
      contact_email: email.toLowerCase(),
      extracted_phones: extracted.phones || [],
      extracted_nmls: extracted.nmls || null,
      extracted_dre: extracted.dre || null,
      extracted_company: extracted.company || null,
      extracted_title: extracted.title || null,
      signature_sample: extracted.signatureSample?.substring(0, 500) || null,
      was_base64_decoded: extracted.wasBase64 || false,
      mbox_file: mboxFile || null,
      success: true
    });
    return result[0];
  } catch (e) {
    console.error('Failed to log extraction:', e.message);
    return null;
  }
}

/**
 * Log an extraction error
 */
async function logExtractionError(workflowId, email, error, mboxFile = null) {
  try {
    const result = await supabaseRequest('POST', '/rest/v1/email_parser_extraction_log', {
      workflow_id: workflowId || null,
      contact_email: email.toLowerCase(),
      mbox_file: mboxFile || null,
      success: false,
      error: error.message || String(error)
    });
    return result[0];
  } catch (e) {
    console.error('Failed to log extraction error:', e.message);
    return null;
  }
}

/**
 * Bulk upsert contacts from enrichment cache
 */
async function bulkUpsertContacts(contacts) {
  const results = [];
  for (const contact of contacts) {
    try {
      const result = await upsertContact({
        email: contact.email,
        phones: contact.phones || [],
        nmls: contact.nmls || null,
        dre: contact.dre || null,
        title: contact.titles?.[0] || null,
        company: contact.companies?.[0] || null,
        emails_processed: contact.emailsProcessed || 0,
        sample_signatures: contact.sampleSignatures || [],
        extraction_source: 'batch'
      });
      results.push(result);
    } catch (e) {
      console.error(`Failed to upsert ${contact.email}:`, e.message);
    }
  }
  return results;
}

// ==================== UTILITY ====================

/**
 * Check if Supabase is reachable and tables exist
 */
async function checkConnection() {
  try {
    const result = await supabaseRequest('GET', '/rest/v1/email_parser_workflow?limit=1');
    return { connected: true, tablesExist: true };
  } catch (error) {
    if (error.message.includes('Could not find')) {
      return { connected: true, tablesExist: false, error: 'Tables not created yet' };
    }
    return { connected: false, error: error.message };
  }
}

module.exports = {
  // Workflow
  createWorkflow,
  updateWorkflow,
  getWorkflow,

  // Queue
  queueTask,
  getNextTask,
  startTask,
  completeTask,
  failTask,

  // Contacts
  upsertContact,
  getContact,
  getContactsByStatus,
  bulkUpsertContacts,

  // Extraction Logging
  logExtraction,
  logExtractionError,

  // Knowledge Base
  addPattern,
  getPatterns,
  getAllPatterns,
  incrementPatternMatch,

  // Corrections
  addCorrection,
  getCorrections,

  // Utility
  checkConnection,
  supabaseRequest
};
