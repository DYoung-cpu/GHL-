const fs = require('fs');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const data = JSON.parse(fs.readFileSync('data/full-contact-status.json'));
const unknowns = data.notInGHL.unknown;

// Extract the 150 with two-way communication
const possibleContacts = unknowns.filter(c => {
  const sent = c.sent || 0;
  const received = c.received || 0;
  return sent > 0 && received > 0;
});

console.log(`Found ${possibleContacts.length} contacts with two-way communication to classify`);

async function classifyContact(contact) {
  const prompt = `Classify this email contact for a mortgage loan officer's CRM.

Contact: ${contact.email}
Name: ${contact.name || 'Unknown'}
Emails sent TO them: ${contact.sent}
Emails received FROM them: ${contact.received}
Sample email subjects: ${(contact.subjects || []).slice(0, 5).join('; ')}

Based on the email address domain and subject lines, classify as ONE of:
- BORROWER: Someone getting a mortgage loan (homebuyer, refinance customer)
- VENDOR: Title company, attorney, appraiser, CRM software, service provider
- LO_RECRUIT: Loan officer at another company (potential recruit)
- REALTOR: Real estate agent or broker (referral partner)
- INTERNAL: PFN/Priority Financial employee
- SPAM: Marketing, newsletters, automated systems
- PERSONAL: Friend, family, non-business

Respond with ONLY the classification word and a brief reason.
Example: VENDOR - Title company based on domain akeytitle.com`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
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
          const text = json.content?.[0]?.text || 'UNKNOWN';
          resolve(text);
        } catch (e) {
          resolve('ERROR - ' + e.message);
        }
      });
    });
    req.on('error', (e) => resolve('ERROR - ' + e.message));
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set');
    console.log('\nFalling back to rule-based classification...\n');

    // Rule-based fallback
    const results = {
      BORROWER: [],
      VENDOR: [],
      LO_RECRUIT: [],
      REALTOR: [],
      INTERNAL: [],
      SPAM: [],
      PERSONAL: [],
      UNKNOWN: []
    };

    const vendorDomains = ['title', 'escrow', 'law', 'legal', 'attorney', 'apprais', 'insurance', 'support', 'bigpurpledot', 'close.com', 'retr.app'];
    const loDomains = ['mortgage', 'lending', 'loan', 'home', 'capital', 'financial', 'bank', 'credit'];
    const realtorDomains = ['realty', 'realtor', 'realestate', 'homes', 'properties', 'kw.com', 'compass', 'coldwell', 'century21'];
    const pfnDomains = ['priorityfinancial', 'pfn'];

    possibleContacts.forEach(c => {
      const email = (c.email || '').toLowerCase();
      const domain = email.split('@')[1] || '';
      const subjects = (c.subjects || []).join(' ').toLowerCase();

      if (pfnDomains.some(p => domain.includes(p))) {
        results.INTERNAL.push({ ...c, reason: 'PFN domain' });
      } else if (vendorDomains.some(p => domain.includes(p) || email.includes(p))) {
        results.VENDOR.push({ ...c, reason: 'Vendor domain pattern' });
      } else if (realtorDomains.some(p => domain.includes(p))) {
        results.REALTOR.push({ ...c, reason: 'Realtor domain pattern' });
      } else if (loDomains.some(p => domain.includes(p))) {
        // Check if subjects indicate borrower vs LO
        if (subjects.includes('loan approved') || subjects.includes('closing') || subjects.includes('document')) {
          results.BORROWER.push({ ...c, reason: 'Loan process subjects' });
        } else {
          results.LO_RECRUIT.push({ ...c, reason: 'Mortgage company domain' });
        }
      } else if (domain.includes('gmail') || domain.includes('yahoo') || domain.includes('hotmail') || domain.includes('icloud')) {
        // Personal email - check subjects
        if (subjects.includes('loan') || subjects.includes('mortgage') || subjects.includes('closing') || subjects.includes('approval')) {
          results.BORROWER.push({ ...c, reason: 'Personal email with loan subjects' });
        } else {
          results.PERSONAL.push({ ...c, reason: 'Personal email domain' });
        }
      } else {
        results.UNKNOWN.push({ ...c, reason: 'Could not determine' });
      }
    });

    // Output results
    console.log('=== CLASSIFICATION RESULTS ===');
    Object.keys(results).forEach(cat => {
      console.log(`\n${cat}: ${results[cat].length}`);
      results[cat].slice(0, 5).forEach(c => {
        console.log(`  ${c.email} - ${c.reason}`);
      });
      if (results[cat].length > 5) console.log(`  ... and ${results[cat].length - 5} more`);
    });

    // Save results
    fs.writeFileSync('data/150-unknowns-classified.json', JSON.stringify(results, null, 2));

    // Create CSVs for each category
    let allCsv = 'Email,Name,Category,Reason,Sent,Received\n';
    Object.keys(results).forEach(cat => {
      results[cat].forEach(c => {
        allCsv += `"${c.email}","${c.name || ''}","${cat}","${c.reason}","${c.sent}","${c.received}"\n`;
      });
    });
    fs.writeFileSync('data/150-unknowns-classified.csv', allCsv);

    console.log('\n=== SAVED ===');
    console.log('data/150-unknowns-classified.json');
    console.log('data/150-unknowns-classified.csv');

    return;
  }

  // LLM classification (if API key available)
  console.log('Classifying with Claude Haiku...\n');

  const results = [];
  for (let i = 0; i < possibleContacts.length; i++) {
    const c = possibleContacts[i];
    process.stdout.write(`\r${i + 1}/${possibleContacts.length}: ${c.email.substring(0, 40)}...`);

    const classification = await classifyContact(c);
    results.push({
      ...c,
      classification
    });

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n\n=== RESULTS ===');

  // Group by classification
  const grouped = {};
  results.forEach(r => {
    const cat = r.classification.split(' ')[0].replace('-', '');
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  Object.keys(grouped).forEach(cat => {
    console.log(`\n${cat}: ${grouped[cat].length}`);
    grouped[cat].slice(0, 3).forEach(c => {
      console.log(`  ${c.email} - ${c.classification}`);
    });
  });

  fs.writeFileSync('data/150-unknowns-classified.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to data/150-unknowns-classified.json');
}

main();
