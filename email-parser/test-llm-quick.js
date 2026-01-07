/**
 * Quick LLM Test - Tests with sample email data
 * Proves the LLM correctly ignores signatures from reply chains
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

// Sample email that SHOULD confuse regex but NOT confuse LLM
// This simulates Ken Aiken replying to David - Ken's info should be extracted, NOT David's
const sampleEmail = {
  from: 'loanwebusa@verizon.net',
  fromName: 'Ken Aiken',
  to: 'davidyoung@priorityfinancial.net',
  subject: 'RE: Lamia 5-unit DSCR deal',
  date: 'Thu, 28 Oct 2024 14:30:00 -0500',
  body: `David,

Here are the docs you requested for the Lamia deal. Let me know if you need anything else.

The property is at 123 Walnut Street - 5 unit mixed use.
Loan amount should be around $850,000.

Thanks,
Ken
412-758-9888

-----Original Message-----
From: David Young <davidyoung@priorityfinancial.net>
Sent: Wednesday, October 27, 2024 3:15 PM
To: loanwebusa@verizon.net
Subject: RE: Lamia 5-unit DSCR deal

Ken,

I can get you 7.25% on a 30-year DSCR for this one. Let me know if that works.

David Young
VP Business Development
Priority Financial Network
P: (818) 223-9999 | D: (818) 936-3800 | C: (310) 954-7772
W: www.priorityfinancial.net
NMLS: 62043
E: davidyoung@priorityfinancial.net

This email is confidential and intended only for the addressee.
`
};

// Second sample - Kailey forwarding an email from Anthony
const sampleEmail2 = {
  from: 'kaileykild@gmail.com',
  fromName: 'Kailey Kildunne',
  to: 'david@lendwisemtg.com',
  subject: 'FWD: Signature test',
  date: 'Mon, 15 Dec 2024 09:00:00 -0800',
  body: `Hi David,

Just forwarding this for you to review.

Thanks!
Kailey
818-555-1234

---------- Forwarded message ---------
From: Anthony Amini <anthony@lendwisemtg.com>
Date: Fri, Dec 13, 2024 at 4:30 PM
Subject: Update on company policy
To: All Staff

Team,

Please review the attached policy update.

Anthony Amini
President & COO
LendWise Mortgage
P: (818) 223-9999 | D: (818) 936-3801
E: anthony@lendwisemtg.com
NMLS: 1225724 | CADRE: 01991762
`
};

async function runQuickTest() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               QUICK LLM EXTRACTION TEST                          ║');
  console.log('║                                                                  ║');
  console.log('║   Testing that LLM ignores signatures from reply chains          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Test 1: Ken Aiken (should NOT get David's info)
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('TEST 1: Ken Aiken email with David\'s signature in reply chain');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('\nEmail from:', sampleEmail.from);
  console.log('Subject:', sampleEmail.subject);
  console.log('\n--- Email Body (first 400 chars) ---');
  console.log(sampleEmail.body.substring(0, 400));
  console.log('...\n');

  console.log('🤖 Calling Gemini LLM...\n');

  try {
    const result1 = await extractFromEmail(sampleEmail);

    console.log('✅ EXTRACTION RESULT:');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`   Name: ${result1.senderContact?.name || '(none)'} (confidence: ${result1.senderContact?.confidence || 0}%)`);
    console.log(`   Phone: ${result1.senderContact?.phone || '(none)'}`);
    console.log(`   Company: ${result1.senderContact?.company || '(none)'}`);
    console.log(`   Title: ${result1.senderContact?.title || '(none)'}`);
    console.log(`   NMLS: ${result1.senderContact?.nmls || '(none)'}`);
    console.log(`\n   Relationship: ${result1.relationship?.type || 'unknown'} (confidence: ${result1.relationship?.confidence || 0}%)`);
    console.log(`   Signals: ${result1.relationship?.signals?.join(', ') || '(none)'}`);
    console.log(`\n   Email Summary: ${result1.emailAnalysis?.summary || '(none)'}`);

    if (result1.dealInfo?.hasDealInfo) {
      console.log(`\n   📋 Deal Info Extracted:`);
      console.log(`      Borrower: ${result1.dealInfo.borrowerName || '(none)'}`);
      console.log(`      Property: ${result1.dealInfo.propertyAddress || '(none)'}`);
      console.log(`      Loan Amount: ${result1.dealInfo.loanAmount ? '$' + result1.dealInfo.loanAmount.toLocaleString() : '(none)'}`);
      console.log(`      Rate Quoted: ${result1.dealInfo.rateQuoted ? result1.dealInfo.rateQuoted + '%' : '(none)'}`);
      console.log(`      Program: ${result1.dealInfo.loanProgram || '(none)'}`);
    }

    // Validate - should NOT have David's info
    const hasDavidPhone = result1.senderContact?.phone === '8182239999' ||
                          result1.senderContact?.phone === '8189363800' ||
                          result1.senderContact?.phone === '3109547772';
    const hasDavidNMLS = result1.senderContact?.nmls === '62043';
    const hasDavidTitle = result1.senderContact?.title?.toLowerCase().includes('vp business');

    console.log('\n   🧪 VALIDATION:');
    console.log(`      Has David's phone? ${hasDavidPhone ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`      Has David's NMLS? ${hasDavidNMLS ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`      Has David's title? ${hasDavidTitle ? '❌ FAILED' : '✅ PASSED'}`);

  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Wait a moment between API calls
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Kailey (should NOT get Anthony's info)
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST 2: Kailey Kildunne email with Anthony\'s signature in forward');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('\nEmail from:', sampleEmail2.from);
  console.log('Subject:', sampleEmail2.subject);
  console.log('\n--- Email Body (first 400 chars) ---');
  console.log(sampleEmail2.body.substring(0, 400));
  console.log('...\n');

  console.log('🤖 Calling Gemini LLM...\n');

  try {
    const result2 = await extractFromEmail(sampleEmail2);

    console.log('✅ EXTRACTION RESULT:');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`   Name: ${result2.senderContact?.name || '(none)'} (confidence: ${result2.senderContact?.confidence || 0}%)`);
    console.log(`   Phone: ${result2.senderContact?.phone || '(none)'}`);
    console.log(`   Company: ${result2.senderContact?.company || '(none)'}`);
    console.log(`   Title: ${result2.senderContact?.title || '(none)'}`);
    console.log(`   NMLS: ${result2.senderContact?.nmls || '(none)'}`);
    console.log(`\n   Relationship: ${result2.relationship?.type || 'unknown'} (confidence: ${result2.relationship?.confidence || 0}%)`);
    console.log(`   Signals: ${result2.relationship?.signals?.join(', ') || '(none)'}`);
    console.log(`\n   Email Summary: ${result2.emailAnalysis?.summary || '(none)'}`);

    // Validate - should NOT have Anthony's info
    const hasAnthonyPhone = result2.senderContact?.phone === '8182239999' ||
                            result2.senderContact?.phone === '8189363801';
    const hasAnthonyNMLS = result2.senderContact?.nmls === '1225724';
    const hasAnthonyTitle = result2.senderContact?.title?.toLowerCase().includes('president') ||
                            result2.senderContact?.title?.toLowerCase().includes('coo');
    const hasAnthonyCompany = result2.senderContact?.company?.toLowerCase().includes('lendwise');

    console.log('\n   🧪 VALIDATION:');
    console.log(`      Has Anthony's phone? ${hasAnthonyPhone ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`      Has Anthony's NMLS? ${hasAnthonyNMLS ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`      Has Anthony's title? ${hasAnthonyTitle ? '❌ FAILED' : '✅ PASSED'}`);
    console.log(`      Has Anthony's company? ${hasAnthonyCompany ? '❌ FAILED' : '✅ PASSED'}`);

  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════');
}

runQuickTest().catch(console.error);
