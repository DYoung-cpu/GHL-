/**
 * Shared Extraction Utilities
 *
 * Contains all extraction logic for phone, NMLS, DRE, company, title
 * Also handles base64 decoding and garbage line filtering
 *
 * Used by: batch-extract.js, contact-enricher.js, orchestrator-events.js
 */

const fs = require('fs');
const readline = require('readline');
const { convert } = require('html-to-text');

// Import learning module for pattern matching
let learning = null;
try {
  learning = require('./learning');
} catch (e) {
  // Learning module not available - will use regex only
}

// ============================================
// PATTERNS
// ============================================

const PHONE_PATTERNS = [
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
  /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g
];

const NMLS_PATTERN = /NMLS[#:\s]*(\d{4,7})/gi;
const DRE_PATTERN = /(?:DRE|CalBRE|BRE)[#:\s]*(\d{7,9})/gi;

const TITLE_KEYWORDS = [
  'loan officer', 'mortgage', 'realtor', 'real estate', 'escrow', 'title',
  'attorney', 'paralegal', 'assistant', 'manager', 'director', 'vp',
  'president', 'ceo', 'owner', 'broker', 'agent', 'processor', 'underwriter',
  'closer', 'funder', 'coordinator', 'specialist', 'consultant', 'advisor',
  'originator', 'banker', 'lender', 'officer', 'branch'
];

const COMPANY_SUFFIXES = /(?:,?\s*(?:Inc\.?|LLC\.?|Corp\.?|Company|Co\.?)|Mortgage|Realty|Escrow|Title\s|Bank|Financial|Lending|Capital|Group|Services|Insurance|Specialists)\.?$/i;

// ============================================
// HTML-TO-TEXT CONVERSION
// ============================================

/**
 * Convert HTML email content to plain text
 * This handles HTML-only emails (like Priority Financial) that show raw CSS/markup
 */
function htmlToText(html) {
  if (!html || typeof html !== 'string') return '';

  // Quick check - if it doesn't look like HTML, return as-is
  if (!/<[a-z]/i.test(html)) return html;

  try {
    return convert(html, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'head', format: 'skip' },
        { selector: 'meta', format: 'skip' },
        { selector: 'link', format: 'skip' }
      ]
    });
  } catch (e) {
    // If conversion fails, try basic regex stripping
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, '\n\n');
  }
}

// ============================================
// MIME QUOTED-PRINTABLE DECODING
// ============================================

/**
 * Decode MIME quoted-printable encoding
 * Handles patterns like =E2=80=AF (non-breaking space) and =20 (space)
 */
function decodeQuotedPrintable(text) {
  if (!text || typeof text !== 'string') return '';

  // Quick check - if no QP patterns, return as-is
  if (!/=[0-9A-F]{2}/i.test(text)) return text;

  return text
    // Remove soft line breaks (= at end of line)
    .replace(/=\r?\n/g, '')
    // Decode hex-encoded characters
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch (e) {
        return '';
      }
    });
}

// ============================================
// SIGNATURE QUALITY ASSESSMENT
// ============================================

/**
 * Assess the quality of a signature block
 * Returns: 'good', 'partial', 'poor', 'garbage', 'none'
 */
