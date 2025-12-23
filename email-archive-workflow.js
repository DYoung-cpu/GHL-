/**
 * EMAIL ARCHIVE WORKFLOW AGENT
 *
 * Orchestrates the full email archiving process:
 * 1. Extract emails for target contacts from mbox
 * 2. Generate labeled HTML files
 * 3. Create conversation summaries
 * 4. Push summaries to GHL contact notes
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_KEY: 'pit-7427e736-d68a-41d8-9e9b-4b824b996926',
  LOCATION_ID: 'peE6XmGYBb1xV0iNbh6C',
  MBOX_PATH: '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  OUTPUT_DIR: '/mnt/c/Users/dyoun/ghl-automation/email-archive',
  MAX_EMAILS_PER_CONTACT: 100
};

// Target contacts
const TARGET_CONTACTS = [
  { name: 'Marc Shenkman', email: 'marcshenkman@priorityfinancial.net', folder: 'Marc_Shenkman' },
  { name: 'Brenda Perry', email: 'brenda@priorityfinancial.net', folder: 'Brenda_Perry' },
  { name: 'Anthony Amini', email: 'anthonyamini@priorityfinancial.net', folder: 'Anthony_Amini' },
  { name: 'Alberto Martinez', email: 'albertomartinez@priorityfinancial.net', folder: 'Alberto_Martinez' }
];

// Keywords for smart labeling
const TOPIC_KEYWORDS = {
  'Override': ['override', 'overide', 'bps', 'margin'],
  'Recruitment': ['recruit', 'onboard', 'hire', 'new lo', 'candidate'],
  'Compensation': ['comp', 'salary', 'bonus', 'pay', 'commission', 'tier'],
  'Contract': ['contract', 'agreement', 'addendum', 'docusign'],
  'Branch': ['branch', 'office', 'location'],
  'Loan': ['loan', 'file', 'borrower', 'closing', 'funding'],
  'HR': ['hr', 'human resources', 'employment', 'termination'],
  'Pricing': ['pricing', 'lock', 'rate', 'optimal blue'],
  'Compliance': ['compliance', 'nmls', 'license', 'audit'],
  'General': [] // Fallback
};

// ============================================
// UTILITIES
// ============================================

function log(step, message) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] [${step}] ${message}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 80);
}

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/=3D/g, '=')
    .replace(/=E2=80=99/g, "'")
    .replace(/=E2=80=9C/g, '"')
    .replace(/=E2=80=9D/g, '"')
    .replace(/=C2=A0/g, ' ');
}

function decodeBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

function cleanEmailBody(body) {
  // Check if body appears to be base64 (long lines of alphanumeric + /+=)
  const lines = body.split('\n').filter(l => l.trim());
  const base64Pattern = /^[A-Za-z0-9+/=\s]+$/;

  // If most lines look like base64, try to decode
  const base64Lines = lines.filter(l => base64Pattern.test(l.trim()) && l.trim().length > 50);
  if (base64Lines.length > lines.length * 0.5 && base64Lines.length > 3) {
    const combined = base64Lines.join('');
    const decoded = decodeBase64(combined);
    if (decoded && decoded.length > 50 && !decoded.includes('\ufffd')) {
      body = decoded;
    }
  }

  return body
    .replace(/Content-Type:.*$/gm, '')
    .replace(/Content-Transfer-Encoding:.*$/gm, '')
    .replace(/boundary="?[^"\s]+"?/gm, '')
    .replace(/--[a-zA-Z0-9_=-]+/gm, '')
    .replace(/charset="?[^"\s]+"?/gm, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .split('\n')
    .map(line => decodeQuotedPrintable(line))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function detectTopic(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.length === 0) continue;
    if (keywords.some(kw => text.includes(kw))) {
      return topic;
    }
  }
  return 'General';
}

function parseDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function formatDate(date) {
  if (!date) return 'Unknown_Date';
  return date.toISOString().substring(0, 10); // YYYY-MM-DD
}

// ============================================
// STEP 1: EXTRACT EMAILS
// ============================================

async function extractEmailsForContact(targetEmail, targetName) {
  log('EXTRACT', `Scanning mbox for ${targetName}...`);

  const emails = [];
  const targetLower = targetEmail.toLowerCase();

  const rl = readline.createInterface({
    input: fs.createReadStream(CONFIG.MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = { from: '', to: '', cc: '', subject: '', date: '', body: [] };
  let inHeaders = false;
  let inBody = false;
  let emailCount = 0;

  for await (const line of rl) {
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (currentEmail.from || currentEmail.to) {
        const from = currentEmail.from.toLowerCase();
        const to = currentEmail.to.toLowerCase();
        const cc = currentEmail.cc.toLowerCase();

        if (from.includes(targetLower) || to.includes(targetLower) || cc.includes(targetLower)) {
          emails.push({
            date: currentEmail.date,
            from: currentEmail.from,
            to: currentEmail.to,
            cc: currentEmail.cc,
            subject: currentEmail.subject || '(No Subject)',
            body: currentEmail.body.join('\n')
          });
        }
      }

      emailCount++;
      if (emailCount % 5000 === 0) {
        process.stdout.write('.');
      }

      currentEmail = { from: '', to: '', cc: '', subject: '', date: '', body: [] };
      inHeaders = true;
      inBody = false;
      continue;
    }

    if (line === '' && inHeaders) {
      inHeaders = false;
      inBody = true;
      continue;
    }

    if (inHeaders) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('from:')) currentEmail.from = line.substring(5).trim();
      else if (lowerLine.startsWith('to:')) currentEmail.to = line.substring(3).trim();
      else if (lowerLine.startsWith('cc:')) currentEmail.cc = line.substring(3).trim();
      else if (lowerLine.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
      else if (lowerLine.startsWith('date:')) currentEmail.date = line.substring(5).trim();
    }

    if (inBody && currentEmail.body.length < 100) {
      currentEmail.body.push(line);
    }
  }

  // Process last email
  if (currentEmail.from || currentEmail.to) {
    const from = currentEmail.from.toLowerCase();
    const to = currentEmail.to.toLowerCase();
    const cc = currentEmail.cc.toLowerCase();

    if (from.includes(targetLower) || to.includes(targetLower) || cc.includes(targetLower)) {
      emails.push({
        date: currentEmail.date,
        from: currentEmail.from,
        to: currentEmail.to,
        cc: currentEmail.cc,
        subject: currentEmail.subject || '(No Subject)',
        body: currentEmail.body.join('\n')
      });
    }
  }

  console.log('');
  log('EXTRACT', `Found ${emails.length} emails for ${targetName}`);

  return emails;
}

// ============================================
// STEP 2: GENERATE HTML FILES
// ============================================

function generateEmailHTML(email, contactName) {
  const cleanBody = cleanEmailBody(email.body);
  const date = parseDate(email.date);
  const formattedDate = date ? date.toLocaleString() : email.date;

  // Determine if email is inbound or outbound
  const isFromDavid = email.from.toLowerCase().includes('davidyoung') ||
                      email.from.toLowerCase().includes('dyoung');
  const direction = isFromDavid ? '📤 SENT' : '📥 RECEIVED';
  const directionClass = isFromDavid ? 'outbound' : 'inbound';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${email.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .email-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .direction {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .outbound { background: #e3f2fd; color: #1565c0; }
    .inbound { background: #e8f5e9; color: #2e7d32; }
    .subject {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 10px 0;
    }
    .meta {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .meta strong { color: #333; }
    .body {
      padding: 20px;
      line-height: 1.6;
      white-space: pre-wrap;
      font-size: 14px;
    }
    .footer {
      padding: 15px 20px;
      background: #fafafa;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #888;
    }
    .copy-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .copy-btn:hover { background: #1565c0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <span class="direction ${directionClass}">${direction}</span>
      <div class="subject">${email.subject}</div>
      <div class="meta">
        <strong>Date:</strong> ${formattedDate}<br>
        <strong>From:</strong> ${email.from}<br>
        <strong>To:</strong> ${email.to}
        ${email.cc ? `<br><strong>CC:</strong> ${email.cc}` : ''}
      </div>
      <button class="copy-btn" onclick="copyBody()">📋 Copy Email Content</button>
    </div>
    <div class="body" id="email-body">${cleanBody}</div>
    <div class="footer">
      Contact: ${contactName} | Archived from Priority Financial correspondence
    </div>
  </div>
  <script>
    function copyBody() {
      const body = document.getElementById('email-body').innerText;
      navigator.clipboard.writeText(body).then(() => {
        alert('Email content copied to clipboard!');
      });
    }
  </script>
</body>
</html>`;
}

function generateContactIndex(contactName, emails, folder) {
  const sortedEmails = [...emails].sort((a, b) => {
    const dateA = parseDate(a.date) || new Date(0);
    const dateB = parseDate(b.date) || new Date(0);
    return dateB - dateA;
  });

  // Group by topic
  const byTopic = {};
  sortedEmails.forEach(email => {
    const topic = detectTopic(email.subject, email.body);
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(email);
  });

  let topicSections = '';
  for (const [topic, topicEmails] of Object.entries(byTopic)) {
    const emailLinks = topicEmails.map(email => {
      const date = parseDate(email.date);
      const dateStr = formatDate(date);
      const topic = detectTopic(email.subject, email.body);
      const filename = `${dateStr}_${topic}_${sanitizeFilename(email.subject)}.html`;
      const isFromDavid = email.from.toLowerCase().includes('davidyoung');
      const icon = isFromDavid ? '📤' : '📥';

      return `<li>${icon} <a href="${filename}">${email.subject}</a> <span class="date">${date ? date.toLocaleDateString() : 'Unknown'}</span></li>`;
    }).join('\n');

    topicSections += `
      <div class="topic-section">
        <h2>${topic} (${topicEmails.length})</h2>
        <ul>${emailLinks}</ul>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Archive - ${contactName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #1976d2;
      padding-bottom: 10px;
    }
    .stats {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .topic-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .topic-section h2 {
      color: #1976d2;
      margin-top: 0;
      font-size: 18px;
    }
    ul { list-style: none; padding: 0; }
    li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    li:last-child { border-bottom: none; }
    a {
      color: #1976d2;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .date {
      color: #888;
      font-size: 12px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <h1>📧 Email Archive: ${contactName}</h1>
  <div class="stats">
    <strong>Total Emails:</strong> ${emails.length} |
    <strong>Topics:</strong> ${Object.keys(byTopic).join(', ')}
  </div>
  ${topicSections}
</body>
</html>`;
}

async function generateHTMLFiles(emails, contact) {
  log('HTML', `Generating HTML files for ${contact.name}...`);

  const contactDir = path.join(CONFIG.OUTPUT_DIR, contact.folder);
  ensureDir(contactDir);

  // Sort by date
  const sortedEmails = [...emails].sort((a, b) => {
    const dateA = parseDate(a.date) || new Date(0);
    const dateB = parseDate(b.date) || new Date(0);
    return dateB - dateA;
  });

  // Limit emails
  const emailsToProcess = sortedEmails.slice(0, CONFIG.MAX_EMAILS_PER_CONTACT);

  // Generate individual HTML files
  const processedEmails = [];
  for (const email of emailsToProcess) {
    const date = parseDate(email.date);
    const dateStr = formatDate(date);
    const topic = detectTopic(email.subject, email.body);
    const filename = `${dateStr}_${topic}_${sanitizeFilename(email.subject)}.html`;
    const filepath = path.join(contactDir, filename);

    const html = generateEmailHTML(email, contact.name);
    fs.writeFileSync(filepath, html);

    processedEmails.push({
      ...email,
      filename,
      topic,
      parsedDate: date
    });
  }

  // Generate index
  const indexHtml = generateContactIndex(contact.name, processedEmails, contact.folder);
  fs.writeFileSync(path.join(contactDir, 'index.html'), indexHtml);

  log('HTML', `Created ${processedEmails.length} HTML files + index for ${contact.name}`);

  return processedEmails;
}

// ============================================
// STEP 3: GENERATE SUMMARIES
// ============================================

function generateConversationSummary(emails, contactName) {
  // Group by month
  const byMonth = {};

  emails.forEach(email => {
    const date = email.parsedDate || parseDate(email.date);
    if (!date) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(email);
  });

  // Build summary
  let summary = `📧 EMAIL CORRESPONDENCE SUMMARY\n`;
  summary += `Contact: ${contactName}\n`;
  summary += `Total Emails: ${emails.length}\n`;
  summary += `${'═'.repeat(40)}\n\n`;

  // Sort months descending
  const sortedMonths = Object.keys(byMonth).sort().reverse();

  for (const month of sortedMonths) {
    const monthEmails = byMonth[month];
    const [year, mon] = month.split('-');
    const monthName = new Date(year, mon - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    summary += `📅 ${monthName} (${monthEmails.length} emails)\n`;
    summary += `${'─'.repeat(30)}\n`;

    // Group by topic within month
    const byTopic = {};
    monthEmails.forEach(email => {
      const topic = email.topic || detectTopic(email.subject, email.body);
      if (!byTopic[topic]) byTopic[topic] = [];
      byTopic[topic].push(email);
    });

    for (const [topic, topicEmails] of Object.entries(byTopic)) {
      summary += `  [${topic}]\n`;
      topicEmails.slice(0, 5).forEach(email => {
        const isFromDavid = email.from.toLowerCase().includes('davidyoung');
        const arrow = isFromDavid ? '→' : '←';
        const shortSubject = email.subject.substring(0, 50);
        summary += `    ${arrow} ${shortSubject}\n`;
      });
      if (topicEmails.length > 5) {
        summary += `    ... and ${topicEmails.length - 5} more\n`;
      }
    }
    summary += '\n';
  }

  summary += `${'═'.repeat(40)}\n`;
  summary += `📁 Full emails saved to: email-archive/${emails[0]?.filename?.split('/')[0] || contactName}\n`;
  summary += `Open index.html to browse all emails\n`;

  return summary;
}

// ============================================
// STEP 4: PUSH TO GHL
// ============================================

function ghlRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + CONFIG.API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getOrCreateContact(name, email) {
  // Search for existing
  const searchRes = await ghlRequest('GET',
    `/contacts/?locationId=${CONFIG.LOCATION_ID}&query=${encodeURIComponent(email)}`);

  if (searchRes.data.contacts && searchRes.data.contacts.length > 0) {
    return searchRes.data.contacts[0];
  }

  // Create new
  const nameParts = name.split(' ');
  const createRes = await ghlRequest('POST', '/contacts/', {
    locationId: CONFIG.LOCATION_ID,
    email: email,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' '),
    tags: ['Priority Financial', 'Email Archive']
  });

  return createRes.data.contact || null;
}

async function addNoteToContact(contactId, noteBody) {
  const res = await ghlRequest('POST', `/contacts/${contactId}/notes`, {
    body: noteBody
  });
  return res.status === 200 || res.status === 201;
}

async function pushSummaryToGHL(contact, summary) {
  log('GHL', `Pushing summary to GHL for ${contact.name}...`);

  const ghlContact = await getOrCreateContact(contact.name, contact.email);
  if (!ghlContact) {
    log('GHL', `ERROR: Could not find/create contact for ${contact.name}`);
    return false;
  }

  const success = await addNoteToContact(ghlContact.id, summary);
  if (success) {
    log('GHL', `Added summary note to ${contact.name} (${ghlContact.id})`);
  } else {
    log('GHL', `ERROR: Failed to add note for ${contact.name}`);
  }

  return success;
}

// ============================================
// MAIN WORKFLOW ORCHESTRATOR
// ============================================

async function runWorkflow(options = {}) {
  const { preview = false, contacts = TARGET_CONTACTS } = options;

  console.log('\n' + '═'.repeat(60));
  console.log('  EMAIL ARCHIVE WORKFLOW AGENT');
  console.log('═'.repeat(60));
  console.log(`\nMode: ${preview ? 'PREVIEW (no changes)' : 'EXECUTE'}`);
  console.log(`Contacts: ${contacts.map(c => c.name).join(', ')}`);
  console.log(`Output: ${CONFIG.OUTPUT_DIR}`);
  console.log('');

  const results = [];

  for (const contact of contacts) {
    console.log('\n' + '─'.repeat(60));
    console.log(`PROCESSING: ${contact.name}`);
    console.log('─'.repeat(60));

    // Step 1: Extract emails
    const emails = await extractEmailsForContact(contact.email, contact.name);

    if (emails.length === 0) {
      log('SKIP', `No emails found for ${contact.name}`);
      continue;
    }

    if (preview) {
      log('PREVIEW', `Would create ${Math.min(emails.length, CONFIG.MAX_EMAILS_PER_CONTACT)} HTML files`);
      log('PREVIEW', `Would push summary to GHL`);

      // Show sample topics
      const topics = {};
      emails.slice(0, 20).forEach(e => {
        const topic = detectTopic(e.subject, e.body);
        topics[topic] = (topics[topic] || 0) + 1;
      });
      log('PREVIEW', `Sample topics: ${JSON.stringify(topics)}`);

      results.push({ contact: contact.name, emails: emails.length, status: 'preview' });
      continue;
    }

    // Step 2: Generate HTML files
    const processedEmails = await generateHTMLFiles(emails, contact);

    // Step 3: Generate summary
    const summary = generateConversationSummary(processedEmails, contact.name);

    // Step 4: Push to GHL
    const ghlSuccess = await pushSummaryToGHL(contact, summary);

    results.push({
      contact: contact.name,
      emails: emails.length,
      htmlFiles: processedEmails.length,
      ghlSuccess,
      status: 'complete'
    });
  }

  // Final report
  console.log('\n' + '═'.repeat(60));
  console.log('  WORKFLOW COMPLETE');
  console.log('═'.repeat(60));
  console.log('\nResults:');
  results.forEach(r => {
    console.log(`  ${r.contact}: ${r.emails} emails → ${r.htmlFiles || 'N/A'} files, GHL: ${r.ghlSuccess ? '✓' : r.status}`);
  });

  // Save results
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'workflow-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n📁 Email archive: ${CONFIG.OUTPUT_DIR}`);
  console.log('Open each contact folder and click index.html to browse emails\n');

  return results;
}

// ============================================
// CLI INTERFACE
// ============================================

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
EMAIL ARCHIVE WORKFLOW AGENT

Usage:
  node email-archive-workflow.js [options]

Options:
  --preview     Show what would be done without making changes
  --execute     Run the full workflow
  --contact X   Process only contact X (Marc, Brenda, Anthony, Alberto)
  --help        Show this help

Examples:
  node email-archive-workflow.js --preview
  node email-archive-workflow.js --execute
  node email-archive-workflow.js --execute --contact Marc
`);
} else if (args.includes('--preview')) {
  runWorkflow({ preview: true }).catch(console.error);
} else if (args.includes('--execute')) {
  const contactArg = args.find((a, i) => args[i - 1] === '--contact');
  let contacts = TARGET_CONTACTS;

  if (contactArg) {
    const filtered = TARGET_CONTACTS.filter(c =>
      c.name.toLowerCase().includes(contactArg.toLowerCase())
    );
    if (filtered.length > 0) contacts = filtered;
  }

  runWorkflow({ preview: false, contacts }).catch(console.error);
} else {
  console.log('Use --preview to see what would happen, or --execute to run');
  console.log('Run with --help for more options');
}
