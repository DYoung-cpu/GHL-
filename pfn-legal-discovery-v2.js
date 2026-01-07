#!/usr/bin/env node
/**
 * PFN Legal Document Discovery V2 - Memory Optimized
 * Processes mbox files with minimal memory usage
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const MBOX_FILES = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

const OUTPUT_DIR = '/mnt/c/Users/dyoun/Downloads/PFN-Legal-Discovery';
const DATE_START = new Date('2023-01-01');
const DATE_END = new Date('2026-12-31');

// Stats
let stats = { total: 0, matched: 0, attachments: 0 };

// Search patterns - simplified for memory efficiency
const PATTERNS = {
  docusign: [/@docusign/i, /@adobesign/i, /Completed:.*Agreement/i, /Please sign:/i, /Envelope ID/i],
  cloud: [/sharefile\.com/i, /drive\.google\.com/i, /uploaded/i, /secure link/i],
  hybrid: [/Hybrid\s*LO/i, /\d+\s*bps/i, /basis\s*points/i, /margin/i, /Plan\s*Code/i],
  modern: [/Modern\s*Solar/i, /ModernSLR/i, /Solar/i, /Affinity/i, /HELOC/i],
  recruiting: [/recruiting/i, /gold\s*tier/i, /silver\s*tier/i, /bronze\s*tier/i, /LOs\s*Hired/i],
  accounting: [/commission/i, /payout/i, /payment/i, /bonus/i, /payroll/i],
  pipeline: [/loan\s*closed/i, /funded/i, /clear\s*to\s*close/i, /CTC/i, /lock/i]
};

const KEY_PEOPLE = {
  'Brenda_Perry': /brenda.*perry|brenda@priorityfinancial/i,
  'Marc_Shenkman': /marc.*shenkman|marcshenkman@|marc@priorityfinancial/i,
  'Bryan_Campbell': /bryan.*campbell/i,
  'Anthony_Amini': /anthony.*amini/i,
  'Justin_Holland': /justin.*holland/i,
  'Alberto_Martinez': /alberto.*martinez/i,
  'Lock_Desk': /lock.*desk|lockdesk@/i
};

const CATEGORY_MAP = {
  docusign: '01-DocuSign',
  cloud: '02-CloudDelivery',
  hybrid: '03-HybridLO',
  modern: '04-ModernSolar',
  recruiting: '05-Recruiting',
  accounting: '06-Accounting',
  pipeline: '07-Pipeline'
};

/**
 * Check if date is in range
 */
function isInDateRange(dateStr) {
  if (!dateStr) return true;
  try {
    const date = new Date(dateStr);
    return date >= DATE_START && date <= DATE_END;
  } catch { return true; }
}

/**
 * Extract and save attachment
 */
function extractAttachment(content, emailId) {
  const filenameMatch = content.match(/filename="?([^"\r\n;]+\.(pdf|xlsx?|docx?|csv))"?/i);
  if (!filenameMatch) return null;

  const filename = filenameMatch[1];
  const filenameIdx = filenameMatch.index;

  // Find base64 content
  const searchRegion = content.substring(filenameIdx, Math.min(filenameIdx + 2000, content.length));
  if (!searchRegion.toLowerCase().includes('base64')) return null;

  const encodingIdx = content.toLowerCase().indexOf('base64', filenameIdx);
  let contentStart = content.indexOf('\n\n', encodingIdx);
  if (contentStart === -1) contentStart = content.indexOf('\r\n\r\n', encodingIdx);
  if (contentStart === -1) return null;

  // Find end boundary
  let contentEnd = content.indexOf('\n--', contentStart + 2);
  if (contentEnd === -1) contentEnd = Math.min(contentStart + 500000, content.length);

  const base64Content = content.substring(contentStart + 2, contentEnd).replace(/[\r\n\s]/g, '');
  if (base64Content.length < 1000) return null;

  try {
    const decoded = Buffer.from(base64Content, 'base64');
    const magic = decoded.slice(0, 4).toString('hex');

    if (!['504b', 'd0cf', '2550'].some(m => magic.startsWith(m))) return null;

    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const outputPath = path.join(OUTPUT_DIR, 'Attachments', `${emailId}-${safeName}`);

    fs.writeFileSync(outputPath, decoded);
    stats.attachments++;
    console.log(`    ATTACHMENT: ${safeName}`);
    return safeName;
  } catch { return null; }
}

/**
 * Process single email
 */
