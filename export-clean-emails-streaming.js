const fs = require('fs');
const path = require('path');
const readline = require('readline');

const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const outputDir = '/mnt/c/Users/dyoun/Downloads/PFN-Email-Export';

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Skip patterns for spam/promotional/drafts
const skipPatterns = [
  /Spam/i,
  /Draft/i,
  /noreply@/i,
  /no-reply@/i,
  /mailer-daemon/i,
  /postmaster@/i,
  /marketing@/i,
  /newsletter@/i,
  /notifications@/i,
  /donotreply@/i,
  /@linkedin\.com/i,
  /@facebook\.com/i,
  /@twitter\.com/i,
  /@facebookmail\.com/i,
  /calendar-notification/i,
  /@notifications\./i,
  /mailchimp/i,
  /constantcontact/i,
  /sendgrid/i,
  /@bounce\./i,
  /automated@/i,
  /promo@/i,
  /deals@/i,
  /offers@/i,
  /sales@/i,
  /info@.*\.com/i,
  /support@/i,
];

// Track correspondents for index
const correspondentCounts = {};
let totalEmails = 0;
let skippedEmails = 0;
let currentFileIndex = 1;
let currentFileSize = 0;
let currentFileStream = null;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file

function createNewFile() {
  if (currentFileStream) {
    currentFileStream.end();
  }
  const filename = `pfn-emails-part${String(currentFileIndex).padStart(3, '0')}.txt`;
  currentFileStream = fs.createWriteStream(path.join(outputDir, filename));
  currentFileStream.write(`# PFN Email Export - Part ${currentFileIndex}\n`);
  currentFileStream.write(`# Generated: ${new Date().toISOString()}\n\n`);
  console.log(`Creating: ${filename}`);
  currentFileIndex++;
  currentFileSize = 100;
}

function decodeQuotedPrintable(str) {
  if (!str) return '';
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
}

function extractEmailAddress(str) {
  if (!str) return '';
  const match = str.match(/<([^>]+)>/) || str.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
}

function shouldSkipEmail(from, to, labels) {
  const combined = `${from} ${to} ${labels}`;
  for (const pattern of skipPatterns) {
    if (pattern.test(combined)) {
      return true;
    }
  }
  return false;
}

function extractBody(lines, startIdx) {
  let body = '';
  let inBody = false;
  let encoding = 'none';
  let contentType = '';

  for (let i = startIdx; i < lines.length && body.length < 5000; i++) {
    const line = lines[i];

    if (line.startsWith('Content-Transfer-Encoding:')) {
      encoding = line.includes('quoted-printable') ? 'qp' : line.includes('base64') ? 'base64' : 'none';
    }
    if (line.startsWith('Content-Type:')) {
      contentType = line;
    }

    if (line === '' && !inBody) {
      inBody = true;
      continue;
    }

    if (inBody) {
      if (line.startsWith('--') && line.length > 10) {
        // Boundary - might be end of section
        if (body.length > 100) break;
        inBody = false;
        continue;
      }
      body += line + '\n';
    }
  }

  if (encoding === 'qp') {
    body = decodeQuotedPrintable(body);
  }

  // Strip HTML if present
  if (contentType.includes('html') || body.includes('<html') || body.includes('<div')) {
    body = body
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ');
  }

  return body.trim().substring(0, 3000);
}

function processEmail(emailLines) {
  if (emailLines.length < 5) return null;

  let from = '', to = '', cc = '', subject = '', date = '', labels = '';

  // Parse headers (first 100 lines max)
  for (let i = 0; i < Math.min(100, emailLines.length); i++) {
    const line = emailLines[i];
    if (line === '') break; // End of headers

    if (line.startsWith('From:')) from = line.substring(5).trim();
    else if (line.startsWith('To:')) to = line.substring(3).trim();
    else if (line.startsWith('Cc:')) cc = line.substring(3).trim();
    else if (line.startsWith('Subject:')) subject = decodeQuotedPrintable(line.substring(8).trim());
    else if (line.startsWith('Date:')) date = line.substring(5).trim();
    else if (line.startsWith('X-Gmail-Labels:')) labels = line.substring(15).trim();
  }

  if (!from || !subject) return null;
  if (shouldSkipEmail(from, to, labels)) return null;

  const fromEmail = extractEmailAddress(from);
  const body = extractBody(emailLines, 0);

  if (body.length < 50) return null;

  // Determine correspondent
  const davidEmails = ['davidyoung@priorityfinancial', 'david@lendwisemtg', 'davidyoung.lmc@gmail'];
  let correspondent = '';

  if (davidEmails.some(e => fromEmail.includes(e))) {
    correspondent = extractEmailAddress(to);
  } else {
    correspondent = fromEmail;
  }

  return {
    from: from.substring(0, 100),
    to: to.substring(0, 100),
    cc: cc.substring(0, 100),
    subject: subject.substring(0, 200),
    date: date.substring(0, 50),
    body,
    correspondent
  };
}

