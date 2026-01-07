const fs = require('fs');
const https = require('https');

// Get API key from environment or use the one from .env
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.');
  console.error('Set ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

// Load contacts to classify
const realtors = JSON.parse(fs.readFileSync('data/potential-realtors.json'));
console.log(`Loaded ${realtors.length} potential realtors to classify`);

// Classification prompt
function buildPrompt(contact) {
  return `You are classifying contacts for a mortgage loan officer's CRM.

CONTACT INFO:
- Email: ${contact.email}
- Name: ${contact.name || 'Unknown'}
- Domain: ${contact.domain}
- Emails sent TO them: ${contact.sent}
- Emails received FROM them: ${contact.received}
${contact.subjects ? `- Sample subjects: ${contact.subjects.slice(0, 5).join('; ')}` : ''}

CLASSIFY this contact into ONE category:

1. REALTOR - Real estate agent, broker, or real estate professional who could be a referral partner
2. VENDOR - Title company, escrow, appraiser, inspector, or service provider
3. BORROWER - Someone who was/is getting a mortgage loan
4. LO_RECRUIT - Loan officer at another company (potential recruit)
5. SPAM - Marketing emails, newsletters, automated systems
6. PERSONAL - Non-business contact

Consider:
- Domain patterns (kw.com = Keller Williams realtor, compass.com = Compass realtor)
- Email subjects mentioning "listing", "buyer", "property", "showing" = likely realtor
- High volume one-way emails = likely spam/marketing
- Two-way communication about specific properties = real relationship

Respond with ONLY:
CATEGORY: [category]
CONFIDENCE: [high/medium/low]
REASON: [brief 5-10 word reason]`;
}

async function classifyContact(contact) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [{ role: 'user', content: buildPrompt(contact) }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            resolve({ error: json.error.message });
          } else {
            const text = json.content?.[0]?.text || '';
            // Parse response
            const categoryMatch = text.match(/CATEGORY:\s*(\w+)/i);
            const confidenceMatch = text.match(/CONFIDENCE:\s*(\w+)/i);
            const reasonMatch = text.match(/REASON:\s*(.+)/i);

            resolve({
              category: categoryMatch ? categoryMatch[1].toUpperCase() : 'UNKNOWN',
              confidence: confidenceMatch ? confidenceMatch[1].toLowerCase() : 'low',
              reason: reasonMatch ? reasonMatch[1].trim() : text.substring(0, 50),
              raw: text
            });
          }
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  const results = {
    REALTOR: [],
    VENDOR: [],
    BORROWER: [],
    LO_RECRUIT: [],
    SPAM: [],
    PERSONAL: [],
    UNKNOWN: [],
    ERRORS: []
  };

  console.log('\nClassifying contacts with Claude...\n');

  for (let i = 0; i < realtors.length; i++) {
    const contact = realtors[i];
    process.stdout.write(`\r[${i + 1}/${realtors.length}] ${contact.email.substring(0, 40).padEnd(40)}`);

    const result = await classifyContact(contact);

    if (result.error) {
      results.ERRORS.push({ ...contact, error: result.error });
    } else {
      const cat = result.category;
      if (results[cat]) {
        results[cat].push({
          ...contact,
          classification: result
        });
      } else {
        results.UNKNOWN.push({ ...contact, classification: result });
      }
    }

    // Rate limit - 50ms between calls
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n\n=== CLASSIFICATION RESULTS ===\n');

  Object.keys(results).forEach(cat => {
    if (results[cat].length > 0) {
      console.log(`${cat}: ${results[cat].length}`);
      results[cat].slice(0, 5).forEach(c => {
        const conf = c.classification?.confidence || '';
        const reason = c.classification?.reason || c.error || '';
        console.log(`  ${c.email} [${conf}] - ${reason.substring(0, 50)}`);
      });
      if (results[cat].length > 5) {
        console.log(`  ... and ${results[cat].length - 5} more`);
      }
      console.log('');
    }
  });

  // Save results
  fs.writeFileSync('data/llm-classified-realtors.json', JSON.stringify(results, null, 2));
  console.log('Saved to: data/llm-classified-realtors.json');

  // Create updated realtor CSV
  const confirmedRealtors = results.REALTOR;
  if (confirmedRealtors.length > 0) {
    let csv = 'Email,First Name,Last Name,Phone,Tags,Confidence,Reason\n';
    confirmedRealtors.forEach(c => {
      const parts = (c.name || '').split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      csv += `"${c.email}","${firstName}","${lastName}","","realtor","${c.classification.confidence}","${c.classification.reason}"\n`;
    });
    fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/GHL-Upload-Ready/realtor.csv', csv);
    console.log(`\nUpdated realtor.csv with ${confirmedRealtors.length} confirmed realtors`);
  }
}

main().catch(console.error);
