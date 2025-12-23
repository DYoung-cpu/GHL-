/**
 * MBOX Signature Extractor - Phase 2
 * Parses email bodies to extract phone numbers, addresses, and titles from signatures
 * Enriches contacts from Phase 1
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/All mail Including Spam and Trash.mbox';
const CONTACTS_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts.json';
const OUTPUT_PATH = '/mnt/c/Users/dyoun/ghl-automation/data/onenation-contacts-enriched.json';
const PROGRESS_INTERVAL = 5000;

// Commercial/skip patterns
const skipDomains = [
  'amazon.com', 'bestbuy.com', 'dominos.com', 'teleflora.com', 'americanexpress.com',
  'bankofamerica.com', 'chase.com', 'citi.com', 'discover.com', 'paypal.com',
  'netflix.com', 'spotify.com', 'apple.com', 'google.com', 'facebook.com',
  'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com',
  'mailchimp.com', 'constantcontact.com', 'hubspot.com', 'salesforce.com',
  'welcomeamericanexpress.com', 'e-offers', 'email.bestbuy', 'b.teleflora',
  'totalexpert.net', 'elliemae.com', 'thertastore.com'
];

const skipPatterns = [
  'noreply', 'no-reply', 'donotreply', 'bounce', 'mailer-daemon',
  'notifications', 'newsletter', 'updates@', 'info@', 'support@',
  'orders@', 'shipping@', 'confirmation', 'receipt'
];

// Load existing contacts
const contactData = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf-8'));
const contacts = new Map();

// Filter for real contacts (people David actually sent emails to)
for (const contact of contactData.contacts) {
  const email = contact.email.toLowerCase();

  // Must have been sent to at least once
  if (contact.sentTo === 0) continue;

  // Skip commercial domains
  if (skipDomains.some(d => email.includes(d))) continue;

  // Skip system patterns
  if (skipPatterns.some(p => email.includes(p))) continue;

  contacts.set(email, {
    ...contact,
    phones: [],
    addresses: [],
    titles: [],
    companies: []
  });
}

console.log(`Loaded ${contacts.size} real contacts to enrich (filtered from ${contactData.contacts.length})`);

// Phone number patterns
const phonePatterns = [
  /(?:phone|tel|cell|mobile|office|direct|fax)?[:\s]*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/gi,
  /(?:phone|tel|cell|mobile|office|direct)?[:\s]*1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/gi
];

// Address patterns (simplified)
const addressPattern = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|circle|cir|place|pl)[\s,]*(?:suite|ste|apt|unit|#)?[\s#\d]*[\s,]*[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi;

// Title patterns
const titlePatterns = [
  /(?:^|\n)\s*((?:senior|sr\.?|junior|jr\.?|chief|lead|head|director|manager|vp|vice president|president|ceo|cfo|cto|owner|founder|partner|associate|assistant|broker|agent|loan officer|loan consultant|mortgage|escrow|title|realtor|real estate)[\w\s,\.]*)/gim,
  /(?:title|position)[:\s]*([\w\s,\.]+)/gi
];

// Company patterns
const companyPatterns = [
  /(?:company|firm|corporation|corp|inc|llc|ltd)[:\s]*([\w\s,\.&]+)/gi,
  /(?:^|\n)\s*([\w\s&]+(?:mortgage|realty|title|escrow|insurance|lending|financial|bank|credit union|investments)[\w\s,\.]*)/gim
];

let emailCount = 0;
let enrichedCount = 0;
let currentEmail = {};
let inBody = false;
let bodyLines = [];
let currentFrom = '';

// Extract data from email body/signature
function extractSignatureData(body, fromEmail) {
  if (!fromEmail || !contacts.has(fromEmail.toLowerCase())) return;

  const contact = contacts.get(fromEmail.toLowerCase());

  // Look for signature block (last 20 lines usually contain signature)
  const lines = body.split('\n');
  const signatureArea = lines.slice(-30).join('\n');

  // Extract phone numbers
  for (const pattern of phonePatterns) {
    const matches = signatureArea.matchAll(pattern);
    for (const match of matches) {
      const phone = `${match[1]}-${match[2]}-${match[3]}`;
      if (!contact.phones.includes(phone)) {
        contact.phones.push(phone);
      }
    }
  }

  // Extract addresses
  const addressMatches = signatureArea.matchAll(addressPattern);
  for (const match of addressMatches) {
    const address = match[1].trim().replace(/\s+/g, ' ');
    if (!contact.addresses.includes(address) && address.length < 200) {
      contact.addresses.push(address);
    }
  }

  // Extract titles
  for (const pattern of titlePatterns) {
    const matches = signatureArea.matchAll(pattern);
    for (const match of matches) {
      const title = match[1].trim();
      if (title.length > 3 && title.length < 100 && !contact.titles.includes(title)) {
        contact.titles.push(title);
      }
    }
  }

  // Extract companies
  for (const pattern of companyPatterns) {
    const matches = signatureArea.matchAll(pattern);
    for (const match of matches) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 100 && !contact.companies.includes(company)) {
        contact.companies.push(company);
      }
    }
  }

  // Track if we enriched anything
  if (contact.phones.length > 0 || contact.addresses.length > 0 ||
      contact.titles.length > 0 || contact.companies.length > 0) {
    enrichedCount++;
  }
}

// Parse email address from From header
function parseFromEmail(fromHeader) {
  if (!fromHeader) return '';
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

// Process completed email
function processEmail() {
  if (currentFrom && bodyLines.length > 0) {
    const body = bodyLines.join('\n');
    extractSignatureData(body, currentFrom);
  }
  emailCount++;

  if (emailCount % PROGRESS_INTERVAL === 0) {
    console.log(`Processed ${emailCount.toLocaleString()} emails, enriched ${enrichedCount} contacts...`);
  }
}

// Save results
function saveResults() {
  const enriched = Array.from(contacts.values());

  // Count enrichment stats
  let withPhone = 0, withAddress = 0, withTitle = 0, withCompany = 0;
  for (const c of enriched) {
    if (c.phones.length > 0) withPhone++;
    if (c.addresses.length > 0) withAddress++;
    if (c.titles.length > 0) withTitle++;
    if (c.companies.length > 0) withCompany++;
  }

  const output = {
    extractedAt: new Date().toISOString(),
    source: 'onenationhomeloans.com mbox - Phase 2 enrichment',
    totalContacts: enriched.length,
    enrichmentStats: {
      withPhone,
      withAddress,
      withTitle,
      withCompany
    },
    contacts: enriched.sort((a, b) => b.sentTo - a.sentTo)
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nSaved ${enriched.length} enriched contacts to ${OUTPUT_PATH}`);
  console.log(`\nEnrichment stats:`);
  console.log(`  Contacts with phone: ${withPhone}`);
  console.log(`  Contacts with address: ${withAddress}`);
  console.log(`  Contacts with title: ${withTitle}`);
  console.log(`  Contacts with company: ${withCompany}`);
}

// Main processing
async function main() {
  console.log('='.repeat(60));
  console.log('  MBOX Signature Extractor - Phase 2');
  console.log('='.repeat(60));
  console.log(`\nSource: ${MBOX_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  const startTime = Date.now();

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // New email starts with "From " at beginning of line
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (bodyLines.length > 0) {
        processEmail();
      }
      currentEmail = {};
      currentFrom = '';
      bodyLines = [];
      inBody = false;
      continue;
    }

    // Parse From header
    if (!inBody && line.toLowerCase().startsWith('from:')) {
      currentFrom = parseFromEmail(line.substring(5));
      continue;
    }

    // Empty line marks end of headers
    if (line === '' && !inBody && currentFrom) {
      inBody = true;
      continue;
    }

    // Collect body lines
    if (inBody) {
      bodyLines.push(line);
      // Limit body collection to avoid memory issues
      if (bodyLines.length > 500) {
        bodyLines = bodyLines.slice(-100); // Keep last 100 lines (signature area)
      }
    }
  }

  // Process last email
  if (bodyLines.length > 0) {
    processEmail();
  }

  const elapsed = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('  EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTotal emails processed: ${emailCount.toLocaleString()}`);
  console.log(`Time elapsed: ${elapsed.toFixed(1)} seconds`);

  saveResults();
}

main().catch(console.error);