function writeEmail(email) {
  const content = `
${'='.repeat(80)}
DATE: ${email.date}
FROM: ${email.from}
TO: ${email.to}
${email.cc ? `CC: ${email.cc}\n` : ''}SUBJECT: ${email.subject}
${'-'.repeat(80)}
${email.body}
${'='.repeat(80)}

`;

  if (currentFileSize + content.length > MAX_FILE_SIZE) {
    createNewFile();
  }

  currentFileStream.write(content);
  currentFileSize += content.length;

  // Track correspondent
  const key = email.correspondent.substring(0, 50);
  correspondentCounts[key] = (correspondentCounts[key] || 0) + 1;
}

async function main() {
  console.log('Starting PFN Email Export (Streaming Mode)...');
  console.log('This will process the 12GB mbox file in a memory-efficient way.\n');

  createNewFile();

  const fileStream = fs.createReadStream(mboxPath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentEmailLines = [];
  let lineCount = 0;
  let inEmail = false;

  for await (const line of rl) {
    lineCount++;

    // New email starts with "From " at beginning of line (mbox format)
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email if exists
      if (currentEmailLines.length > 10) {
        const email = processEmail(currentEmailLines);
        if (email) {
          writeEmail(email);
          totalEmails++;
        } else {
          skippedEmails++;
        }
      }

      currentEmailLines = [line];
      inEmail = true;

      // Progress every 100k lines
      if (lineCount % 500000 === 0) {
        console.log(`Lines: ${(lineCount / 1000000).toFixed(1)}M | Emails kept: ${totalEmails} | Skipped: ${skippedEmails} | Files: ${currentFileIndex - 1}`);
      }
    } else if (inEmail) {
      // Limit email size to prevent memory issues
      if (currentEmailLines.length < 500) {
        currentEmailLines.push(line);
      }
    }
  }

  // Process last email
  if (currentEmailLines.length > 10) {
    const email = processEmail(currentEmailLines);
    if (email) {
      writeEmail(email);
      totalEmails++;
    }
  }

  if (currentFileStream) {
    currentFileStream.end();
  }

  console.log('\n' + '='.repeat(50));
  console.log('EXPORT COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total emails extracted: ${totalEmails}`);
  console.log(`Emails skipped: ${skippedEmails}`);
  console.log(`Files created: ${currentFileIndex - 1}`);
  console.log(`Output folder: ${outputDir}`);

  // Write index file
  const sortedCorrespondents = Object.entries(correspondentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  const indexContent = `# PFN Email Export Index
Generated: ${new Date().toISOString()}

## Summary
- Total Emails: ${totalEmails}
- Files Created: ${currentFileIndex - 1}
- Unique Correspondents: ${Object.keys(correspondentCounts).length}

## Top Correspondents
${sortedCorrespondents.map(([c, n]) => `- ${c}: ${n} emails`).join('\n')}

## How to Use with ChatGPT
1. Upload INDEX.md first to give context
2. Upload email files one at a time (each is ~15MB)
3. Ask ChatGPT to search for specific topics, names, or dates

## Key PFN People
- marcshenkman@priorityfinancial.net - Marc Shenkman (Owner)
- brenda@priorityfinancial.net - Brenda Perry (HR/Operations)
- lockdesk@priorityfinancial.net - Lock Desk (Pricing)
- davidyoung@priorityfinancial.net - David Young (You)
`;

  fs.writeFileSync(path.join(outputDir, 'INDEX.md'), indexContent);
  console.log('\nCreated: INDEX.md');
}

main().catch(console.error);