function processEmail(emailContent, emailId) {
  // Extract headers
  const headers = {};
  const headerMatch = {
    from: /^From: (.+)$/mi,
    to: /^To: (.+)$/mi,
    subject: /^Subject: (.+)$/mi,
    date: /^Date: (.+)$/mi
  };

  for (const [key, pattern] of Object.entries(headerMatch)) {
    const match = emailContent.match(pattern);
    headers[key] = match ? match[1].trim() : '';
  }

  // Check date range
  if (!isInDateRange(headers.date)) return false;

  // Check categories
  const matchedCategories = [];
  for (const [cat, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(emailContent)) {
        matchedCategories.push(CATEGORY_MAP[cat]);
        break;
      }
    }
  }

  // Check key people
  const matchedPeople = [];
  for (const [person, pattern] of Object.entries(KEY_PEOPLE)) {
    if (pattern.test(emailContent)) {
      matchedPeople.push(person);
    }
  }

  if (matchedCategories.length === 0 && matchedPeople.length === 0) return false;

  stats.matched++;

  // Log progress
  const shortSubject = (headers.subject || 'No Subject').substring(0, 50);
  console.log(`  [${emailId}] ${headers.date || 'Unknown'} | ${shortSubject}`);
  console.log(`    Categories: ${matchedCategories.join(', ')} | People: ${matchedPeople.join(', ')}`);

  // Create HTML content
  const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${headers.subject || 'Email'}</title>
<style>body{font-family:Arial;max-width:900px;margin:20px auto;padding:20px}
.h{background:#f5f5f5;padding:15px;margin-bottom:20px;border-radius:5px}
.r{margin:5px 0}.l{font-weight:bold}.b{white-space:pre-wrap}</style></head>
<body><div class="h">
<div class="r"><span class="l">From:</span> ${headers.from || 'Unknown'}</div>
<div class="r"><span class="l">To:</span> ${headers.to || 'Unknown'}</div>
<div class="r"><span class="l">Date:</span> ${headers.date || 'Unknown'}</div>
<div class="r"><span class="l">Subject:</span> ${headers.subject || 'No Subject'}</div>
</div><div class="b">${emailContent.substring(0, 50000).replace(/</g, '&lt;')}</div></body></html>`;

  const dateStr = headers.date ? new Date(headers.date).toISOString().split('T')[0] : 'unknown';
  const safeSubject = (headers.subject || 'email').substring(0, 40).replace(/[^a-zA-Z0-9 -]/g, '_');
  const filename = `${dateStr}_${safeSubject}_${emailId}.html`;

  // Save to categories
  for (const cat of matchedCategories) {
    fs.writeFileSync(path.join(OUTPUT_DIR, cat, filename), htmlContent);
  }

  // Save to people folders
  for (const person of matchedPeople) {
    fs.writeFileSync(path.join(OUTPUT_DIR, '08-KeyPeople', person, filename), htmlContent);
  }

  // Extract attachments
  extractAttachment(emailContent, emailId);

  return true;
}

/**
 * Process mbox file line by line
 */
async function processMbox(mboxPath) {
  console.log(`\nProcessing: ${path.basename(mboxPath)}`);
  const fileSize = fs.statSync(mboxPath).size;
  console.log(`File size: ${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`);

  const fileStream = fs.createReadStream(mboxPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentEmail = '';
  let emailCount = 0;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Progress every 1M lines
    if (lineCount % 1000000 === 0) {
      console.log(`  Lines: ${(lineCount / 1000000).toFixed(1)}M | Emails: ${emailCount} | Matches: ${stats.matched}`);
    }

    // Check for email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (currentEmail.length > 100) {
        stats.total++;
        emailCount++;
        processEmail(currentEmail, `email-${emailCount}`);

        // Memory cleanup
        if (emailCount % 100 === 0) {
          if (global.gc) global.gc();
        }
      }
      currentEmail = line + '\n';
    } else {
      // Limit email size to prevent memory issues
      if (currentEmail.length < 2000000) {
        currentEmail += line + '\n';
      }
    }
  }

  // Process last email
  if (currentEmail.length > 100) {
    stats.total++;
    emailCount++;
    processEmail(currentEmail, `email-${emailCount}`);
  }

  console.log(`Completed: ${emailCount} emails processed`);
}

/**
 * Main
 */
async function main() {
  console.log('=' .repeat(60));
  console.log('PFN LEGAL DOCUMENT DISCOVERY V2 - Memory Optimized');
  console.log('=' .repeat(60));

  for (const mboxPath of MBOX_FILES) {
    if (fs.existsSync(mboxPath)) {
      await processMbox(mboxPath);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total emails: ${stats.total}`);
  console.log(`Matches: ${stats.matched}`);
  console.log(`Attachments: ${stats.attachments}`);
}

main().catch(console.error);
