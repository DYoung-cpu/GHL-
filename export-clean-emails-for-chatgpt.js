const fs = require('fs');
const path = require('path');

const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads/PFN-Email-Export';

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Email storage by correspondent
const emailsByCorrespondent = {};
let totalEmails = 0;
let skippedEmails = 0;

// Skip patterns for spam/promotional/drafts
const skipPatterns = [
  /^X-Gmail-Labels:.*Spam/i,
  /^X-Gmail-Labels:.*Draft/i,
  /^X-Gmail-Labels:.*Trash/i,
  /noreply@/i,
  /no-reply@/i,
  /mailer-daemon/i,
  /postmaster@/i,
  /unsubscribe/i,
  /marketing@/i,
  /newsletter@/i,
  /notifications@/i,
  /donotreply@/i,
  /automated@/i,
  /@linkedin\.com/i,
  /@facebook\.com/i,
  /@twitter\.com/i,
  /@facebookmail\.com/i,
  /calendar-notification/i,
  /@docusign\.net/i,
  /@e\.docusign/i,
  /@notifications\./i,
  /mailchimp/i,
  /constantcontact/i,
  /sendgrid/i,
  /amazonses/i,
  /@bounce\./i,
];

// Priority domains to keep (PFN related)
const priorityDomains = [
  'priorityfinancial.net',
  'lendwisemtg.com',
  'gmail.com', // personal emails
];

