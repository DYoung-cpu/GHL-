#!/usr/bin/env node
/**
 * PFN Legal Document Discovery
 * Comprehensive extraction of evidence for David Young's PFN employment dispute
 * Date Range: 2023-2026
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MBOX_FILES = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

const OUTPUT_DIR = '/mnt/c/Users/dyoun/Downloads/PFN-Legal-Discovery';
const DATE_START = new Date('2023-01-01');
const DATE_END = new Date('2026-12-31');

// Search Categories with patterns
const CATEGORIES = {
  '01-DocuSign': {
    name: 'DocuSign/E-Signature',
    priority: 1,
    patterns: [
      /@docusign\.(net|com)/i,
      /@adobesign\.com/i,
      /Completed:.*Agreement/i,
      /Please sign:/i,
      /Signature Request/i,
      /Envelope ID/i,
      /All parties have signed/i,
      /Document has been completed/i,
      /ILO Compensation.*Agreement/i,
      /Performance Agreement/i,
      /DRE.*Compensation/i
    ]
  },
  '02-CloudDelivery': {
    name: 'ShareFile/Cloud Delivery',
    priority: 2,
    patterns: [
      /sharefile\.com/i,
      /citrix\.com/i,
      /drive\.google\.com\/file/i,
      /docs\.google\.com/i,
      /I've uploaded/i,
      /secure link/i,
      /file.*available.*download/i,
      /shared.*document.*with you/i
    ]
  },
  '03-HybridLO': {
    name: 'Hybrid LO Program',
    priority: 3,
    patterns: [
      /Hybrid\s*LO/i,
      /Hybrid Loan Officer/i,
      /\d+\s*bps/i,
      /basis\s*points/i,
      /margin\s*(sheet|adjustment)/i,
      /Alberto\s*Martinez/i,
      /Plan\s*Code/i,
      /broker\s*owner/i,
      /hang\s*license/i
    ]
  },
  '04-ModernSolar': {
    name: 'Modern/Solar/Affinity',
    priority: 4,
    patterns: [
      /Modern\s*Solar/i,
      /ModernSLR/i,
      /Solar\s*Lead/i,
      /Affinity\s*Program/i,
      /HELOC.*partner/i,
      /Lead_Management/i,
      /TYG.*PFN/i,
      /Young\s*Group.*Agreement/i,
      /25\s*bps/i,
      /\.25\s*(?:bps|percent)/i
    ]
  },
  '05-Recruiting': {
    name: 'Recruiting/Branch Overrides',
    priority: 5,
    patterns: [
      /recruiting\s*bonus/i,
      /hiring\s*bonus/i,
      /gold\s*tier/i,
      /silver\s*tier/i,
      /bronze\s*tier/i,
      /platinum\s*tier/i,
      /RETR\s*(List|Access)/i,
      /margin\s*sheet/i,
      /LOs?\s*Hired/i,
      /Recruitment\s*Numbers/i,
      /Branch\s*Manager/i
    ]
  },
  '06-Accounting': {
    name: 'Accounting & Payments',
    priority: 6,
    patterns: [
      /commission\s*(statement|paid|report)/i,
      /payout/i,
      /payment\s*received/i,
      /bonus\s*paid/i,
      /accounting.*override/i,
      /payroll/i,
      /filename="[^"]*\.(xlsx?|csv)"?/i
    ]
  },
  '07-Pipeline': {
    name: 'Pipeline & Loan Activity',
    priority: 7,
    patterns: [
      /loan\s*closed/i,
      /funded\s*loan/i,
      /clear\s*to\s*close/i,
      /\bCTC\b/,
      /lock\s*(confirm|rate)/i,
      /production\s*report/i,
      /volume\s*report/i
    ]
  }
};

// Key people for separate extraction
const KEY_PEOPLE = [
  { name: 'Brenda_Perry', pattern: /brenda.*perry|brenda@priorityfinancial|brendaperry/i },
  { name: 'Marc_Shenkman', pattern: /marc.*shenkman|marcshenkman@|marc@priorityfinancial/i },
  { name: 'Bryan_Campbell', pattern: /bryan.*campbell|bryancampbell/i },
  { name: 'Anthony_Amini', pattern: /anthony.*amini|anthonyamini/i },
  { name: 'Justin_Holland', pattern: /justin.*holland|justinholland/i },
  { name: 'Alberto_Martinez', pattern: /alberto.*martinez|albertomartinez/i },
  { name: 'Lock_Desk', pattern: /lock.*desk|lockdesk@/i }
];

// Stats tracking
const stats = {
  totalEmails: 0,
  matchedEmails: 0,
  attachmentsExtracted: 0,
  byCategory: {},
  byPerson: {}
};

// Initialize stats
Object.keys(CATEGORIES).forEach(cat => stats.byCategory[cat] = 0);
KEY_PEOPLE.forEach(p => stats.byPerson[p.name] = 0);

// Discovery index
const discoveryIndex = {
  generatedAt: new Date().toISOString(),
  dateRange: { start: '2023-01-01', end: '2026-12-31' },
  sources: MBOX_FILES,
  items: []
};

/**
 * Parse email date and check if in range
 */
