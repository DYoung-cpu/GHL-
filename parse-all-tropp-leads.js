/**
 * Parse All Paul Tropp Leads
 * Extracts names from emails and categorizes contacts
 * Processes: AdRoll 3-18 + State files (CA, TX, FL, NV)
 */

const fs = require('fs');
const path = require('path');

// Files to process
const FILES = [
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-3 4 5 6 .csv', source: 'AdRoll 3-6' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-7 8 9 10 .csv', source: 'AdRoll 7-10' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-11 12 13 14 .csv', source: 'AdRoll 11-14' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads- 15 16 17 18.csv', source: 'AdRoll 15-18' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-florida.csv', source: 'Florida', state: 'FL' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-texas.csv', source: 'Texas', state: 'TX' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-ax and nv.csv', source: 'AZ-NV', state: 'AZ/NV' },
  { path: '/mnt/c/Users/dyoun/Downloads/CA-Realtors-60k.csv', source: 'California', state: 'CA' }
];

// Category detection patterns
const CATEGORIES = {
  'Realtor': [
    'realty', 'realtor', 'realestate', 'real-estate', 'homes', 'properties',
    'century21', 'remax', 're/max', 'coldwell', 'keller', 'berkshire', 'sotheby',
    'compass.com', 'exp.com', 'exprealty', 'bhhs', 'bhhscal', 'bhg.com',
    'cbrealty', 'corcoran', 'douglas-elliman', 'rodeo', 'homesmart',
    'homeservices', 'moving', 'broker', 'listing', 'buyingandselling',
    'househunter', 'propertymanage', 'mls', 'nar.realtor', 'sellinghomes',
    'homefinder', 'housesales', 'estateagent', 'luxuryrealestate'
  ],
  'Lender': [
    'mortgage', 'lending', 'lender', 'loan', 'finance', 'homeloans',
    'funding', 'mtg', 'homeloan', 'refinance', 'heloc', 'fha', 'va-loan',
    'nmls', 'loanofficer', 'mlc', 'quicken', 'rocket', 'uwm', 'pennymac',
    'guild', 'caliber', 'fairway', 'movement', 'guaranteed', 'amcap',
    'primelending', 'supremelending', 'cardinal', 'homeside', 'rate.com'
  ],
  'Insurance': [
    'insurance', 'insure', 'allstate', 'statefarm', 'geico', 'progressive',
    'farmers', 'liberty', 'nationwide', 'usaa', 'amica', 'travelers',
    'policy', 'coverage', 'underwriter', 'claims', 'riskmgmt'
  ],
  'Attorney': [
    'attorney', 'lawyer', 'lawfirm', 'legal', 'law.com', 'esq', 'counsel',
    'litigation', 'paralegal', 'lawoffice', 'jd.com', 'barrister'
  ],
  'Title/Escrow': [
    'title', 'escrow', 'closing', 'settlement', 'stewart', 'fidelity',
    'firstam', 'oldrepublic', 'chicago-title', 'ticor', 'wfg'
  ],
  'Appraiser': [
    'appraisal', 'appraiser', 'valuation', 'bpo', 'propertyvalue'
  ],
  'Builder/Developer': [
    'builder', 'construction', 'developer', 'newconstruction', 'homebuilder',
    'lennar', 'drhorton', 'pulte', 'meritage', 'toll', 'kb-home'
  ]
};