function assessSignatureQuality(sig) {
  if (!sig || sig.trim().length === 0) return 'none';

  // Check for garbage patterns (HTML/CSS/MIME not decoded properly)
  const hasBase64 = /[A-Za-z0-9+\/=]{40,}/.test(sig);
  const hasHTML = /<[a-z]/i.test(sig) || /style=|font-family|color:|border-/i.test(sig);
  const hasMIME = /=[A-F0-9]{2}/i.test(sig) || /=\r?\n/.test(sig);
  const hasURLGarbage = /https?:\/\/[^\s]{100,}/.test(sig);
  const hasCSS = /width:\s*\d+px|margin:|padding:|display:|font-size:/i.test(sig);

  // Check for good patterns (readable signature content)
  const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(sig);
  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(sig);
  const hasName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(sig);
  const hasTitle = /officer|director|manager|president|agent|broker|specialist|realtor|attorney|escrow/i.test(sig);
  const hasNMLS = /NMLS[#:\s]*\d{4,7}/i.test(sig);

  // Calculate quality
  const badSignals = (hasBase64 ? 1 : 0) + (hasHTML ? 1 : 0) + (hasMIME ? 1 : 0) + (hasURLGarbage ? 1 : 0) + (hasCSS ? 1 : 0);
  const goodSignals = (hasPhone ? 1 : 0) + (hasEmail ? 1 : 0) + (hasName ? 1 : 0) + (hasTitle ? 1 : 0) + (hasNMLS ? 1 : 0);

  if (badSignals >= 2) return 'garbage';
  if (badSignals >= 1 && goodSignals === 0) return 'poor';
  if (goodSignals >= 2) return 'good';
  if (goodSignals >= 1) return 'partial';
  return 'unclear';
}

// ============================================
// GARBAGE LINE DETECTION
// ============================================

/**
 * Check if a line is garbage (MIME headers, base64, HTML, etc.)
 * IMPORTANT: Does NOT filter lines with multiple spaces (common in formatted signatures)
 */
function isGarbageLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false; // Empty lines are fine

  // Base64 pattern: long alphanumeric with +/=
  if (/^[A-Za-z0-9+\/=]{40,}$/.test(trimmed)) return true;

  // MIME boundaries
  if (/^--[A-Za-z0-9_=-]+/.test(trimmed)) return true;

  // Email headers in body
  if (/^(Content-Type:|Content-Transfer-Encoding:|Content-Disposition:|MIME-Version:)/i.test(trimmed)) return true;

  // PDF markers
  if (/^(%PDF|obj|endobj|stream|endstream|xref|trailer)/i.test(trimmed)) return true;

  // HTML tags
  if (/^<[!?\/]?[a-z]/i.test(trimmed)) return true;
  if (/<\/?(html|head|body|div|span|table|tr|td|p|br|font|style|script|meta|title|img|a\s)/i.test(trimmed)) return true;

  // MIME encoded content
  if (/=3D|=\r?\n$|charset=|style=|class=/i.test(trimmed)) return true;

  // Non-printable characters (binary)
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(trimmed)) return true;

  // Repeated characters (like oooAKKKK) but NOT spaces (signatures often have spacing)
  if (/([^\s])\1{4,}/.test(trimmed)) return true;

  return false;
}

/**
 * Extract name from signature block
 * Looks for patterns like:
 *   - First line that looks like a name (2-3 words, proper case)
 *   - "Best regards,\nJohn Smith" pattern
 *   - Name before title patterns
 */
function extractNameFromSignature(signatureText) {
  if (!signatureText) return null;

  const lines = signatureText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];

    // Skip common non-name lines
    if (/^(thanks|regards|sincerely|best|cheers|sent from|get outlook)/i.test(line)) continue;
    if (/^(mobile|cell|phone|fax|office|direct|tel|email|e-mail):/i.test(line)) continue;
    if (/@/.test(line)) continue; // Skip emails
    if (/^\d/.test(line)) continue; // Skip lines starting with numbers
    if (/^(http|www\.)/i.test(line)) continue; // Skip URLs
    if (line.length > 40) continue; // Names aren't usually this long

    // Check if line looks like a name (2-4 words, mostly letters, proper case likely)
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      // Check each word looks like a name
      const allNameLike = words.every(w => {
        // Name words: letters only, 2+ chars, first char uppercase or all lowercase ok
        return /^[A-Za-z][A-Za-z'-]+$/.test(w) && w.length >= 2;
      });

      if (allNameLike) {
        // Additional check: shouldn't be a title or company term
        if (!/\b(inc|llc|corp|company|group|team|mortgage|realty|insurance|bank|financial)\b/i.test(line)) {
          return line;
        }
      }
    }
  }

  return null;
}

/**
 * Extract name from "Dear X" pattern at start of email body
 * This is useful when someone sends an email saying "Dear David, ..."
 * but it tells us the recipient's name, not the sender's.
 *
 * More useful: Extract the SENDER's name from their OWN greeting like:
 *   "Hi, this is Ken from..." or "My name is Ken Aiken"
 */
