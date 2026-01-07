/**
 * LLM-Powered Email Extractor
 *
 * Uses Gemini AI to intelligently extract contact information, relationship type,
 * deal details, rate quotes, and conversation context from emails.
 *
 * This replaces the regex-based extraction with true AI understanding.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * The comprehensive extraction prompt
 * This tells Gemini exactly what to extract and how to think about it
 */
const EXTRACTION_PROMPT = `You are an expert email analyzer for a mortgage loan officer named David Young. Your job is to extract ALL available information about the email sender.

CRITICAL RULES:
1. This email was SENT BY the person with email: {sender_email}

2. NAME EXTRACTION - CHECK IN THIS EXACT ORDER (stop when you find a real name):
   a) SUBJECT LINE PATTERNS - BE CAREFUL TO EXTRACT THE SENDER'S NAME, NOT THE CLIENT'S:

      SENDER'S NAME patterns (USE these - the name after "Intro" is the SENDER):
      - "Free Rate Update Intro - Ken Aiken" → "Ken Aiken" is the SENDER
      - "Intro - FirstName LastName" → the name is the SENDER introducing themselves

      CLIENT/BORROWER NAME patterns (DO NOT USE - these are NOT the sender):
      - "HELOC Inquiry - Muhammad" → Muhammad is the CLIENT/borrower, NOT the sender
      - "Loan Scenario - John Smith" → John Smith is the BORROWER being discussed
      - "RE: Smith File" or "RE: John's Loan" → John/Smith is the borrower
      - "Refinance - ClientName" → ClientName is the borrower
      - Any loan-related subject with a name is usually about the BORROWER, not sender

   b) SIGN-OFF in email body (MOST RELIABLE for sender's name):
      - "Thanks, Ken" → extract "Ken"
      - "Best regards, Ken Aiken" → extract "Ken Aiken"
      - "- Ken" at end of email → extract "Ken"
   c) FROM DISPLAY NAME (if it looks like a real name, not a company)
   d) SIGNATURE BLOCK (name at top of signature)
   e) Context clues ("This is Ken from LoanWebUSA")

3. NEVER DO THESE:
   - NEVER use the email address, username, or domain as the person's name
   - NEVER return "LoanWebUSA" for loanwebusa@... - that's the company, not the name
   - NEVER guess a name - if you can't find a real human name, return null
   - NEVER extract names from OTHER people in reply chains or forwards

4. INFER relationship type from HOW they communicate:
   - Do they say "my client" or "my borrower"? → They're a broker/realtor
   - Do they ask about rates for themselves? → They're a client
   - Do they discuss underwriting conditions? → They're a lender

5. Look for phone numbers the sender provides in the email body (e.g., "call me at 555-1234")

6. CONFIDENCE SCORING:
   - 90-100: Name from signature with full contact info
   - 80-89: Name from subject line or sign-off, confirmed by context
   - 70-79: Name from From header or partial match
   - 50-69: Inferred or partial information
   - Below 50: Uncertain, likely wrong - consider returning null instead

7. NON-HUMAN CONTACT DETECTION - FLAG FOR DELETION:
   Set "isHuman": false if the sender is NOT a real person. Delete these contacts:

   AUTOMATED SYSTEMS (always delete):
   - noreply@, no-reply@, donotreply@, do-not-reply@
   - postmaster@, mailer-daemon@, bounce@
   - notifications@, alerts@, updates@, newsletter@
   - automated@, system@, admin@
   - confirmations@, order@, shipping@

   MACHINE-GENERATED ADDRESSES (always delete):
   - SMS gateways: @mypixmessages.com, @vzwpix.com, @txt.att.net
   - Microsoft system: @*.onmicrosoft.com
   - Marketing platforms: @em1234.*, @alert.*, @worker*.*
   - Random strings that aren't human names

   SPAM/MARKETING (always delete):
   - Mass marketing senders (Adobe, Amazon, Netflix, etc. noreply addresses)
   - Subscription/newsletter emails
   - Payment/billing notifications from companies
   - Social media notifications (LinkedIn, Facebook, Instagram noreply)

   KEEP AS HUMAN (do NOT delete):
   - Real people at companies (john.smith@wellsfargo.com - this is human)
   - Support staff who write personal emails
   - Anyone with a real name and real conversation

   When "isHuman": false, the contact will be DELETED from the database.

DAVID YOUNG'S INFO (IGNORE if you see this - it belongs to David, not the sender):
- Emails: david@lendwisemtg.com, davidyoung@priorityfinancial.net, dyoung@onenationhomeloans.com
- Phone: 818-223-9999, 310-954-7772, 818-936-3800
- NMLS: 62043
- Companies: LendWise, Priority Financial, One Nation Home Loans
- Titles: President, CEO, VP Business Development, Loan Officer

DAVID'S TEAM MEMBERS (also IGNORE their info):
- Anthony Amini (President & COO at LendWise) - anthony@lendwisemtg.com, 818-936-3801
- Sara Cohen (Processor) - sara@priorityfinancial.net, saracohen@priorityfinancial.net

RELATIONSHIP TYPES (choose one):
- client: Individual borrower getting a loan (uses personal email, asks about rates, provides personal docs)
- realtor: Real estate agent (refers buyers, discusses properties, has RE license)
- broker_partner: Mortgage broker who sends deals to David (wholesale relationship, uses broker terminology)
- lender: Works at a bank/lender David submits loans to (discusses underwriting, conditions)
- title_escrow: Title company or escrow officer (discusses closing, title insurance)
- attorney: Lawyer (legal matters, estate planning, trusts)
- insurance: Insurance agent (homeowners, life, etc.)
- vendor: Service provider (appraisers, inspectors, etc.)
- colleague: Works at same company as David
- personal: Friend or family member
- unknown: Cannot determine

EMAIL INTENT TYPES:
- inquiry: Asking for information or rates
- quote_request: Specifically asking for a rate quote
- document_submission: Sending documents or files
- question: General question
- follow_up: Following up on previous conversation
- status_update: Providing update on a deal
- scheduling: Setting up a call or meeting
- thank_you: Expressing gratitude
- complaint: Expressing dissatisfaction
- referral: Referring someone to David
- general: General correspondence

Analyze the following email and extract information in JSON format:

---
FROM: {sender_email}
FROM DISPLAY NAME: {sender_name}
TO: {recipient}
SUBJECT: {subject}
DATE: {date}

EMAIL BODY:
{body}
---

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "isHuman": true/false,
  "deleteReason": "reason for deletion if isHuman is false, otherwise null",
  "senderContact": {
    "name": "sender's REAL human name or null if not found (NEVER use email/domain as name)",
    "nameSource": "subject_line/sign_off/from_header/signature/body/null",
    "phone": "sender's primary phone (digits only, 10 digits) or null",
    "phoneSource": "where you found the phone: signature/body/null",
    "altPhones": ["array of other phones found"] or [],
    "company": "sender's company (explicit or inferred) or null",
    "companySource": "explicit_signature/inferred_from_email_domain/inferred_from_context/null",
    "title": "sender's job title or null",
    "titleSource": "explicit_signature/inferred_from_role/null",
    "nmls": "sender's NMLS number (digits only) or null",
    "dre": "sender's DRE/real estate license number or null",
    "website": "sender's website or null",
    "confidence": 0-100
  },
  "relationship": {
    "type": "one of the types listed above",
    "confidence": 0-100,
    "signals": ["array of 1-3 reasons for this classification"],
    "isReferralSource": true/false
  },
  "emailAnalysis": {
    "intent": "one of the intent types listed above",
    "sentiment": "positive/neutral/negative/urgent",
    "summary": "1-2 sentence summary of what this email is about",
    "hasAttachments": true/false,
    "isReply": true/false,
    "isForward": true/false
  },
  "dealInfo": {
    "hasDealInfo": true/false,
    "borrowerName": "borrower's name if mentioned or null",
    "propertyAddress": "property address if mentioned or null",
    "propertyType": "SFR/Condo/2-4 unit/5+ unit/Commercial or null",
    "loanAmount": number or null,
    "purchasePrice": number or null,
    "loanPurpose": "purchase/refinance/cash-out or null",
    "rateQuoted": number (as decimal like 6.875) or null,
    "loanProgram": "Conventional/FHA/VA/Jumbo/DSCR/etc or null",
    "dealStage": "inquiry/application/processing/underwriting/closing/funded/dead or null"
  },
  "entitiesMentioned": {
    "people": ["array of other people mentioned"],
    "companies": ["array of companies mentioned"],
    "properties": ["array of property addresses mentioned"]
  },
  "actionItems": [
    {
      "action": "description of action needed",
      "assignedTo": "who should do it"
    }
  ]
}`;