function isInDateRange(dateStr) {
  if (!dateStr) return true; // Include if no date
  try {
    const date = new Date(dateStr);
    return date >= DATE_START && date <= DATE_END;
  } catch {
    return true; // Include if date parsing fails
  }
}

/**
 * Decode quoted-printable content
 */
function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extract email headers from content
 */
function extractHeaders(emailContent) {
  const headers = {};
  const headerSection = emailContent.split(/\r?\n\r?\n/)[0] || '';

  const patterns = {
    from: /^From: (.+)$/mi,
    to: /^To: (.+)$/mi,
    subject: /^Subject: (.+)$/mi,
    date: /^Date: (.+)$/mi,
    contentType: /^Content-Type: (.+)$/mi
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = headerSection.match(pattern);
    headers[key] = match ? match[1].trim() : '';
  }

  return headers;
}

/**
 * Extract and save attachment from email
 */
function extractAttachment(emailContent, emailId, category) {
  const attachments = [];

  // Find all attachments
  const filenamePattern = /filename="?([^"\r\n;]+\.(pdf|xlsx?|docx?|csv))"?/gi;
  let match;

  while ((match = filenamePattern.exec(emailContent)) !== null) {
    const filename = match[1];
    const filenameIdx = match.index;

    // Look for base64 encoding after filename
    const searchRegion = emailContent.substring(filenameIdx, filenameIdx + 2000);
    if (searchRegion.toLowerCase().includes('base64')) {
      const encodingIdx = emailContent.toLowerCase().indexOf('base64', filenameIdx);
      let contentStart = emailContent.indexOf('\n\n', encodingIdx);
      if (contentStart === -1) contentStart = emailContent.indexOf('\r\n\r\n', encodingIdx);

      if (contentStart !== -1) {
        // Find end boundary
        let contentEnd = emailContent.indexOf('\n--', contentStart + 2);
        if (contentEnd === -1) contentEnd = Math.min(contentStart + 500000, emailContent.length);

        const base64Content = emailContent.substring(contentStart + 2, contentEnd)
          .replace(/[\r\n\s]/g, '');

        if (base64Content.length > 1000) {
          try {
            const decoded = Buffer.from(base64Content, 'base64');
            const magic = decoded.slice(0, 4).toString('hex');

            // Validate file type
            const validMagic = ['504b', 'd0cf11e0', '25504446']; // ZIP/Office, OLE2, PDF
            if (validMagic.some(m => magic.startsWith(m.substring(0, 4)))) {
              const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
              const outputPath = path.join(OUTPUT_DIR, 'Attachments', `${emailId}-${safeName}`);

              fs.writeFileSync(outputPath, decoded);
              attachments.push({ filename: safeName, path: outputPath, size: decoded.length });
              stats.attachmentsExtracted++;
              console.log(`    ATTACHMENT: ${safeName} (${decoded.length} bytes)`);
            }
          } catch (e) {
            // Skip invalid attachments
          }
        }
      }
    }
  }

  return attachments;
}

/**
 * Check if email matches any category
 */
function categorizeEmail(emailContent) {
  const matches = [];

  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    for (const pattern of cat.patterns) {
      if (pattern.test(emailContent)) {
        matches.push(catId);
        break;
      }
    }
  }

  return matches;
}

/**
 * Check if email is from/to key people
 */
function checkKeyPeople(emailContent) {
  const matches = [];

  for (const person of KEY_PEOPLE) {
    if (person.pattern.test(emailContent)) {
      matches.push(person.name);
    }
  }

  return matches;
}

/**
 * Save email to appropriate folders
 */