function extractNameFromBody(bodyText) {
  if (!bodyText) return null;

  const lines = bodyText.split('\n').slice(0, 20); // Check first 20 lines

  for (const line of lines) {
    const trimmed = line.trim();

    // "This is [Name]" pattern
    const thisIsMatch = trimmed.match(/^(?:hi|hello|hey)?,?\s*this is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (thisIsMatch) return thisIsMatch[1];

    // "My name is [Name]" pattern
    const myNameMatch = trimmed.match(/my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (myNameMatch) return myNameMatch[1];

    // "[Name] here" pattern at start
    const nameHereMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+here[.,!]?\s/i);
    if (nameHereMatch) return nameHereMatch[1];
  }

  return null;
}

/**
 * Get name using fallback chain:
 * 1. From header (most reliable)
 * 2. Signature block (name at top of signature)
 * 3. Body patterns ("This is Ken", "My name is...")
 */
function extractNameWithFallback(fromHeader, signatureBlock, bodyText) {
  // Try From header first
  const fromName = extractNameFromFromHeader(fromHeader);
  if (fromName) return { name: fromName, source: 'from_header' };

  // Try signature block
  const sigName = extractNameFromSignature(signatureBlock);
  if (sigName) return { name: sigName, source: 'signature' };

  // Try body patterns
  const bodyName = extractNameFromBody(bodyText);
  if (bodyName) return { name: bodyName, source: 'body' };

  return null;
}

/**
 * Check if text is valid extracted content
 */
function isValidExtractedText(text) {
  if (!text || text.length < 3) return false;

  // No MIME garbage
  if (/Content-Type|charset|boundary|multipart|base64/i.test(text)) return false;

  // No URLs or emails as the whole value
  if (/^https?:\/\//.test(text)) return false;
  if (/^[^@]+@[^@]+\.[^@]+$/.test(text)) return false;

  // No sentence starters or quoted text (Re: not Regional, Per: not Personal)
  if (/^(Been|Lock|Lead|Has|Have|Your|Our|The|This|That|Please|Hi|Hello|Dear|Add|>|Update|Need|Get|Send|See|Per\s|Re:|Fw:|Fwd:)/i.test(text)) return false;

  // No all caps phrases (usually not titles)
  if (/^[A-Z\s]{10,}$/.test(text)) return false;

  // No instructions or actions (not titles)
  if (/\bper\b|\bonly\b|\bname\b|\bsigned\b|\bborrower\b/i.test(text)) return false;

  // Must have vowels (readable English)
  if (!/[aeiouAEIOU]/.test(text)) return false;

  // Must have a space (real names have spaces)
  if (text.length > 15 && !/\s/.test(text)) return false;

  // No repeated chars
  if (/(.)\1{3,}/.test(text)) return false;

  // No binary/non-printable
  if (/[^\x20-\x7E]/.test(text)) return false;

  // No colons in middle (like "Name: Value")
  if (/:/.test(text) && !/^[^:]+$/.test(text)) return false;

  return true;
}

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract phone numbers from text
 */
function extractPhones(text) {
  const phones = new Set();
  for (const pattern of PHONE_PATTERNS) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      // Normalize: remove non-digits, ensure 10 digits
      const digits = match.replace(/\D/g, '');
      if (digits.length === 10) {
        phones.add(digits);
      } else if (digits.length === 11 && digits.startsWith('1')) {
        phones.add(digits.substring(1));
      }
    }
  }
  return Array.from(phones);
}

/**
 * Extract NMLS number(s) from text
 * Returns first valid NMLS found
 */
function extractNMLS(text) {
  const matches = text.matchAll(NMLS_PATTERN);
  for (const match of matches) {
    const nmls = match[1];
    if (nmls && nmls.length >= 4 && nmls.length <= 7) {
      return nmls;
    }
  }
  return null;
}

/**
 * Extract all NMLS numbers from text
 */
function extractAllNMLS(text) {
  const results = [];
  const matches = text.matchAll(NMLS_PATTERN);
  for (const match of matches) {
    const nmls = match[1];
    if (nmls && nmls.length >= 4 && nmls.length <= 7 && !results.includes(nmls)) {
      results.push(nmls);
    }
  }
  return results;
}

/**
 * Extract DRE/CalBRE number from text
 */
function extractDRE(text) {
  const matches = text.matchAll(DRE_PATTERN);
  for (const match of matches) {
    const dre = match[1];
    if (dre && dre.length >= 7 && dre.length <= 9) {
      return dre;
    }
  }
  return null;
}

/**
 * Extract company from signature block
 * CHECKS LEARNED PATTERNS FIRST, then falls back to regex
 */