function decodeQuotedPrintable(str) {
  if (!str) return '';
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBase64(str) {
  if (!str) return '';
  try {
    return Buffer.from(str.replace(/\s/g, ''), 'base64').toString('utf8');
  } catch {
    return str;
  }
}

function extractEmailAddress(str) {
  if (!str) return '';
  const match = str.match(/<([^>]+)>/) || str.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
}

function extractName(str) {
  if (!str) return '';
  const match = str.match(/^([^<]+)</);
  if (match) return match[1].replace(/"/g, '').trim();
  return '';
}

function shouldSkipEmail(headers, from, to) {
  // Check skip patterns
  for (const pattern of skipPatterns) {
    if (pattern.test(headers) || pattern.test(from) || pattern.test(to)) {
      return true;
    }
  }
  return false;
}

function extractTextBody(email) {
  let body = '';

  // Try text/plain first
  const plainMatch = email.match(/Content-Type:\s*text\/plain[^]*?(?:\r?\n\r?\n)([\s\S]*?)(?=\r?\n--|\r?\nFrom\s|$)/i);
  if (plainMatch) {
    body = plainMatch[1];
  } else {
    // Try text/html and strip tags
    const htmlMatch = email.match(/Content-Type:\s*text\/html[^]*?(?:\r?\n\r?\n)([\s\S]*?)(?=\r?\n--|\r?\nFrom\s|$)/i);
    if (htmlMatch) {
      body = htmlMatch[1]
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    }
  }

  // Decode if needed
  if (email.includes('Content-Transfer-Encoding: quoted-printable')) {
    body = decodeQuotedPrintable(body);
  } else if (email.includes('Content-Transfer-Encoding: base64')) {
    body = decodeBase64(body);
  }

  // Clean up
  body = body
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 10000); // Limit body size

  return body;
}

function parseEmail(emailContent) {
  const headers = emailContent.substring(0, 5000);

  // Extract fields
  const fromMatch = headers.match(/^From:\s*(.+)$/m);
  const toMatch = headers.match(/^To:\s*(.+)$/m);
  const ccMatch = headers.match(/^Cc:\s*(.+)$/m);
  const subjectMatch = headers.match(/^Subject:\s*(.+)$/m);
  const dateMatch = headers.match(/^Date:\s*(.+)$/m);

  const from = fromMatch ? fromMatch[1].trim() : '';
  const to = toMatch ? toMatch[1].trim() : '';
  const cc = ccMatch ? ccMatch[1].trim() : '';
  const subject = subjectMatch ? decodeQuotedPrintable(subjectMatch[1].trim()) : '';
  const date = dateMatch ? dateMatch[1].trim() : '';

  // Skip if matches skip patterns
  if (shouldSkipEmail(headers, from, to)) {
    return null;
  }

  const fromEmail = extractEmailAddress(from);
  const fromName = extractName(from) || fromEmail;
  const toEmail = extractEmailAddress(to);
  const toName = extractName(to) || toEmail;

  // Determine correspondent (the other party)
  let correspondent = '';
  const davidEmails = ['davidyoung@priorityfinancial.net', 'david@lendwisemtg.com', 'davidyoung.lmc@gmail.com'];

  if (davidEmails.some(e => fromEmail.includes(e.split('@')[0]))) {
    // David sent this - correspondent is recipient
    correspondent = toEmail || 'unknown';
  } else {
    // David received this - correspondent is sender
    correspondent = fromEmail || 'unknown';
  }

  // Extract body
  const body = extractTextBody(emailContent);

  return {
    from: fromName,
    fromEmail,
    to: toName,
    toEmail,
    cc,
    subject,
    date,
    body,
    correspondent
  };
}

function formatEmailForExport(email) {
  return `
================================================================================
DATE: ${email.date}
FROM: ${email.from} <${email.fromEmail}>
TO: ${email.to} <${email.toEmail}>
${email.cc ? `CC: ${email.cc}\n` : ''}SUBJECT: ${email.subject}
--------------------------------------------------------------------------------
${email.body}
================================================================================

`;
}

console.log('Starting PFN Email Export for ChatGPT...');
console.log('Reading mbox file (this may take several minutes)...\n');

// Process in chunks
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
const fd = fs.openSync(mboxPath, 'r');
const stats = fs.statSync(mboxPath);
const fileSize = stats.size;

let position = 0;
let buffer = Buffer.alloc(CHUNK_SIZE + 100000); // Extra for overlap
let leftover = '';
let emailCount = 0;
let processedMB = 0;

console.log(`File size: ${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`);

while (position < fileSize) {
  const bytesToRead = Math.min(CHUNK_SIZE, fileSize - position);
  const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, position);

  let content = leftover + buffer.toString('utf8', 0, bytesRead);

  // Split by email boundaries
  const emails = content.split(/\nFrom /);

  // Keep last partial email for next chunk
  if (position + bytesRead < fileSize) {
    leftover = 'From ' + emails.pop();
  } else {
    leftover = '';
  }

  // Process emails
  for (let i = 0; i < emails.length; i++) {
    let emailContent = emails[i];
    if (i > 0 || position === 0) {
      emailContent = (i === 0 && position === 0) ? emailContent : 'From ' + emailContent;
    }

    if (emailContent.length < 100) continue;

    try {
      const parsed = parseEmail(emailContent);
      if (parsed && parsed.subject && parsed.body.length > 50) {
        const correspondent = parsed.correspondent.replace(/[^a-zA-Z0-9@._-]/g, '_').substring(0, 50);

        if (!emailsByCorrespondent[correspondent]) {
          emailsByCorrespondent[correspondent] = [];
        }
        emailsByCorrespondent[correspondent].push(parsed);
        totalEmails++;
      } else {
        skippedEmails++;
      }
    } catch (e) {
      skippedEmails++;
    }

    emailCount++;
  }

  position += bytesRead;
  processedMB = Math.floor(position / 1024 / 1024);

  if (processedMB % 500 === 0) {
    console.log(`Processed: ${processedMB} MB / ${Math.floor(fileSize / 1024 / 1024)} MB (${Object.keys(emailsByCorrespondent).length} correspondents, ${totalEmails} emails kept)`);
  }
}

fs.closeSync(fd);

console.log('\n========================================');
console.log(`Total emails processed: ${emailCount}`);
console.log(`Emails kept: ${totalEmails}`);
console.log(`Emails skipped: ${skippedEmails}`);
console.log(`Unique correspondents: ${Object.keys(emailsByCorrespondent).length}`);
console.log('========================================\n');