// Common first names for parsing
const COMMON_FIRST_NAMES = [
  'john', 'mike', 'michael', 'david', 'chris', 'james', 'robert', 'william',
  'richard', 'joseph', 'thomas', 'charles', 'daniel', 'matthew', 'anthony',
  'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin',
  'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
  'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin',
  'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'frank',
  'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose',
  'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle', 'noah',
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan',
  'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra',
  'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol',
  'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura',
  'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela',
  'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra',
  'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather', 'diane',
  'ken', 'tom', 'bob', 'jim', 'dan', 'steve', 'jeff', 'greg', 'tony', 'ray',
  'joe', 'sam', 'ben', 'tim', 'matt', 'nick', 'alex', 'max', 'jake', 'luke',
  'beth', 'kate', 'anne', 'jane', 'lynn', 'sue', 'joy', 'kay', 'amy', 'jan',
  'kim', 'pam', 'ann', 'deb', 'meg', 'jill', 'tina', 'gina', 'nina'
];

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseNameFromEmail(email) {
  const localPart = email.split('@')[0].toLowerCase();
  const cleaned = localPart.replace(/[0-9]+$/, '').replace(/_+$/, '').replace(/-+$/, '');

  // Skip obvious non-names
  const skipPatterns = ['info', 'contact', 'admin', 'support', 'sales', 'hello', 'mail', 'office', 'team'];
  if (skipPatterns.some(p => cleaned === p)) {
    return { firstName: 'Unknown', lastName: '', confidence: 'none' };
  }

  // Pattern 1: firstname.lastname
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return {
        firstName: capitalize(parts[0]),
        lastName: capitalize(parts[parts.length - 1]),
        confidence: 'high'
      };
    }
  }

  // Pattern 2: firstname_lastname
  if (cleaned.includes('_')) {
    const parts = cleaned.split('_');
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return {
        firstName: capitalize(parts[0]),
        lastName: capitalize(parts[parts.length - 1]),
        confidence: 'high'
      };
    }
  }

  // Pattern 3: firstname-lastname
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return {
        firstName: capitalize(parts[0]),
        lastName: capitalize(parts[parts.length - 1]),
        confidence: 'high'
      };
    }
  }

  // Pattern 4: Concatenated firstnamelastname
  for (const firstName of COMMON_FIRST_NAMES) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const potentialLastName = cleaned.substring(firstName.length);
      if (potentialLastName.length >= 2 && /^[a-z]+$/.test(potentialLastName)) {
        return {
          firstName: capitalize(firstName),
          lastName: capitalize(potentialLastName),
          confidence: 'medium'
        };
      }
    }
  }

  return { firstName: 'Unknown', lastName: '', confidence: 'none' };
}