function extractCompany(signatureBlock) {
  // Check learned patterns first
  if (learning) {
    const learnedMatch = learning.matchLearnedCompany(signatureBlock);
    if (learnedMatch) {
      // console.log(`[EXTRACTOR] Company matched from learned pattern: "${learnedMatch.value}" (learned from ${learnedMatch.learnedFrom})`);
      return learnedMatch.value;
    }
  }

  const lines = signatureBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty, email, phone lines, garbage
    if (!trimmed || trimmed.includes('@') || /^\(?\d{3}/.test(trimmed)) continue;
    if (isGarbageLine(line)) continue;

    // Clean the line first (remove formatting chars)
    const cleaned = trimmed.replace(/[|•·–—*]/g, '').trim();

    // Must be short (company names aren't sentences) - allow 2+ chars for short names like "RETR"
    if (cleaned.length > 55 || cleaned.length < 2) continue;

    // Skip sentences (have lowercase words at start, or common sentence endings)
    if (/^[a-z]/.test(cleaned)) continue;

    // Skip if it looks like a sentence fragment
    if (/^(the|a|an|is|are|was|we|i|you|this|that|please|for|to|from|and)\s/i.test(cleaned)) continue;

    // Must end with or contain company suffix
    if (COMPANY_SUFFIXES.test(cleaned) ||
        /^[A-Z][a-zA-Z\s&]+(?:Inc\.?|LLC\.?|Corp\.?|Mortgage|Realty|Financial|Lending|Capital|Group|Specialists)\.?$/i.test(cleaned)) {
      if (isValidExtractedText(cleaned) && cleaned.length >= 3) {
        return cleaned;
      }
    }

    // Short all-caps names are often company names (RETR, UWM, etc.)
    if (/^[A-Z]{2,10}$/.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extract title/position from signature
 * CHECKS LEARNED PATTERNS FIRST, then falls back to regex
 */
function extractTitle(signatureBlock) {
  // Check learned patterns first
  if (learning) {
    const learnedMatch = learning.matchLearnedTitle(signatureBlock);
    if (learnedMatch) {
      // console.log(`[EXTRACTOR] Title matched from learned pattern: "${learnedMatch.value}" (learned from ${learnedMatch.learnedFrom})`);
      return learnedMatch.value;
    }
  }

  const lines = signatureBlock.split('\n');

  for (const line of lines) {
    // Skip garbage lines
    if (isGarbageLine(line)) continue;

    const trimmed = line.trim();

    // Must be short (titles aren't sentences)
    if (trimmed.length > 40 || trimmed.length < 5) continue;

    // Skip sentences
    if (/^[a-z]/.test(trimmed)) continue;
    if (/\.\s*$/.test(trimmed)) continue;
    if (/^(the|a|an|is|are|was|we|i|you|this|that|please|for|to|from|and)\s/i.test(trimmed)) continue;

    const lower = trimmed.toLowerCase();
    for (const keyword of TITLE_KEYWORDS) {
      if (lower.includes(keyword)) {
        // Clean and validate
        const cleaned = trimmed.replace(/[|•·–—*]/g, '').trim();
        if (isValidExtractedText(cleaned) && cleaned.length >= 5 && cleaned.length <= 40) {
          return cleaned;
        }
      }
    }
  }

  return null;
}

// ============================================
// SIGNATURE DETECTION
// ============================================

/**
 * Get signature block from email body
 * Scans ENTIRE email for signature patterns, not just the end
 */
function getSignatureBlock(body) {
  const lines = body.split('\n');

  // Filter out garbage lines first
  const cleanLines = lines.filter(line => !isGarbageLine(line));

  // Look for signature markers ANYWHERE in the email
  const signatureMarkers = ['sincerely,', 'regards,', 'best,', 'thanks,', 'cheers,', 'thank you,', 'best regards,', 'warm regards,'];

  for (let i = 0; i < cleanLines.length; i++) {
    const lower = cleanLines[i].toLowerCase().trim();

    // Check for signature marker
    for (const marker of signatureMarkers) {
      if (lower === marker || lower.startsWith(marker)) {
        // Found signature marker - take next 15 lines
        return cleanLines.slice(i, i + 15).join('\n');
      }
    }
  }

  // Alternative: Look for name + title pattern (Name on one line, title on next)
  for (let i = 0; i < cleanLines.length - 3; i++) {
    const line = cleanLines[i].trim();
    const nextLine = cleanLines[i + 1]?.trim() || '';

    // Check if this looks like a name (2-4 words, starts with caps, no special chars)
    if (/^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(line)) {
      // Check if next line looks like a title
      if (/^(CEO|President|Director|Manager|Officer|Founder|Owner|VP|AVP|Senior|Sr\.|Loan|Realtor|Agent|Broker)/i.test(nextLine)) {
        return cleanLines.slice(i, i + 15).join('\n');
      }
    }
  }

  // Fallback: look for phone numbers and take surrounding context
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    // Phone pattern - include both with and without parentheses
    if (/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
      // Take 5 lines before and 10 after the phone
      const start = Math.max(0, i - 5);
      return cleanLines.slice(start, i + 10).join('\n');
    }
  }

  // Last fallback: take last 30 clean lines
  return cleanLines.slice(-30).join('\n');
}

// ============================================
// BASE64 DECODING
// ============================================

/**
 * Decode base64 content safely
 */
function decodeBase64(base64String) {
  try {
    return Buffer.from(base64String, 'base64').toString('utf-8');
  } catch (e) {
    return null;
  }
}

/**
 * Check if a line looks like base64 content
 */
function isBase64Line(line) {
  const trimmed = line.trim();
  return /^[A-Za-z0-9+\/=]+$/.test(trimmed) && trimmed.length > 10;
}

// ============================================
// EMAIL PARSING
// ============================================

/**
 * Parse a single email and extract body with base64 decoding
 * Returns { textPlainBody: string[], htmlBody: string[] }
 */
function parseEmailBody(emailLines) {
  let currentMimeType = null;
  let textPlainIsBase64 = false;
  const textPlainBody = [];
  const base64Buffer = [];
  let inBody = false;

  for (const line of emailLines) {
    // Track MIME content type
    if (line.toLowerCase().startsWith('content-type:')) {
      currentMimeType = line.toLowerCase();
      textPlainIsBase64 = false;
    }

    // Detect base64 encoding for current MIME part
    if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
      if (currentMimeType?.includes('text/plain')) {
        textPlainIsBase64 = true;
      }
    }

    // Track when we enter/exit text/plain sections
    if (currentMimeType?.includes('text/plain')) {
      // Don't include MIME headers in body
      if (!line.startsWith('Content-') && !line.startsWith('--') && line.trim()) {
        if (textPlainIsBase64) {
          // Collect base64 lines for later decoding
          if (isBase64Line(line)) {
            base64Buffer.push(line.trim());
          }
        } else {
          textPlainBody.push(line);
        }
      }
    }

    // MIME boundary - decode base64 if we have it, then reset
    if (line.startsWith('--') && line.length > 20) {
      // Decode base64 buffer if we have text/plain base64 content
      if (base64Buffer.length > 0) {
        const decoded = decodeBase64(base64Buffer.join(''));
        if (decoded) {
          textPlainBody.push(...decoded.split('\n'));
        }
        base64Buffer.length = 0;
      }
      currentMimeType = null;
      textPlainIsBase64 = false;
    }
  }

  // Decode any remaining base64 buffer
  if (base64Buffer.length > 0) {
    const decoded = decodeBase64(base64Buffer.join(''));
    if (decoded) {
      textPlainBody.push(...decoded.split('\n'));
    }
  }

  return { textPlainBody };
}

/**
 * Remove quoted text and forwarded content from email body
 * This prevents attributing NMLS/DRE from other people's signatures to the sender
 * IMPROVED: Better detection of email chain patterns
 */
function stripQuotedContent(bodyText) {
  const lines = bodyText.split('\n');
  const cleanLines = [];
  let inQuoted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip ALL quoted line patterns
    if (trimmed.startsWith('>')) continue;

    // Skip forwarded message headers
    if (/^-{3,}\s*(Forwarded|Original)\s*(message|Message)/i.test(trimmed)) {
      inQuoted = true;
      continue;
    }

    // Skip "On ... wrote:" reply headers (captures various formats)
    if (/^On .+wrote:?\s*$/i.test(trimmed)) {
      inQuoted = true;
      continue;
    }

    // Skip email header patterns that indicate quoted content (after first 10 lines)
    if (i > 10) {
      // From: header with email
      if (/^From:\s*.*@.*$/i.test(trimmed)) {
        inQuoted = true;
        continue;
      }
      // Sent: header with date
      if (/^Sent:\s*.*\d{4}/i.test(trimmed)) {
        inQuoted = true;
        continue;
      }
      // Date: header (in quoted reply)
      if (/^Date:\s*.*\d{4}/i.test(trimmed)) {
        inQuoted = true;
        continue;
      }
    }

    // Skip To: header when already in quoted content
    if (inQuoted && /^To:\s*.*@/i.test(trimmed)) continue;
    if (inQuoted && /^Subject:\s*/i.test(trimmed)) continue;
    if (inQuoted && /^Cc:\s*/i.test(trimmed)) continue;

    // If in quoted content, skip everything
    if (inQuoted) continue;

    cleanLines.push(line);
  }

  return cleanLines.join('\n');
}