function saveEmail(emailContent, headers, categories, people, emailId) {
  // Create HTML version with headers
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headers.subject || 'Email'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; }
    .headers { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .header-row { margin: 5px 0; }
    .label { font-weight: bold; color: #333; }
    .body { white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="headers">
    <div class="header-row"><span class="label">From:</span> ${headers.from || 'Unknown'}</div>
    <div class="header-row"><span class="label">To:</span> ${headers.to || 'Unknown'}</div>
    <div class="header-row"><span class="label">Date:</span> ${headers.date || 'Unknown'}</div>
    <div class="header-row"><span class="label">Subject:</span> ${headers.subject || 'No Subject'}</div>
    <div class="header-row"><span class="label">Categories:</span> ${categories.join(', ') || 'None'}</div>
  </div>
  <div class="body">${emailContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</body>
</html>`;

  const safeSubject = (headers.subject || 'email').substring(0, 50).replace(/[^a-zA-Z0-9 -]/g, '_');
  const dateStr = headers.date ? new Date(headers.date).toISOString().split('T')[0] : 'unknown-date';
  const filename = `${dateStr}_${safeSubject}_${emailId}.html`;

  // Save to each matched category
  for (const cat of categories) {
    const catPath = path.join(OUTPUT_DIR, cat, filename);
    fs.writeFileSync(catPath, htmlContent);
    stats.byCategory[cat]++;
  }

  // Save to key people folders
  for (const person of people) {
    const personPath = path.join(OUTPUT_DIR, '08-KeyPeople', person, filename);
    fs.writeFileSync(personPath, htmlContent);
    stats.byPerson[person]++;
  }

  // Extract attachments
  const attachments = extractAttachment(emailContent, emailId, categories[0] || 'Attachments');

  // Add to index
  discoveryIndex.items.push({
    id: emailId,
    date: headers.date,
    from: headers.from,
    to: headers.to,
    subject: headers.subject,
    categories,
    people,
    attachments: attachments.map(a => a.filename),
    savedAs: filename
  });
}

/**
 * Process a single mbox file
 */
async function processMbox(mboxPath) {
  console.log(`\nProcessing: ${path.basename(mboxPath)}`);
  console.log(`File size: ${(fs.statSync(mboxPath).size / 1024 / 1024 / 1024).toFixed(2)} GB`);

  const stream = fs.createReadStream(mboxPath, {
    encoding: 'utf8',
    highWaterMark: 50 * 1024 * 1024 // 50MB chunks
  });

  let buffer = '';
  let emailCount = 0;
  let processedBytes = 0;
  const fileSize = fs.statSync(mboxPath).size;

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      buffer += chunk;
      processedBytes += Buffer.byteLength(chunk);

      // Progress update every 500MB
      if (processedBytes % (500 * 1024 * 1024) < 50 * 1024 * 1024) {
        const progress = ((processedBytes / fileSize) * 100).toFixed(1);
        console.log(`  Progress: ${progress}% | Emails found: ${emailCount} | Matches: ${stats.matchedEmails}`);
      }

      // Split by email boundaries
      const emails = buffer.split(/\nFrom /);

      // Keep the last partial email in buffer
      buffer = emails.pop() || '';

      for (let email of emails) {
        if (!email.startsWith('From ')) email = 'From ' + email;

        stats.totalEmails++;
        const headers = extractHeaders(email);

        // Check date range
        if (!isInDateRange(headers.date)) continue;

        // Check categories
        const categories = categorizeEmail(email);
        const people = checkKeyPeople(email);

        if (categories.length > 0 || people.length > 0) {
          emailCount++;
          stats.matchedEmails++;
          const emailId = `email-${stats.matchedEmails}`;

          console.log(`  [${emailId}] ${headers.date} | ${headers.subject?.substring(0, 60) || 'No Subject'}`);
          console.log(`    Categories: ${categories.join(', ')} | People: ${people.join(', ')}`);

          saveEmail(email, headers, categories, people, emailId);
        }
      }

      // Memory management
      if (buffer.length > 150 * 1024 * 1024) {
        buffer = buffer.slice(-100 * 1024 * 1024);
      }
    });

    stream.on('end', () => {
      console.log(`\nCompleted: ${path.basename(mboxPath)}`);
      console.log(`  Emails scanned: ${stats.totalEmails}`);
      console.log(`  Matches found: ${emailCount}`);
      resolve();
    });

    stream.on('error', reject);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(70));
  console.log('PFN LEGAL DOCUMENT DISCOVERY');
  console.log('Date Range: 2023-01-01 to 2026-12-31');
  console.log('='.repeat(70));

  // Process each mbox file
  for (const mboxPath of MBOX_FILES) {
    if (fs.existsSync(mboxPath)) {
      await processMbox(mboxPath);
    } else {
      console.log(`\nSkipping (not found): ${mboxPath}`);
    }
  }

  // Save discovery index
  const indexPath = path.join(OUTPUT_DIR, 'DISCOVERY_INDEX.json');
  fs.writeFileSync(indexPath, JSON.stringify(discoveryIndex, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(70));
  console.log(`\nTotal emails scanned: ${stats.totalEmails}`);
  console.log(`Total matches: ${stats.matchedEmails}`);
  console.log(`Attachments extracted: ${stats.attachmentsExtracted}`);

  console.log('\nBy Category:');
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    if (count > 0) {
      console.log(`  ${cat}: ${count}`);
    }
  }

  console.log('\nBy Key Person:');
  for (const [person, count] of Object.entries(stats.byPerson)) {
    if (count > 0) {
      console.log(`  ${person}: ${count}`);
    }
  }

  console.log(`\nIndex saved to: ${indexPath}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
