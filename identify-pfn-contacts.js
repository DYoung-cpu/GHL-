const https = require('https');
const fs = require('fs');

const API_KEY = process.env.GHL_API_KEY || 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

async function fetchContacts(cursor = null) {
  return new Promise((resolve, reject) => {
    let url = `/contacts/?locationId=${LOCATION_ID}&limit=100`;
    if (cursor) url += `&startAfterId=${cursor}`;

    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: url,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAllContacts() {
  let allContacts = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    const result = await fetchContacts(cursor);

    if (!result.contacts || result.contacts.length === 0) break;

    allContacts = allContacts.concat(result.contacts);
    console.error(`Page ${page}: ${result.contacts.length} contacts (total: ${allContacts.length})`);

    if (result.contacts.length < 100) break;
    cursor = result.contacts[result.contacts.length - 1].id;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return allContacts;
}

async function main() {
  console.error('Fetching all contacts from GHL...');
  const contacts = await getAllContacts();

  // PFN-related domains to flag
  const pfnDomains = [
    'priorityfinancial.net',
    'priorityfinancial.com',
    'pfn.com',
    'priorityfn.com',
    'priority-financial'
  ];

  // Also flag known PFN people even if using different email
  const pfnPeopleNames = [
    'marc shenkman',
    'brenda perry',
    'bryan campbell',
    'anthony amini',
    'justin holland',
    'alberto martinez',
    'harry gatewood',
    'aaron jensen'
  ];

  const pfnContacts = [];
  const cleanContacts = [];
  const suspiciousContacts = [];

  contacts.forEach(c => {
    const email = (c.email || '').toLowerCase();
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();

    // Check if PFN domain
    const isPFNDomain = pfnDomains.some(domain => email.includes(domain));

    // Check if known PFN person
    const isPFNPerson = pfnPeopleNames.some(name => fullName.includes(name));

    const contactInfo = {
      id: c.id,
      email: c.email || '(no email)',
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || '(no name)',
      phone: c.phone || '(no phone)',
      tags: c.tags || [],
      dateAdded: c.dateAdded,
      source: c.source
    };

    if (isPFNDomain) {
      contactInfo.reason = 'PFN email domain';
      pfnContacts.push(contactInfo);
    } else if (isPFNPerson) {
      contactInfo.reason = 'Known PFN person name';
      suspiciousContacts.push(contactInfo);
    } else {
      cleanContacts.push(contactInfo);
    }
  });

  // Analyze clean contacts for quality
  const withEmail = cleanContacts.filter(c => c.email && c.email !== '(no email)');
  const withPhone = cleanContacts.filter(c => c.phone && c.phone !== '(no phone)');
  const withBoth = cleanContacts.filter(c =>
    c.email && c.email !== '(no email)' &&
    c.phone && c.phone !== '(no phone)'
  );

  const result = {
    summary: {
      totalContacts: contacts.length,
      pfnContacts: pfnContacts.length,
      suspiciousContacts: suspiciousContacts.length,
      cleanContacts: cleanContacts.length,
      cleanWithEmail: withEmail.length,
      cleanWithPhone: withPhone.length,
      cleanWithBoth: withBoth.length
    },
    pfnContacts: pfnContacts,
    suspiciousContacts: suspiciousContacts,
    cleanContactsSample: cleanContacts.slice(0, 10)
  };

  // Save full data
  fs.writeFileSync('pfn-contact-audit.json', JSON.stringify({
    summary: result.summary,
    pfnContacts: pfnContacts,
    suspiciousContacts: suspiciousContacts,
    allCleanContacts: cleanContacts
  }, null, 2));

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => console.error('Error:', err.message));