/**
 * Extract all data from email body text
 * FIXED: Only extracts NMLS/DRE from sender's own content, not quoted/forwarded text
 * IMPROVED: Now handles HTML-only emails and MIME quoted-printable encoding
 */
function extractFromBody(bodyText) {
  let processedText = bodyText;

  // Step 1: Decode MIME quoted-printable if present
  if (/=[0-9A-F]{2}/i.test(processedText)) {
    processedText = decodeQuotedPrintable(processedText);
  }

  // Step 2: Convert HTML to text if this looks like HTML email
  if (/<html|<body|<div|<table|<td|<p\s|style=/i.test(processedText)) {
    processedText = htmlToText(processedText);
  }

  // Step 3: Strip quoted and forwarded content
  const senderContent = stripQuotedContent(processedText);

  // Step 4: Get signature block
  let signature = getSignatureBlock(senderContent);

  // Step 5: Assess signature quality
  const quality = assessSignatureQuality(signature);

  // Step 6: If signature is still garbage after processing, try harder
  if (quality === 'garbage' || quality === 'poor') {
    // Try converting the raw text one more time with more aggressive HTML stripping
    const aggressiveClean = processedText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
    const cleanSignature = getSignatureBlock(stripQuotedContent(aggressiveClean));
    if (assessSignatureQuality(cleanSignature) !== 'garbage') {
      signature = cleanSignature;
    }
  }

  return {
    phones: extractPhones(signature),
    nmls: extractNMLS(signature),
    allNmls: extractAllNMLS(signature),
    dre: extractDRE(signature),
    company: extractCompany(signature),
    title: extractTitle(signature),
    signatureSample: signature.substring(0, 500),
    signatureQuality: assessSignatureQuality(signature)
  };
}

