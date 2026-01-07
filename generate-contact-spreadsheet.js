/**
 * Generate Contact Classification Spreadsheet
 * Creates Excel file with all contacts and dropdown for classification
 */

const XLSX = require('xlsx');
const fs = require('fs');
const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

const OUTPUT_PATH = '/mnt/c/Users/dyoun/Downloads/Contact-Classification-Review.xlsx';

// Categories for dropdown
const CATEGORIES = [
  'Loan Officer',
  'Past Client',
  'Family & Friends',
  'Realtor',
  'Title/Escrow',
  'Attorney',
  'Insurance',
  'Exclude'
];

// GHL API helper
function ghlRequest(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getGHLContacts() {
  console.log('Fetching GHL contacts...');
  const contacts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const res = await ghlRequest(`/contacts/?locationId=${LOCATION_ID}&limit=100&page=${page}`);
    const batch = res.contacts || [];
    contacts.push(...batch);
    if (batch.length < 100) hasMore = false;
    page++;
  }
  console.log('  Found', contacts.length, 'contacts in GHL');
  return contacts;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  GENERATING CONTACT CLASSIFICATION SPREADSHEET');
  console.log('='.repeat(60));

  // 1. Load all data sources
  console.log('\n1. Loading data sources...');

  // Full contact status (from our scan)
  const statusData = JSON.parse(fs.readFileSync('./data/full-contact-status.json'));

  // One Nation enriched contacts
  const onData = JSON.parse(fs.readFileSync('./data/onenation-contacts-final.json'));
  const onContacts = {};
  (onData.contacts || []).forEach(c => {
    if (c.email) {
      onContacts[c.email.toLowerCase()] = c;
    }
  });
  console.log('  One Nation enriched:', Object.keys(onContacts).length);

  // Priority Financial contacts
  const pfData = JSON.parse(fs.readFileSync('./data/priority-contacts.json'));
  const pfContacts = {};
  (pfData.contacts || []).forEach(c => {
    const email = (c.email || c.name || '').toLowerCase();
    const match = email.match(/[\w.-]+@[\w.-]+/);
    if (match) {
      pfContacts[match[0]] = c;
    }
  });
  console.log('  Priority Financial:', Object.keys(pfContacts).length);

  // GHL contacts
  const ghlContacts = await getGHLContacts();
  const ghlEmails = new Set(ghlContacts.map(c => (c.email || '').toLowerCase()).filter(e => e));

  // 2. Combine all contacts from status data
  console.log('\n2. Combining contacts...');

  const allContacts = new Map();

  // Process contacts from full-contact-status.json
  for (const [category, contacts] of Object.entries(statusData.inGHL)) {
    contacts.forEach(c => {
      if (!allContacts.has(c.email)) {
        allContacts.set(c.email, {
          ...c,
          inGHL: true,
          autoCategory: category
        });
      }
    });
  }

  for (const [category, contacts] of Object.entries(statusData.notInGHL)) {
    contacts.forEach(c => {
      if (!allContacts.has(c.email)) {
        allContacts.set(c.email, {
          ...c,
          inGHL: false,
          autoCategory: category
        });
      }
    });
  }

  console.log('  Total unique contacts:', allContacts.size);

  // 3. Enrich with additional data
  console.log('\n3. Enriching contact data...');

  const rows = [];
  let enrichedCount = 0;
  let skippedNoName = 0;

  for (const [email, contact] of allContacts) {
    // Get enrichment from One Nation
    const onEnrich = onContacts[email] || {};

    // Get enrichment from Priority Financial
    const pfEnrich = pfContacts[email] || {};

    // Build full name
    const fullName = contact.name || onEnrich.fullName || `${onEnrich.firstName || ''} ${onEnrich.lastName || ''}`.trim() || '';

    // FILTER: Skip contacts without a name
    if (!fullName || fullName.length < 2) {
      skippedNoName++;
      continue;
    }

    // Determine source
    let source = 'Unknown';
    if (email.includes('priorityfinancial') || email.includes('onenation') || email.includes('lendwise')) {
      source = 'Internal';
    } else if (onContacts[email]) {
      source = 'One Nation';
    } else if (pfContacts[email]) {
      source = 'Priority Financial';
    }

    // Build row
    const row = {
      'Full Name': fullName,
      'Email': email,
      'Phone': onEnrich.phone || (onEnrich.altPhones && onEnrich.altPhones[0]) || '',
      'Company': onEnrich.company || '',
      'Title': onEnrich.title || '',
      'NMLS': contact.nmlsNumber || '',
      'Source': source,
      'Emails Sent': contact.sent || 0,
      'Emails Received': contact.received || 0,
      'Sample Subject': (contact.subjects && contact.subjects[0]) || '',
      'Category': '',  // User will fill this
      'Notes': '',     // User will fill this
      'In GHL': contact.inGHL ? 'Yes' : 'No',
      'Auto-Detected': formatAutoCategory(contact.autoCategory),
      'Confidence': contact.confidence ? `${contact.confidence}%` : ''
    };

    if (row['Phone'] || row['Company'] || row['Title']) {
      enrichedCount++;
    }

    rows.push(row);
  }

  console.log('  Enriched contacts:', enrichedCount);
  console.log('  Skipped (no name):', skippedNoName);

  // 4. Sort rows
  console.log('\n4. Sorting contacts...');

  // Sort by: Internal last, then by name
  rows.sort((a, b) => {
    // Internal at bottom
    if (a.Source === 'Internal' && b.Source !== 'Internal') return 1;
    if (a.Source !== 'Internal' && b.Source === 'Internal') return -1;

    // Then by auto-detected category (loan officers first)
    const catOrder = ['Loan Officer', 'Client', 'Prospect', 'Unknown', 'Internal'];
    const aOrder = catOrder.indexOf(a['Auto-Detected']) || 99;
    const bOrder = catOrder.indexOf(b['Auto-Detected']) || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Then by name
    return (a['Full Name'] || '').localeCompare(b['Full Name'] || '');
  });

  // 5. Create workbook
  console.log('\n5. Creating Excel workbook...');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 },  // Full Name
    { wch: 35 },  // Email
    { wch: 15 },  // Phone
    { wch: 25 },  // Company
    { wch: 20 },  // Title
    { wch: 10 },  // NMLS
    { wch: 18 },  // Source
    { wch: 10 },  // Emails Sent
    { wch: 12 },  // Emails Received
    { wch: 40 },  // Sample Subject
    { wch: 18 },  // Category
    { wch: 30 },  // Notes
    { wch: 8 },   // In GHL
    { wch: 15 },  // Auto-Detected
    { wch: 10 }   // Confidence
  ];

  // Add data validation for Category column (column K, index 10)
  // xlsx-js-style or exceljs would be better, but we can set it up with basic xlsx

  // Create dropdown formula string
  const dropdownFormula = '"' + CATEGORIES.join(',') + '"';

  // Add data validation to Category column (K)
  if (!ws['!dataValidation']) ws['!dataValidation'] = [];

  // Add validation for entire Category column (rows 2 to end)
  ws['!dataValidation'].push({
    sqref: `K2:K${rows.length + 1}`,
    type: 'list',
    formula1: dropdownFormula,
    showDropDown: true,
    showErrorMessage: true,
    errorTitle: 'Invalid Category',
    error: 'Please select from the dropdown list'
  });

  // Add a helper sheet with categories (as backup reference)
  const categorySheet = XLSX.utils.aoa_to_sheet([
    ['Categories'],
    ...CATEGORIES.map(c => [c])
  ]);
  XLSX.utils.book_append_sheet(wb, categorySheet, 'Categories');

  // Add main sheet FIRST so it opens by default
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts', true);

  // 6. Write file
  console.log('\n6. Writing Excel file...');
  XLSX.writeFile(wb, OUTPUT_PATH);

  console.log('\n' + '='.repeat(60));
  console.log('  COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nFile saved to:', OUTPUT_PATH);
  console.log('\nTotal contacts:', rows.length);
  console.log('  - In GHL:', rows.filter(r => r['In GHL'] === 'Yes').length);
  console.log('  - Not in GHL:', rows.filter(r => r['In GHL'] === 'No').length);
  console.log('  - Internal:', rows.filter(r => r['Source'] === 'Internal').length);

  console.log('\n📋 INSTRUCTIONS:');
  console.log('1. Open the Excel file');
  console.log('2. For the Category column, manually type or copy from Categories sheet');
  console.log('3. Add any notes in the Notes column');
  console.log('4. Save when done');
  console.log('5. Run import script to push to GHL');

  console.log('\n💡 TIP: In Excel, you can create a dropdown by:');
  console.log('   1. Select column K (Category)');
  console.log('   2. Data → Data Validation');
  console.log('   3. Allow: List');
  console.log('   4. Source: =Categories!$A$2:$A$9');
}

function formatAutoCategory(cat) {
  const map = {
    'loan_officer': 'Loan Officer',
    'client': 'Client',
    'client_lo': 'Client (LO)',
    'prospect': 'Prospect',
    'vendor': 'Vendor',
    'internal': 'Internal',
    'unknown': 'Unknown'
  };
  return map[cat] || cat || '';
}

main().catch(console.error);