/**
 * Call Gemini API for email extraction
 */
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topP: 0.8,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('No response from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Parse JSON response from Gemini, handling potential markdown wrapping
 */
function parseGeminiResponse(response) {
  // Remove markdown code blocks if present
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Gemini response:', jsonStr.substring(0, 500));
    throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
  }
}

/**
 * Extract information from a single email using Gemini
 *
 * @param {object} email - Email object with from, to, subject, date, body
 * @returns {object} - Extracted information
 */
async function extractFromEmail(email) {
  const { from, fromName, to, subject, date, body } = email;

  // Build the prompt with email data
  const prompt = EXTRACTION_PROMPT
    .replace('{sender_email}', from || 'unknown')
    .replace('{sender_name}', fromName || 'unknown')
    .replace('{recipient}', to || 'david@lendwisemtg.com')
    .replace('{subject}', subject || '(no subject)')
    .replace('{date}', date || 'unknown')
    .replace('{body}', body || '(empty)');

  try {
    const response = await callGemini(prompt);
    const extracted = parseGeminiResponse(response);

    // Add metadata
    extracted._meta = {
      extractedAt: new Date().toISOString(),
      model: 'gemini-1.5-flash',
      emailFrom: from,
      emailSubject: subject,
      emailDate: date
    };

    return extracted;
  } catch (error) {
    console.error(`Extraction failed for ${from}:`, error.message);
    return {
      error: error.message,
      _meta: {
        extractedAt: new Date().toISOString(),
        model: 'gemini-1.5-flash',
        emailFrom: from,
        emailSubject: subject,
        failed: true
      }
    };
  }
}