/**
 * Stream an mbox file and extract data for specific email addresses
 *
 * @param {string} mboxPath - Path to mbox file
 * @param {Set<string>} targetEmails - Set of email addresses to extract for
 * @param {Function} onExtract - Callback(email, extractedData) called for each match
 * @param {Function} onProgress - Callback(stats) called periodically
 */
async function streamMboxAndExtract(mboxPath, targetEmails, onExtract, onProgress) {
  if (!fs.existsSync(mboxPath)) {
    throw new Error(`Mbox file not found: ${mboxPath}`);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(mboxPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = {
    from: '',
    body: [],
    textPlainBody: [],
    base64Buffer: [],
    inHeaders: false,
    inBody: false,
    currentMimeType: null,
    inBase64: false,
    textPlainIsBase64: false
  };

  let lineCount = 0;
  let emailCount = 0;
  let matchCount = 0;
  const progressInterval = 100000;

  for await (const line of rl) {
    lineCount++;

    // Progress update
    if (lineCount % progressInterval === 0 && onProgress) {
      onProgress({ lines: lineCount, emails: emailCount, matches: matchCount });
    }

    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Process previous email
      if (currentEmail.from) {
        // Decode any remaining base64 buffer
        if (currentEmail.base64Buffer.length > 0) {
          const decoded = decodeBase64(currentEmail.base64Buffer.join(''));
          if (decoded) {
            currentEmail.textPlainBody.push(...decoded.split('\n'));
          }
        }

        // Extract sender email
        const fromMatch = currentEmail.from.match(/<([^>]+)>/) ||
                          currentEmail.from.match(/[\w.-]+@[\w.-]+\.\w+/);
        const fromEmail = fromMatch ? (fromMatch[1] || fromMatch[0]) : null;

        if (fromEmail && targetEmails.has(fromEmail.toLowerCase())) {
          matchCount++;

          // Get body text
          const bodyText = currentEmail.textPlainBody.length > 5
            ? currentEmail.textPlainBody.join('\n')
            : currentEmail.body.join('\n');

          // Extract data
          const extracted = extractFromBody(bodyText);
          extracted.wasBase64 = currentEmail.textPlainIsBase64;

          if (onExtract) {
            onExtract(fromEmail.toLowerCase(), extracted);
          }
        }
      }

      emailCount++;
      currentEmail = {
        from: '',
        body: [],
        textPlainBody: [],
        base64Buffer: [],
        inHeaders: true,
        inBody: false,
        currentMimeType: null,
        inBase64: false,
        textPlainIsBase64: false
      };
      continue;
    }

    // Capture From header
    if (currentEmail.inHeaders && line.toLowerCase().startsWith('from:')) {
      currentEmail.from = line.substring(5).trim();
    }

    // End of headers
    if (line === '' && currentEmail.inHeaders) {
      currentEmail.inHeaders = false;
      currentEmail.inBody = true;
      continue;
    }

    // Capture body with base64 handling
    if (currentEmail.inBody) {
      // Track MIME content type
      if (line.toLowerCase().startsWith('content-type:')) {
        currentEmail.currentMimeType = line.toLowerCase();
        currentEmail.textPlainIsBase64 = false;
      }

      // Detect base64 encoding
      if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
        currentEmail.inBase64 = true;
        if (currentEmail.currentMimeType?.includes('text/plain')) {
          currentEmail.textPlainIsBase64 = true;
        }
      }

      // Capture text/plain content
      if (currentEmail.currentMimeType?.includes('text/plain')) {
        if (!line.startsWith('Content-') && !line.startsWith('--') && line.trim()) {
          if (currentEmail.textPlainIsBase64) {
            if (isBase64Line(line)) {
              currentEmail.base64Buffer.push(line.trim());
            }
          } else {
            currentEmail.textPlainBody.push(line);
          }
        }
      }

      // MIME boundary - decode base64, reset state
      if (line.startsWith('--') && line.length > 20) {
        if (currentEmail.base64Buffer.length > 0) {
          const decoded = decodeBase64(currentEmail.base64Buffer.join(''));
          if (decoded) {
            currentEmail.textPlainBody.push(...decoded.split('\n'));
          }
          currentEmail.base64Buffer = [];
        }
        currentEmail.inBase64 = false;
        currentEmail.currentMimeType = null;
        currentEmail.textPlainIsBase64 = false;
      }

      // Keep full body as fallback (limit to last 200 lines)
      currentEmail.body.push(line);
      if (currentEmail.body.length > 200) {
        currentEmail.body.shift();
      }
    }
  }

  return { lines: lineCount, emails: emailCount, matches: matchCount };
}

