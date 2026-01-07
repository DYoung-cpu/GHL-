/**
 * Email Parser Dashboard Server
 *
 * Real-time web interface for monitoring and training the email parser.
 * Uses Socket.IO for live updates, allows user to answer questions
 * when agent confidence is below 80%.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

// Create global event bus for agents to emit to
const agentEvents = new EventEmitter();
global.agentEvents = agentEvents;

// Question queue - agents add questions, UI answers them
const questionQueue = [];
let pendingQuestion = null;
let questionResolver = null;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3847;

// Data paths
const DATA_DIR = path.join(__dirname, 'data');
const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge/knowledge-base.json');
const COMPREHENSIVE_PATH = path.join(DATA_DIR, 'comprehensive-contacts.json');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================
// COMPREHENSIVE CONTACTS API
// ============================================

// API: Get comprehensive contacts stats
app.get('/api/comprehensive/stats', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  const contacts = Object.values(data);

  const relCounts = {};
  contacts.forEach(c => {
    const type = c.relationship?.type || 'unknown';
    relCounts[type] = (relCounts[type] || 0) + 1;
  });

  res.json({
    total: contacts.length,
    withName: contacts.filter(c => c.name && c.name.length > 2).length,
    withPhone: contacts.filter(c => c.phone).length,
    withCompany: contacts.filter(c => c.company && c.company.length > 2).length,
    withNmls: contacts.filter(c => c.nmls).length,
    relationships: relCounts
  });
});

// API: Get all comprehensive contacts
app.get('/api/comprehensive', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  res.json(data);
});

// API: Get contacts that had issues (for review)
app.get('/api/comprehensive/issues', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));

  // Contacts that were cleaned up
  const ISSUE_EMAILS = [
    'deedee@expressmtgcapital.com',
    'loanwebusa@verizon.net',
    'jesus@fulcrumloans.com',
    'lisa_melton@pfmgrp.com',
    'mhewitt@willowprocessing.com',
    'anthonyamini@priorityfinancial.net',
    'hb-homeequitysupport@homebridge.com',
    'donotreply@homebridge.com',
    'lucia@arc.dev',
    'mailer@oncehub.com',
    'mcl@certifiedcredit.com'
  ];

  const issues = ISSUE_EMAILS.map(email => ({
    email,
    ...data[email],
    hadIssue: true
  })).filter(c => c.email);

  res.json({ count: issues.length, contacts: issues });
});

// API: Get single comprehensive contact
app.get('/api/comprehensive/:email', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  const email = req.params.email.toLowerCase();
  if (data[email]) {
    res.json({ email, ...data[email] });
  } else {
    res.json({ error: 'Contact not found', email });
  }
});

// API: Update comprehensive contact
app.post('/api/comprehensive/:email', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ success: false, error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  const email = req.params.email.toLowerCase();

  if (!data[email]) {
    return res.json({ success: false, error: 'Contact not found' });
  }

  const updates = req.body;

  // Apply updates
  if (updates.name !== undefined) data[email].name = updates.name;
  if (updates.phone !== undefined) data[email].phone = updates.phone;
  if (updates.company !== undefined) data[email].company = updates.company;
  if (updates.title !== undefined) data[email].title = updates.title;
  if (updates.nmls !== undefined) data[email].nmls = updates.nmls;
  if (updates.relationship !== undefined) data[email].relationship = updates.relationship;

  data[email].manuallyEdited = true;
  data[email].editedAt = new Date().toISOString();

  fs.writeFileSync(COMPREHENSIVE_PATH, JSON.stringify(data, null, 2));

  res.json({ success: true, email, contact: data[email] });
});

// API: Delete a contact
app.delete('/api/comprehensive/:email', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ success: false, error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  const email = req.params.email.toLowerCase();

  if (!data[email]) {
    return res.json({ success: false, error: 'Contact not found' });
  }

  delete data[email];
  fs.writeFileSync(COMPREHENSIVE_PATH, JSON.stringify(data, null, 2));

  res.json({ success: true, email, message: 'Contact deleted' });
});

// API: Re-process a contact with LLM
app.post('/api/comprehensive/:email/reprocess', async (req, res) => {
  const email = req.params.email.toLowerCase();

  console.log(`[API] Re-processing: ${email}`);

  try {
    // Load LLM extractor
    const { extractFromEmail } = require('./utils/llm-extractor');

    // Find emails from mbox for this contact
    const readline = require('readline');
    const MBOX_PATHS = [
      '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
      '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
    ];

    const emails = [];

    for (const mboxPath of MBOX_PATHS) {
      if (!fs.existsSync(mboxPath)) continue;
      if (emails.length >= 3) break;

      const rl = readline.createInterface({
        input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
        crlfDelay: Infinity
      });

      let currentEmail = null;

      for await (const line of rl) {
        if (line.startsWith('From ') && line.includes('@')) {
          if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
            emails.push({
              fromName: currentEmail.fromName,
              subject: currentEmail.subject,
              date: currentEmail.date,
              body: currentEmail.body.join('\n')
            });
            if (emails.length >= 3) {
              rl.close();
              break;
            }
          }

          currentEmail = {
            fromEmail: '', fromName: '', subject: '', date: '',
            body: [], isTarget: false, inHeaders: true
          };
          continue;
        }

        if (!currentEmail) continue;

        if (currentEmail.inHeaders) {
          const lower = line.toLowerCase();
          if (lower.startsWith('from:')) {
            const val = line.substring(5).trim();
            const emailMatch = val.match(/<([^>]+)>/) || val.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) {
              currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
              currentEmail.isTarget = currentEmail.fromEmail === email;
            }
            const nameMatch = val.match(/^"?([^"<]+)"?\s*</);
            if (nameMatch) currentEmail.fromName = nameMatch[1].trim();
          }
          if (lower.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
          if (lower.startsWith('date:')) currentEmail.date = line.substring(5).trim();
          if (line === '') currentEmail.inHeaders = false;
        } else if (currentEmail.isTarget) {
          currentEmail.body.push(line);
          if (currentEmail.body.length > 300) currentEmail.body.shift();
        }
      }
    }

    console.log(`[API] Found ${emails.length} emails for ${email}`);

    if (emails.length === 0) {
      return res.json({ success: false, error: 'No emails found for this contact' });
    }

    // Extract name from subject if present (e.g., "Free Rate Update Intro - Ken Aiken")
    let nameFromSubject = null;
    for (const e of emails) {
      const match = e.subject?.match(/(?:Intro|Update)\s*-\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (match) {
        nameFromSubject = match[1];
        break;
      }
    }

    // Run LLM on first email
    const e = emails[0];
    const result = await extractFromEmail({
      from: email,
      fromName: e.fromName || nameFromSubject || '',
      to: 'david@lendwisemtg.com',
      subject: e.subject || '',
      date: e.date || '',
      body: e.body || ''
    });

    console.log(`[API] LLM result:`, result.senderContact);

    // Update comprehensive contacts
    const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));

    if (!data[email]) {
      return res.json({ success: false, error: 'Contact not found in database' });
    }

    // Use nameFromSubject if LLM didn't find name
    const finalName = result.senderContact?.name || nameFromSubject || e.fromName || data[email].name;

    // Update with new data
    data[email].name = finalName;
    data[email].nameSource = nameFromSubject ? 'subject_line' : (result.senderContact?.name ? 'llm_reprocess' : data[email].nameSource);

    if (result.senderContact?.phone) data[email].phone = result.senderContact.phone;
    if (result.senderContact?.company) data[email].company = result.senderContact.company;
    if (result.senderContact?.title) data[email].title = result.senderContact.title;
    if (result.senderContact?.nmls) data[email].nmls = result.senderContact.nmls;
    if (result.relationship?.type) data[email].relationship = result.relationship;

    data[email].reprocessedAt = new Date().toISOString();

    fs.writeFileSync(COMPREHENSIVE_PATH, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      email,
      contact: data[email],
      emailsFound: emails.length,
      nameFromSubject
    });

  } catch (err) {
    console.error('[API] Reprocess error:', err);
    res.json({ success: false, error: err.message });
  }
});

// API: Search comprehensive contacts
app.get('/api/comprehensive/search/:query', (req, res) => {
  if (!fs.existsSync(COMPREHENSIVE_PATH)) {
    return res.json({ error: 'Comprehensive contacts not found' });
  }
  const data = JSON.parse(fs.readFileSync(COMPREHENSIVE_PATH));
  const query = req.params.query.toLowerCase();

  const results = Object.entries(data)
    .filter(([email, contact]) => {
      return email.includes(query) ||
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        (contact.company && contact.company.toLowerCase().includes(query));
    })
    .slice(0, 50)
    .map(([email, contact]) => ({ email, ...contact }));

  res.json({ count: results.length, contacts: results });
});

// Favicon (prevent 404)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API: Get current state
app.get('/api/state', (req, res) => {
  const statePath = path.join(DATA_DIR, 'workflow-state.json');
  if (fs.existsSync(statePath)) {
    res.json(JSON.parse(fs.readFileSync(statePath)));
  } else {
    res.json({ status: 'idle', steps: {} });
  }
});

// API: Get email index stats
app.get('/api/index-stats', (req, res) => {
  const indexPath = path.join(DATA_DIR, 'email-index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath));
    const contacts = Object.values(index);
    res.json({
      totalContacts: contacts.length,
      withExchange: contacts.filter(c => c.davidSent > 0 && c.davidReceived > 0).length,
      davidSentOnly: contacts.filter(c => c.davidSent > 0 && c.davidReceived === 0).length,
      davidReceivedOnly: contacts.filter(c => c.davidSent === 0 && c.davidReceived > 0).length
    });
  } else {
    res.json({ error: 'Index not found' });
  }
});

// API: Get knowledge base stats
app.get('/api/knowledge', (req, res) => {
  if (fs.existsSync(KNOWLEDGE_PATH)) {
    res.json(JSON.parse(fs.readFileSync(KNOWLEDGE_PATH)));
  } else {
    res.json({ patterns: {}, stats: { totalTrainingSamples: 0 } });
  }
});

// API: Get enrichment cache (extracted contact data)
app.get('/api/enrichment', (req, res) => {
  const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
  if (fs.existsSync(cachePath)) {
    const cache = JSON.parse(fs.readFileSync(cachePath));
    const contacts = Object.values(cache);

    // Calculate stats
    const stats = {
      total: contacts.length,
      withPhone: contacts.filter(c => c.phones?.length > 0).length,
      withNMLS: contacts.filter(c => c.nmls).length,
      withDRE: contacts.filter(c => c.dre).length,
      withCompany: contacts.filter(c => c.companies?.length > 0).length,
      withTitle: contacts.filter(c => c.titles?.length > 0).length,
      qualityDistribution: {}
    };

    // Quality distribution
    contacts.forEach(c => {
      const q = c.signatureQuality || 'unknown';
      stats.qualityDistribution[q] = (stats.qualityDistribution[q] || 0) + 1;
    });

    res.json({ stats, contacts: cache });
  } else {
    res.json({ error: 'Enrichment cache not found', stats: {}, contacts: {} });
  }
});

// API: Get single contact enrichment
app.get('/api/enrichment/:email', (req, res) => {
  const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
  if (fs.existsSync(cachePath)) {
    const cache = JSON.parse(fs.readFileSync(cachePath));
    const email = req.params.email.toLowerCase();
    if (cache[email]) {
      res.json(cache[email]);
    } else {
      res.json({ error: 'Contact not found', email });
    }
  } else {
    res.json({ error: 'Enrichment cache not found' });
  }
});

// API: Update single contact enrichment (full data)
app.post('/api/enrichment/:email', (req, res) => {
  const { email } = req.params;
  const { newType, tags, edits, notes, approved } = req.body;

  const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
  const reviewPath = path.join(DATA_DIR, 'needs-review.json');

  if (!fs.existsSync(cachePath)) {
    return res.json({ success: false, error: 'Enrichment cache not found' });
  }

  const cache = JSON.parse(fs.readFileSync(cachePath));
  const key = email.toLowerCase();

  if (!cache[key]) {
    return res.json({ success: false, error: 'Contact not found' });
  }

  // Update classification
  cache[key].classification = {
    type: newType || tags?.[0] || cache[key].classification?.type,
    confidence: 1.0,
    signal: 'manual_edit'
  };

  // Update editable fields if provided
  if (edits) {
    if (edits.name) {
      cache[key].name = edits.name;
      // Try to split name
      const parts = edits.name.split(' ');
      if (parts.length > 1) {
        cache[key].firstName = parts[0];
        cache[key].lastName = parts.slice(1).join(' ');
      } else {
        cache[key].firstName = edits.name;
      }
    }
    if (edits.phone && edits.phone.length > 0) {
      if (!cache[key].phones) cache[key].phones = [];
      if (!cache[key].phones.includes(edits.phone)) {
        cache[key].phones.unshift(edits.phone);
      }
    }
    if (edits.title && edits.title.length > 0) {
      if (!cache[key].titles) cache[key].titles = [];
      if (!cache[key].titles.includes(edits.title)) {
        cache[key].titles.unshift(edits.title);
      }
    }
    if (edits.company && edits.company.length > 0) {
      if (!cache[key].companies) cache[key].companies = [];
      if (!cache[key].companies.includes(edits.company)) {
        cache[key].companies.unshift(edits.company);
      }
    }
  }

  // Update notes
  if (notes !== undefined) {
    cache[key].notes = notes;
  }

  // Mark as reviewed
  cache[key].needsReview = false;
  cache[key].reviewedAt = new Date().toISOString();
  cache[key].manuallyEdited = true;

  // Save enrichment cache
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  // Remove from review queue
  if (fs.existsSync(reviewPath)) {
    let reviewList = JSON.parse(fs.readFileSync(reviewPath));
    reviewList = reviewList.filter(c => c.email.toLowerCase() !== key);
    fs.writeFileSync(reviewPath, JSON.stringify(reviewList, null, 2));
  }

  // Broadcast update
  io.emit('review_updated', { email: key, newType, approved });
  io.emit('classification', {
    email: key,
    name: cache[key].name,
    type: cache[key].classification.type,
    confidence: 1.0
  });

  res.json({ success: true, email: key, contact: cache[key] });
});

// API: Delete single contact from enrichment cache
app.delete('/api/enrichment/:email', (req, res) => {
  const { email } = req.params;

  const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
  const reviewPath = path.join(DATA_DIR, 'needs-review.json');
  const indexPath = path.join(DATA_DIR, 'email-index.json');

  const key = email.toLowerCase();
  let deleted = false;

  // Remove from enrichment cache
  if (fs.existsSync(cachePath)) {
    const cache = JSON.parse(fs.readFileSync(cachePath));
    if (cache[key]) {
      delete cache[key];
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      deleted = true;
    }
  }

  // Remove from review queue
  if (fs.existsSync(reviewPath)) {
    let reviewList = JSON.parse(fs.readFileSync(reviewPath));
    reviewList = reviewList.filter(c => c.email.toLowerCase() !== key);
    fs.writeFileSync(reviewPath, JSON.stringify(reviewList, null, 2));
  }

  // Remove from email index
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath));
    if (index[key]) {
      delete index[key];
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }
  }

  // Broadcast update
  io.emit('review_updated', { email: key, deleted: true });

  res.json({ success: deleted, email: key });
});

// API: Get contacts needing review
app.get('/api/review', (req, res) => {
  const reviewPath = path.join(DATA_DIR, 'needs-review.json');
  if (fs.existsSync(reviewPath)) {
    const reviewList = JSON.parse(fs.readFileSync(reviewPath));
    res.json({ count: reviewList.length, contacts: reviewList });
  } else {
    res.json({ count: 0, contacts: [] });
  }
});

// API: Approve/update a contact classification
app.post('/api/review/:email', (req, res) => {
  const { email } = req.params;
  const { newType, approved } = req.body;

  const cachePath = path.join(DATA_DIR, 'enrichment-cache.json');
  const reviewPath = path.join(DATA_DIR, 'needs-review.json');

  if (!fs.existsSync(cachePath)) {
    return res.json({ success: false, error: 'Enrichment cache not found' });
  }

  // Update the enrichment cache
  const cache = JSON.parse(fs.readFileSync(cachePath));
  const key = email.toLowerCase();

  if (!cache[key]) {
    return res.json({ success: false, error: 'Contact not found' });
  }

  // Update classification
  cache[key].classification = {
    type: newType || cache[key].classification?.type,
    confidence: 1.0,
    signal: 'manual_review'
  };
  cache[key].needsReview = false;
  cache[key].reviewedAt = new Date().toISOString();

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  // Remove from review queue
  if (fs.existsSync(reviewPath)) {
    let reviewList = JSON.parse(fs.readFileSync(reviewPath));
    reviewList = reviewList.filter(c => c.email.toLowerCase() !== key);
    fs.writeFileSync(reviewPath, JSON.stringify(reviewList, null, 2));
  }

  // Broadcast update
  io.emit('review_updated', { email: key, newType, approved });

  res.json({ success: true, email: key, newType });
});

// API: Run reclassification
app.post('/api/reclassify', async (req, res) => {
  res.json({ started: true, message: 'Reclassification started' });

  // Run reclassification script
  const { exec } = require('child_process');
  exec('node reclassify-contacts.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      io.emit('reclassify_complete', { success: false, error: error.message });
    } else {
      io.emit('reclassify_complete', { success: true, output: stdout });
    }
  });
});

// API: Get pending question
app.get('/api/question', (req, res) => {
  if (pendingQuestion) {
    res.json(pendingQuestion);
  } else {
    res.json({ pending: false });
  }
});

// API: Answer a question
app.post('/api/answer', (req, res) => {
  const { answer } = req.body;

  if (pendingQuestion && questionResolver) {
    const question = pendingQuestion;
    pendingQuestion = null;

    // Resolve the promise that the agent is waiting on
    questionResolver(answer);
    questionResolver = null;

    // Broadcast that question was answered
    io.emit('question_answered', { question, answer });

    res.json({ success: true, answer });
  } else {
    res.json({ success: false, error: 'No pending question' });
  }
});

// API: Start the parser
app.post('/api/start', async (req, res) => {
  res.json({ started: true });

  console.log('[API] Starting orchestrator...');

  try {
    // Clear require cache to get fresh module
    const modulePath = require.resolve('./orchestrator-events');
    delete require.cache[modulePath];

    // Import and run orchestrator with event emission
    const orchestrator = require('./orchestrator-events');
    console.log('[API] Orchestrator loaded, calling run()...');

    orchestrator.run({ io, askQuestion })
      .then(() => console.log('[API] Orchestrator completed'))
      .catch(err => {
        console.error('[API] Orchestrator run error:', err.message, err.stack);
        io.emit('error', { message: err.message });
      });
  } catch (err) {
    console.error('[API] Orchestrator require error:', err.message, err.stack);
    io.emit('error', { message: err.message });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Dashboard connected');

  // Send current state
  const statePath = path.join(DATA_DIR, 'workflow-state.json');
  if (fs.existsSync(statePath)) {
    socket.emit('state', JSON.parse(fs.readFileSync(statePath)));
  }

  // Send pending question if any
  if (pendingQuestion) {
    socket.emit('question', pendingQuestion);
  }

  socket.on('answer', (data) => {
    if (pendingQuestion && questionResolver) {
      const question = pendingQuestion;
      pendingQuestion = null;
      // Support both new format (data directly) and legacy format (data.answer)
      const answer = data.tags ? data : (data.answer || data);
      questionResolver(answer);
      questionResolver = null;
      io.emit('question_answered', { question, answer });
    }
  });

  socket.on('disconnect', () => {
    console.log('Dashboard disconnected');
  });
});

// Forward agent events to Socket.IO
agentEvents.on('status', (data) => io.emit('status', data));
agentEvents.on('progress', (data) => io.emit('progress', data));
agentEvents.on('email', (data) => io.emit('email', data));
agentEvents.on('classification', (data) => io.emit('classification', data));
agentEvents.on('agent_start', (data) => io.emit('agent_start', data));
agentEvents.on('agent_complete', (data) => io.emit('agent_complete', data));
agentEvents.on('error', (data) => io.emit('error', data));

/**
 * Ask user a question and wait for answer
 * Used by agents when confidence is below threshold
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    pendingQuestion = {
      ...question,
      askedAt: new Date().toISOString()
    };
    questionResolver = resolve;

    // Broadcast question to all connected clients
    io.emit('question', pendingQuestion);

    console.log('');
    console.log('>>> WAITING FOR USER INPUT <<<');
    console.log(`Question: ${question.text}`);
    console.log('');
  });
}

// Export for use by agents
module.exports = { askQuestion, agentEvents, io };

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  EMAIL PARSER DASHBOARD');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('Open this URL in your browser to see the dashboard.');
  console.log('');
});
