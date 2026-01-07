/**
 * Agent 3: Document Extractor
 *
 * Purpose: Extract ONLY driver's license or ID documents from email attachments
 * Runs on request for specific contacts
 *
 * Filters for:
 *   - Image files (jpg, png, pdf)
 *   - Filename contains: license, id, dl, drivers, identification
 *   - OR attachment in email with subject containing: license, id, dl
 *
 * Output: Files saved to /data/contacts/{email}/documents/
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Mbox file paths
const MBOX_PATHS = [
  '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox',
  '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox'
];

// Output directory for extracted documents
const OUTPUT_DIR = path.join(__dirname, '../data/contacts');

// ID/License filename patterns
const ID_PATTERNS = [
  /license/i,
  /\bid\b/i,
  /\bdl\b/i,
  /driver/i,
  /identification/i,
  /passport/i,
  /state\s*id/i
];

// Valid attachment extensions for ID documents
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.tif', '.tiff'];

/**
 * Check if filename looks like an ID document
 */
function isIdDocument(filename) {
  if (!filename) return false;

  // Check extension
  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXTENSIONS.includes(ext)) return false;

  // Check filename patterns
  for (const pattern of ID_PATTERNS) {
    if (pattern.test(filename)) return true;
  }

  return false;
}

/**
 * Check if subject suggests ID documents
 */
function subjectSuggestsId(subject) {
  if (!subject) return false;
  const lower = subject.toLowerCase();
  return ID_PATTERNS.some(p => p.test(lower));
}

/**
 * Extract base64 attachment from MIME content
 */
function extractAttachment(mimeContent) {
  // Look for Content-Transfer-Encoding: base64 followed by data
  const base64Match = mimeContent.match(/Content-Transfer-Encoding:\s*base64\s*\n\n([\s\S]+?)(?:\n--|\n\n--)/i);
  if (base64Match) {
    // Remove whitespace from base64 data
    return base64Match[1].replace(/\s/g, '');
  }
  return null;
}

/**
 * Scan mbox for attachments from a specific contact
 */
async function scanForDocuments(contactEmail, mboxPaths = MBOX_PATHS) {
  const results = {
    email: contactEmail,
    documents: [],
    scannedEmails: 0,
    errors: []
  };

  const contactDir = path.join(OUTPUT_DIR, contactEmail.replace(/[^a-z0-9]/gi, '_'), 'documents');

  for (const mboxPath of mboxPaths) {
    if (!fs.existsSync(mboxPath)) continue;

    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    let currentEmail = {
      from: '',
      to: '',
      subject: '',
      lines: [],
      inHeaders: false,
      isRelevant: false,
      hasAttachment: false
    };

    for await (const line of rl) {
      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Process previous email if relevant and has attachments
        if (currentEmail.isRelevant && currentEmail.hasAttachment) {
          const docs = await processEmailForDocuments(currentEmail, contactDir, results);
          results.scannedEmails++;
        }

        currentEmail = {
          from: '',
          to: '',
          subject: '',
          lines: [],
          inHeaders: true,
          isRelevant: false,
          hasAttachment: false
        };
        continue;
      }

      currentEmail.lines.push(line);

      if (currentEmail.inHeaders) {
        const lowerLine = line.toLowerCase();

        if (lowerLine.startsWith('from:')) {
          currentEmail.from = line.substring(5).trim();
          if (currentEmail.from.toLowerCase().includes(contactEmail.toLowerCase())) {
            currentEmail.isRelevant = true;
          }
        }
        if (lowerLine.startsWith('to:')) {
          currentEmail.to = line.substring(3).trim();
          if (currentEmail.to.toLowerCase().includes(contactEmail.toLowerCase())) {
            currentEmail.isRelevant = true;
          }
        }
        if (lowerLine.startsWith('subject:')) {
          currentEmail.subject = line.substring(8).trim();
        }
        if (lowerLine.includes('content-disposition:') && lowerLine.includes('attachment')) {
          currentEmail.hasAttachment = true;
        }
      }

      // End of headers
      if (line === '' && currentEmail.inHeaders) {
        currentEmail.inHeaders = false;
      }
    }

    // Process last email
    if (currentEmail.isRelevant && currentEmail.hasAttachment) {
      await processEmailForDocuments(currentEmail, contactDir, results);
    }
  }

  return results;
}