// ============================================
// TARGETED EXTRACTION FOR SINGLE CONTACT
// ============================================

/**
 * David Young's known data - filter this out to avoid attribution errors
 */
const DAVID_DATA = {
  nmls: ['62043'],
  phones: ['8182239999', '3109547772', '8189363800'],
  companies: ['lendwise', 'priority financial', 'one nation']
};

/**
 * Extract display name from From header
 */
function extractNameFromFromHeader(fromHeader) {
  if (!fromHeader) return null;

  // Pattern 1: "Name" <email>
  const quotedMatch = fromHeader.match(/^["']([^"']+)["']\s*</);
  if (quotedMatch) return quotedMatch[1].trim();

  // Pattern 2: Name <email>
  const unquotedMatch = fromHeader.match(/^([^<]+)</);
  if (unquotedMatch) {
    const name = unquotedMatch[1].trim();
    if (name && !name.includes('@')) return name;
  }

  return null;
}

/**
 * Filter out David's data from extracted results
 */
function filterDavidDataFromExtraction(extracted) {
  if (!extracted) return extracted;
  const result = { ...extracted };

  // Filter NMLS
  if (result.nmls && DAVID_DATA.nmls.includes(result.nmls)) {
    result.nmls = null;
  }

  // Filter phones
  if (result.phones && result.phones.length) {
    result.phones = result.phones.filter(p => !DAVID_DATA.phones.includes(p));
  }

  // Filter company
  if (result.company) {
    const companyLower = result.company.toLowerCase();
    if (DAVID_DATA.companies.some(dc => companyLower.includes(dc))) {
      result.company = null;
    }
  }

  return result;
}

/**
 * Extract signature data for a single email address
 * This scans mbox files looking for emails FROM the target address
 * Much faster than full mbox scan since it stops after finding good data
 *
 * @param {string} targetEmail - Email address to extract data for
 * @param {string[]} mboxPaths - Array of mbox file paths to search
 * @param {object} options - Optional settings
 * @returns {object|null} - Extracted data or null if not found
 */