function categorizeEmail(email) {
  const emailLower = email.toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORIES)) {
    for (const pattern of patterns) {
      if (emailLower.includes(pattern)) {
        return category;
      }
    }
  }

  return 'Unknown';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function processFile(fileConfig) {
  console.log(`\nProcessing: ${fileConfig.path}`);

  const content = fs.readFileSync(fileConfig.path, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0];
  const headerFields = parseCSVLine(header);

  // Detect column positions
  const emailCol = headerFields.findIndex(h => h.toLowerCase().includes('email'));
  const firstNameCol = headerFields.findIndex(h => h.toLowerCase().includes('first'));
  const lastNameCol = headerFields.findIndex(h => h.toLowerCase().includes('last'));
  const groupsCol = headerFields.findIndex(h => h.toLowerCase().includes('group'));
  const phoneCol = headerFields.findIndex(h => h.toLowerCase().includes('phone'));

  console.log(`  Columns: email=${emailCol}, firstName=${firstNameCol}, lastName=${lastNameCol}, groups=${groupsCol}`);

  const contacts = [];
  const stats = { total: 0, parsed: 0, categorized: {} };

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const email = (fields[emailCol] || '').replace(/"/g, '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;

    let firstName = (fields[firstNameCol] || '').replace(/"/g, '').trim();
    let lastName = (fields[lastNameCol] || '').replace(/"/g, '').trim();
    const phone = phoneCol >= 0 ? (fields[phoneCol] || '').replace(/"/g, '').trim() : '';
    const groups = groupsCol >= 0 ? (fields[groupsCol] || '').replace(/"/g, '').trim() : '';

    // Check if name is placeholder (First12345)
    const isPlaceholder = /^First\d+$/i.test(firstName) || firstName === '' || firstName === 'Unknown';

    let confidence = 'original';
    if (isPlaceholder) {
      const parsed = parseNameFromEmail(email);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
      confidence = parsed.confidence;
      if (parsed.firstName !== 'Unknown') stats.parsed++;
    }

    // Categorize
    const category = categorizeEmail(email);
    stats.categorized[category] = (stats.categorized[category] || 0) + 1;

    // Determine state from groups or file config
    let state = fileConfig.state || '';
    if (!state && groups) {
      if (groups.includes('FL')) state = 'FL';
      else if (groups.includes('TX')) state = 'TX';
      else if (groups.includes('CA')) state = 'CA';
      else if (groups.includes('Nevada') || groups.includes('NV')) state = 'NV';
      else if (groups.includes('AZ')) state = 'AZ';
    }

    contacts.push({
      firstName,
      lastName,
      email,
      category,
      state,
      phone,
      source: fileConfig.source,
      originalGroup: groups,
      nameConfidence: confidence
    });

    stats.total++;

    if (stats.total % 25000 === 0) {
      console.log(`  Processed ${stats.total} contacts...`);
    }
  }

  console.log(`  Total: ${stats.total}, Names parsed: ${stats.parsed}`);
  console.log(`  Categories:`, stats.categorized);

  return { contacts, stats };
}

// Main execution
async function main() {
  console.log('=== Paul Tropp Leads Parser ===\n');

  const allContacts = [];
  const totalStats = { total: 0, parsed: 0, categorized: {} };

  for (const fileConfig of FILES) {
    try {
      const { contacts, stats } = processFile(fileConfig);
      allContacts.push(...contacts);

      totalStats.total += stats.total;
      totalStats.parsed += stats.parsed;
      for (const [cat, count] of Object.entries(stats.categorized)) {
        totalStats.categorized[cat] = (totalStats.categorized[cat] || 0) + count;
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log('\n=== FINAL TOTALS ===');
  console.log(`Total contacts: ${totalStats.total}`);
  console.log(`Names parsed from email: ${totalStats.parsed}`);
  console.log('Categories:', totalStats.categorized);

  // Write output files
  const outputDir = '/mnt/c/Users/dyoun/Downloads';

  // Full dataset
  const fullOutput = `${outputDir}/Paul-Tropp-ALL-PARSED.csv`;
  const csvHeader = 'First Name,Last Name,Email,Category,State,Phone,Source,Original Group,Name Confidence\n';
  const csvRows = allContacts.map(c =>
    `"${c.firstName}","${c.lastName}","${c.email}","${c.category}","${c.state}","${c.phone}","${c.source}","${c.originalGroup}","${c.nameConfidence}"`
  ).join('\n');
  fs.writeFileSync(fullOutput, csvHeader + csvRows);
  console.log(`\nWritten: ${fullOutput}`);

  // By category
  for (const category of Object.keys(totalStats.categorized)) {
    const catContacts = allContacts.filter(c => c.category === category);
    const catFile = `${outputDir}/Paul-Tropp-${category.replace(/\//g, '-')}.csv`;
    const catRows = catContacts.map(c =>
      `"${c.firstName}","${c.lastName}","${c.email}","${c.category}","${c.state}","${c.phone}","${c.source}","${c.originalGroup}","${c.nameConfidence}"`
    ).join('\n');
    fs.writeFileSync(catFile, csvHeader + catRows);
    console.log(`Written: ${catFile} (${catContacts.length} contacts)`);
  }

  // By state (for those with state data)
  const stateContacts = allContacts.filter(c => c.state);
  const states = [...new Set(stateContacts.map(c => c.state))];
  for (const state of states) {
    const stContacts = stateContacts.filter(c => c.state === state);
    const stFile = `${outputDir}/Paul-Tropp-${state}.csv`;
    const stRows = stContacts.map(c =>
      `"${c.firstName}","${c.lastName}","${c.email}","${c.category}","${c.state}","${c.phone}","${c.source}","${c.originalGroup}","${c.nameConfidence}"`
    ).join('\n');
    fs.writeFileSync(stFile, csvHeader + stRows);
    console.log(`Written: ${stFile} (${stContacts.length} contacts)`);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