/**
 * Process email to extract ID documents
 */
async function processEmailForDocuments(email, outputDir, results) {
  const emailContent = email.lines.join('\n');
  const subjectHasId = subjectSuggestsId(email.subject);

  // Find all attachments
  const attachmentRegex = /Content-Disposition:\s*attachment[^]*?filename="?([^"\n]+)"?[^]*?Content-Transfer-Encoding:\s*base64\s*\n\n([\s\S]+?)(?=\n--|\nContent-)/gi;

  let match;
  while ((match = attachmentRegex.exec(emailContent)) !== null) {
    const filename = match[1].trim();
    const base64Data = match[2].replace(/\s/g, '');

    // Check if this looks like an ID document
    if (isIdDocument(filename) || subjectHasId) {
      try {
        // Create output directory
        fs.mkdirSync(outputDir, { recursive: true });

        // Generate unique filename
        const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_');
        const outputPath = path.join(outputDir, safeFilename);

        // Decode and save
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        results.documents.push({
          filename: filename,
          savedAs: safeFilename,
          path: outputPath,
          size: buffer.length,
          fromSubject: email.subject,
          extractedAt: new Date().toISOString()
        });

        console.log(`    Extracted: ${filename} (${Math.round(buffer.length/1024)}KB)`);
      } catch (err) {
        results.errors.push({
          filename: filename,
          error: err.message
        });
      }
    }
  }
}

/**
 * Extract documents for multiple contacts
 */
async function extractForContacts(contactEmails) {
  const allResults = [];

  console.log(`Scanning for ID documents from ${contactEmails.length} contacts...`);
  console.log('');

  for (const email of contactEmails) {
    console.log(`  Scanning: ${email}`);
    const results = await scanForDocuments(email);
    allResults.push(results);

    if (results.documents.length > 0) {
      console.log(`    Found ${results.documents.length} ID document(s)`);
    }
  }

  return allResults;
}

/**
 * Main execution
 */
async function main() {
  const enrichedPath = path.join(__dirname, '../data/enriched-contacts.json');
  const outputPath = path.join(__dirname, '../data/extracted-documents.json');

  console.log('='.repeat(60));
  console.log('  AGENT 3: DOCUMENT EXTRACTOR');
  console.log('='.repeat(60));
  console.log('');
  console.log('This agent extracts ID/license documents ONLY.');
  console.log('');

  // Check for enriched contacts
  if (!fs.existsSync(enrichedPath)) {
    console.log('ERROR: Enriched contacts not found at:', enrichedPath);
    console.log('Run contact-enricher.js first.');
    return null;
  }

  console.log('Loading enriched contacts...');
  const enriched = JSON.parse(fs.readFileSync(enrichedPath));

  // Only process clients (they're the ones with ID documents)
  const clients = enriched.filter(c =>
    c.classification?.type === 'client' ||
    c.classification?.confidence >= 0.7
  );

  console.log(`Found ${clients.length} potential clients to scan for documents`);
  console.log('');

  // Extract documents
  const results = await extractForContacts(clients.map(c => c.email));

  // Summary
  const totalDocs = results.reduce((sum, r) => sum + r.documents.length, 0);
  const contactsWithDocs = results.filter(r => r.documents.length > 0).length;

  console.log('');
  console.log('='.repeat(60));
  console.log('  EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Total ID documents extracted:', totalDocs);
  console.log('Contacts with documents:', contactsWithDocs);
  console.log('');
  console.log('Documents saved to:', OUTPUT_DIR);

  // Save results
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log('Results saved to:', outputPath);

  return results;
}

// Export for orchestrator
module.exports = {
  scanForDocuments,
  extractForContacts,
  isIdDocument,
  subjectSuggestsId,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