async function extractSignatureForEmail(targetEmail, mboxPaths, options = {}) {
  const { limit = 10, debug = false } = options;
  const targetLower = targetEmail.toLowerCase();

  for (const mboxPath of mboxPaths) {
    if (!fs.existsSync(mboxPath)) continue;

    const rl = readline.createInterface({
      input: fs.createReadStream(mboxPath),
      crlfDelay: Infinity
    });

    let currentEmail = null;
    let matchCount = 0;
    let bestResult = null;

    for await (const line of rl) {
      // New email boundary
      if (line.startsWith('From ') && line.includes('@')) {
        // Process previous email if it was from target
        if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 0) {
          const bodyText = currentEmail.body.join('\n');
          const rawExtracted = extractFromBody(bodyText);

          // Filter out David's data
          const extracted = filterDavidDataFromExtraction(rawExtracted);

          // Extract name from From header
          const fromName = extractNameFromFromHeader(currentEmail.fromRaw);

          if (extracted) {
            const quality = assessSignatureQuality(extracted.signatureSample || '');

            // Use name fallback chain
            const nameResult = extractNameWithFallback(
              currentEmail.fromRaw,
              extracted.signatureSample || '',
              bodyText
            );

            // Keep the best quality result
            if (!bestResult || quality === 'good' || quality === 'excellent') {
              bestResult = {
                name: nameResult?.name || null,
                nameSource: nameResult?.source || null,
                phones: extracted.phones || [],
                nmls: extracted.nmls,
                dre: extracted.dre,
                company: extracted.company,
                title: extracted.title,
                signatureQuality: quality,
                signatureSample: extracted.signatureSample?.substring(0, 500)
              };

              // If we got good data, we can stop
              if (quality === 'good' || quality === 'excellent') {
                rl.close();
                return bestResult;
              }
            } else if (nameResult && bestResult && !bestResult.name) {
              // If we have a name but no good data yet, still capture the name
              bestResult.name = nameResult.name;
              bestResult.nameSource = nameResult.source;
            }
          }

          matchCount++;
          if (matchCount >= limit) {
            rl.close();
            return bestResult;
          }
        }

        // Start new email
        currentEmail = {
          from: '',
          fromRaw: '', // Keep original for name extraction
          body: [],
          isTarget: false,
          inHeaders: true
        };
        continue;
      }

      if (!currentEmail) continue;

      // Capture From header
      if (currentEmail.inHeaders && line.toLowerCase().startsWith('from:')) {
        currentEmail.fromRaw = line.substring(5).trim();
        currentEmail.from = currentEmail.fromRaw.toLowerCase();
        currentEmail.isTarget = currentEmail.from.includes(targetLower);
      }

      // End of headers
      if (line === '' && currentEmail.inHeaders) {
        currentEmail.inHeaders = false;
        continue;
      }

      // Only capture body if this is from our target
      if (!currentEmail.inHeaders && currentEmail.isTarget) {
        currentEmail.body.push(line);
        // Limit body size
        if (currentEmail.body.length > 300) {
          currentEmail.body.shift();
        }
      }
    }

    // Process last email if from target
    if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 0) {
      const bodyText = currentEmail.body.join('\n');
      const rawExtracted = extractFromBody(bodyText);
      const extracted = filterDavidDataFromExtraction(rawExtracted);

      if (extracted) {
        // Use name fallback chain
        const nameResult = extractNameWithFallback(
          currentEmail.fromRaw,
          extracted.signatureSample || '',
          bodyText
        );

        const result = {
          name: nameResult?.name || null,
          nameSource: nameResult?.source || null,
          phones: extracted.phones || [],
          nmls: extracted.nmls,
          dre: extracted.dre,
          company: extracted.company,
          title: extracted.title,
          signatureQuality: assessSignatureQuality(extracted.signatureSample || ''),
          signatureSample: extracted.signatureSample?.substring(0, 500)
        };
        // Return the better of this or bestResult
        if (!bestResult) return result;
        if (result.signatureQuality === 'good' || result.signatureQuality === 'excellent') return result;
      }
    }

    // Return best result from this file if we found anything
    if (bestResult) return bestResult;
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Patterns
  PHONE_PATTERNS,
  NMLS_PATTERN,
  DRE_PATTERN,
  TITLE_KEYWORDS,

  // Utility functions
  isGarbageLine,
  isValidExtractedText,
  isBase64Line,
  decodeBase64,
  stripQuotedContent,

  // New conversion functions
  htmlToText,
  decodeQuotedPrintable,
  assessSignatureQuality,

  // Extraction functions
  extractPhones,
  extractNMLS,
  extractAllNMLS,
  extractDRE,
  extractCompany,
  extractTitle,
  getSignatureBlock,

  // Name extraction functions
  extractNameFromFromHeader,
  extractNameFromSignature,
  extractNameFromBody,
  extractNameWithFallback,
  filterDavidDataFromExtraction,

  // Higher-level functions
  parseEmailBody,
  extractFromBody,
  streamMboxAndExtract,

  // Targeted extraction for single contact
  extractSignatureForEmail
};