/**
 * Extract from multiple emails and aggregate results for a contact
 *
 * @param {string} contactEmail - The contact's email address
 * @param {array} emails - Array of email objects from this contact
 * @param {object} options - Options (maxEmails, etc.)
 * @returns {object} - Aggregated contact profile
 */
async function extractContactProfile(contactEmail, emails, options = {}) {
  const { maxEmails = 5, debug = false } = options;

  // Sort by date descending (most recent first)
  const sortedEmails = [...emails].sort((a, b) =>
    new Date(b.date || 0) - new Date(a.date || 0)
  );

  // Take up to maxEmails for processing
  const emailsToProcess = sortedEmails.slice(0, maxEmails);

  if (debug) {
    console.log(`Processing ${emailsToProcess.length} emails for ${contactEmail}`);
  }

  const extractions = [];

  for (const email of emailsToProcess) {
    if (debug) {
      console.log(`  Extracting from: ${email.subject}`);
    }

    const result = await extractFromEmail(email);
    extractions.push(result);

    // Rate limiting - 15 requests per minute for free tier
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Aggregate results into a contact profile
  return aggregateExtractions(contactEmail, extractions);
}

/**
 * Aggregate multiple extractions into a single contact profile
 */
function aggregateExtractions(contactEmail, extractions) {
  const validExtractions = extractions.filter(e => !e.error);

  if (validExtractions.length === 0) {
    return {
      email: contactEmail,
      error: 'No successful extractions',
      extractions: extractions
    };
  }

  // Find the best extraction for contact info (highest confidence)
  const bestContact = validExtractions
    .filter(e => e.senderContact?.confidence)
    .sort((a, b) => (b.senderContact?.confidence || 0) - (a.senderContact?.confidence || 0))[0];

  // Find the best relationship classification
  const bestRelationship = validExtractions
    .filter(e => e.relationship?.confidence)
    .sort((a, b) => (b.relationship?.confidence || 0) - (a.relationship?.confidence || 0))[0];

  // Aggregate all phones found
  const allPhones = new Set();
  validExtractions.forEach(e => {
    if (e.senderContact?.phone) allPhones.add(e.senderContact.phone);
    if (e.senderContact?.altPhones) {
      e.senderContact.altPhones.forEach(p => allPhones.add(p));
    }
  });

  // Aggregate all deal info
  const deals = validExtractions
    .filter(e => e.dealInfo?.hasDealInfo)
    .map(e => ({
      ...e.dealInfo,
      emailDate: e._meta?.emailDate,
      emailSubject: e._meta?.emailSubject
    }));

  // Aggregate email summaries
  const emailSummaries = validExtractions
    .filter(e => e.emailAnalysis?.summary)
    .map(e => ({
      date: e._meta?.emailDate,
      subject: e._meta?.emailSubject,
      summary: e.emailAnalysis.summary,
      intent: e.emailAnalysis.intent,
      sentiment: e.emailAnalysis.sentiment
    }));

  // Build aggregated profile
  return {
    email: contactEmail,

    contact: {
      name: bestContact?.senderContact?.name || null,
      phone: bestContact?.senderContact?.phone || null,
      phones: Array.from(allPhones),
      company: bestContact?.senderContact?.company || null,
      title: bestContact?.senderContact?.title || null,
      nmls: bestContact?.senderContact?.nmls || null,
      dre: bestContact?.senderContact?.dre || null,
      website: bestContact?.senderContact?.website || null,
      confidence: bestContact?.senderContact?.confidence || 0
    },

    relationship: {
      type: bestRelationship?.relationship?.type || 'unknown',
      confidence: bestRelationship?.relationship?.confidence || 0,
      signals: bestRelationship?.relationship?.signals || [],
      isReferralSource: bestRelationship?.relationship?.isReferralSource || false
    },

    deals: deals,

    emailHistory: emailSummaries,

    _meta: {
      emailsProcessed: extractions.length,
      successfulExtractions: validExtractions.length,
      aggregatedAt: new Date().toISOString()
    }
  };
}

/**
 * Test the extractor with a raw email body
 */
async function testExtraction(email) {
  console.log('Testing LLM extraction...');
  console.log('Email from:', email.from);
  console.log('Subject:', email.subject);
  console.log('---');

  const result = await extractFromEmail(email);

  console.log('\nExtraction Result:');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

module.exports = {
  extractFromEmail,
  extractContactProfile,
  aggregateExtractions,
  testExtraction,
  callGemini,
  EXTRACTION_PROMPT
};