// Sort correspondents by email count
const sortedCorrespondents = Object.entries(emailsByCorrespondent)
  .sort((a, b) => b[1].length - a[1].length);

// Write files - split by correspondent, max 20MB per file
console.log('Writing export files...\n');

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file for easy upload
let fileIndex = 1;
let currentFileContent = '';
let currentFileSize = 0;
let filesCreated = [];

// Create index file
let indexContent = `# PFN Email Export Index
Generated: ${new Date().toISOString()}
Total Emails: ${totalEmails}
Correspondents: ${sortedCorrespondents.length}

## Correspondents by Email Count:\n\n`;

for (const [correspondent, emails] of sortedCorrespondents) {
  indexContent += `- ${correspondent}: ${emails.length} emails\n`;

  // Sort emails by date
  emails.sort((a, b) => new Date(a.date) - new Date(b.date));

  const correspondentHeader = `\n\n${'#'.repeat(80)}\n# CORRESPONDENT: ${correspondent}\n# Total emails: ${emails.length}\n${'#'.repeat(80)}\n\n`;

  let correspondentContent = correspondentHeader;

  for (const email of emails) {
    const formatted = formatEmailForExport(email);
    correspondentContent += formatted;
  }

  // Check if adding this would exceed file size
  if (currentFileSize + correspondentContent.length > MAX_FILE_SIZE && currentFileContent.length > 0) {
    // Write current file
    const filename = `pfn-emails-part${String(fileIndex).padStart(3, '0')}.txt`;
    fs.writeFileSync(path.join(outputDir, filename), currentFileContent);
    filesCreated.push(filename);
    console.log(`Created: ${filename} (${(currentFileSize / 1024 / 1024).toFixed(2)} MB)`);

    fileIndex++;
    currentFileContent = '';
    currentFileSize = 0;
  }

  currentFileContent += correspondentContent;
  currentFileSize += correspondentContent.length;
}

// Write final file
if (currentFileContent.length > 0) {
  const filename = `pfn-emails-part${String(fileIndex).padStart(3, '0')}.txt`;
  fs.writeFileSync(path.join(outputDir, filename), currentFileContent);
  filesCreated.push(filename);
  console.log(`Created: ${filename} (${(currentFileSize / 1024 / 1024).toFixed(2)} MB)`);
}

// Write index
fs.writeFileSync(path.join(outputDir, 'INDEX.md'), indexContent);
console.log('\nCreated: INDEX.md');

// Write summary
const summary = `# PFN Email Export Summary

## Export Details
- Date: ${new Date().toISOString()}
- Total Emails Extracted: ${totalEmails}
- Emails Skipped (spam/promotional): ${skippedEmails}
- Unique Correspondents: ${sortedCorrespondents.length}
- Files Created: ${filesCreated.length}

## Files
${filesCreated.map(f => `- ${f}`).join('\n')}

## Top 20 Correspondents
${sortedCorrespondents.slice(0, 20).map(([c, e]) => `- ${c}: ${e.length} emails`).join('\n')}

## How to Use with ChatGPT
1. Upload files one at a time (start with INDEX.md)
2. Each file is under 20MB for easy upload
3. Ask ChatGPT to search for specific topics, people, or dates
4. Files are organized by correspondent for easy reference

## Key People at PFN
- Marc Shenkman (marcshenkman@priorityfinancial.net) - Owner
- Brenda Perry (brenda@priorityfinancial.net) - HR/Operations
- Lock Desk (lockdesk@priorityfinancial.net) - Pricing/Tiers
- David Young (davidyoung@priorityfinancial.net) - You
`;

fs.writeFileSync(path.join(outputDir, 'SUMMARY.md'), summary);
console.log('Created: SUMMARY.md');

console.log('\n========================================');
console.log('EXPORT COMPLETE!');
console.log(`Output folder: ${outputDir}`);
console.log(`Files created: ${filesCreated.length + 2}`);
console.log('========================================');
