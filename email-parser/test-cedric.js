/**
 * Test LLM on Cedric Johnson - a colleague at Priority Financial
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { extractFromEmail } = require('./utils/llm-extractor');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

async function findEmailFrom(targetEmail, limit = 1) {
  console.log(`Searching for email from ${targetEmail}...`);

  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = null;
  let found = null;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 1000000 === 0) {
      process.stdout.write(`\r  Scanned ${(lineCount/1000000).toFixed(0)}M lines...`);
    }

    if (line.startsWith('From ') && line.includes('@')) {
      if (currentEmail && currentEmail.isTarget && currentEmail.body.length > 20) {
        found = {
          from: currentEmail.fromEmail,
          fromName: currentEmail.fromName,
          to: currentEmail.to,
          subject: currentEmail.subject,
          date: currentEmail.date,
          body: currentEmail.body.join('\n')
        };
        rl.close();
        break;
      }

      currentEmail = {
        fromEmail: '',
        fromName: '',
        to: '',
        subject: '',
        date: '',
        body: [],
        isTarget: false,
        inHeaders: true
      };
      continue;
    }

    if (!currentEmail) continue;

    if (currentEmail.inHeaders) {
      const lower = line.toLowerCase();

      if (lower.startsWith('from:')) {
        const val = line.substring(5).trim();
        const emailMatch = val.match(/<([^>]+)>/) || val.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
          currentEmail.fromEmail = (emailMatch[1] || emailMatch[0]).toLowerCase();
          currentEmail.isTarget = currentEmail.fromEmail === targetEmail.toLowerCase();
        }
        const nameMatch = val.match(/^"?([^"<]+)"?\s*</);
        if (nameMatch) currentEmail.fromName = nameMatch[1].trim();
      }

      if (lower.startsWith('to:')) currentEmail.to = line.substring(3).trim();
      if (lower.startsWith('subject:')) currentEmail.subject = line.substring(8).trim();
      if (lower.startsWith('date:')) currentEmail.date = line.substring(5).trim();

      if (line === '') currentEmail.inHeaders = false;
    } else if (currentEmail.isTarget) {
      currentEmail.body.push(line);
      if (currentEmail.body.length > 250) currentEmail.body.shift();
    }
  }

  console.log('');
  return found;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           CEDRIC JOHNSON - LLM EXTRACTION TEST                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 WHAT REGEX EXTRACTED:');
  console.log('   Name: (undefined) ❌');
  console.log('   Phones: 7039265417, 0004155016 (garbage), 8182239999 (David\'s)');
  console.log('   Company: Priority Financial (filtered as David\'s)');
  console.log('   Title: Loan Officer');
  console.log('   NMLS: 200014');
  console.log('');

  const email = await findEmailFrom('cedricjohnson@priorityfinancial.net');

  if (!email) {
    console.log('❌ No email found from Cedric');
    return;
  }

  console.log('📧 FOUND EMAIL:');
  console.log('   From:', email.from);
  console.log('   From Name:', email.fromName || '(none in header)');
  console.log('   Subject:', email.subject);
  console.log('   Date:', email.date);
  console.log('');
  console.log('   Body (first 800 chars):');
  console.log('   ' + email.body.substring(0, 800).replace(/\n/g, '\n   '));
  console.log('');

  console.log('🤖 CALLING GEMINI LLM...\n');

  try {
    const result = await extractFromEmail(email);

    console.log('✅ LLM EXTRACTION RESULT:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('CONTACT INFO:');
    console.log(`   Name: ${result.senderContact?.name || '(none)'}`);
    console.log(`   Name Source: ${result.senderContact?.nameSource || 'unknown'}`);
    console.log(`   Phone: ${result.senderContact?.phone || '(none)'}`);
    console.log(`   Alt Phones: ${result.senderContact?.altPhones?.join(', ') || '(none)'}`);
    console.log(`   Company: ${result.senderContact?.company || '(none)'}`);
    console.log(`   Company Source: ${result.senderContact?.companySource || 'unknown'}`);
    console.log(`   Title: ${result.senderContact?.title || '(none)'}`);
    console.log(`   NMLS: ${result.senderContact?.nmls || '(none)'}`);
    console.log(`   DRE: ${result.senderContact?.dre || '(none)'}`);
    console.log(`   Confidence: ${result.senderContact?.confidence || 0}%`);
    console.log('');
    console.log('RELATIONSHIP:');
    console.log(`   Type: ${result.relationship?.type || 'unknown'}`);
    console.log(`   Confidence: ${result.relationship?.confidence || 0}%`);
    console.log(`   Signals: ${result.relationship?.signals?.join(', ') || '(none)'}`);
    console.log(`   Is Referral Source: ${result.relationship?.isReferralSource || false}`);
    console.log('');
    console.log('EMAIL ANALYSIS:');
    console.log(`   Intent: ${result.emailAnalysis?.intent || 'unknown'}`);
    console.log(`   Sentiment: ${result.emailAnalysis?.sentiment || 'unknown'}`);
    console.log(`   Summary: ${result.emailAnalysis?.summary || '(none)'}`);

    if (result.dealInfo?.hasDealInfo) {
      console.log('');
      console.log('DEAL INFO:');
      console.log(`   Borrower: ${result.dealInfo.borrowerName || '(none)'}`);
      console.log(`   Property: ${result.dealInfo.propertyAddress || '(none)'}`);
      console.log(`   Loan Amount: ${result.dealInfo.loanAmount || '(none)'}`);
      console.log(`   Rate Quoted: ${result.dealInfo.rateQuoted || '(none)'}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('COMPARISON: REGEX vs LLM');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('| Field    | Regex Result              | LLM Result                    |');
    console.log('|----------|---------------------------|-------------------------------|');
    console.log(`| Name     | (undefined) ❌            | ${(result.senderContact?.name || '(none)').padEnd(29)} |`);
    console.log(`| Phone    | 0004155016 (garbage) ❌   | ${(result.senderContact?.phone || '(none)').padEnd(29)} |`);
    console.log(`| Company  | (filtered out)            | ${(result.senderContact?.company || '(none)').padEnd(29)} |`);
    console.log(`| Title    | Loan Officer              | ${(result.senderContact?.title || '(none)').padEnd(29)} |`);
    console.log(`| NMLS     | 200014                    | ${(result.senderContact?.nmls || '(none)').padEnd(29)} |`);
    console.log(`| Relation | (none)                    | ${(result.relationship?.type || 'unknown').padEnd(29)} |`);

  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
  }
}

main().catch(console.error);
