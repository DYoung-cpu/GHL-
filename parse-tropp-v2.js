/**
 * Parse All Paul Tropp Leads - V2
 * Expanded real estate brokerage detection
 */

const fs = require('fs');

const FILES = [
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-3 4 5 6 .csv', source: 'AdRoll 3-6' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-7 8 9 10 .csv', source: 'AdRoll 7-10' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-11 12 13 14 .csv', source: 'AdRoll 11-14' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads- 15 16 17 18.csv', source: 'AdRoll 15-18' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-florida.csv', source: 'Florida', state: 'FL' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-texas.csv', source: 'Texas', state: 'TX' },
  { path: '/mnt/c/Users/dyoun/Downloads/Leads-ax and nv.csv', source: 'AZ-NV' },
  { path: '/mnt/c/Users/dyoun/Downloads/CA-Realtors-60k.csv', source: 'California', state: 'CA' }
];

// EXPANDED: Real estate brokerage domains
const REALTOR_DOMAINS = [
  // Major Franchises
  'kw.com', 'kw-pm.com', 'kwcommercial.com',
  'compass.com',
  'remax.net', 'remax.com',
  'century21.com', 'c21.com', 'c21mm.com', 'c21selectgroup.com', 'c21home.com', 'century21award.com',
  'coldwellbanker.com', 'cbnorcal.com', 'cbunited.com', 'cbvegas.com', 'cbzhomes.com', 'coldwellbankerab.com',
  'exprealty.com', 'exp.com',

  // Berkshire Hathaway
  'bhhs.com', 'bhhscal.com', 'bhhsnv.com', 'bhhsaz.com', 'bhhscaproperties.com', 'bhhsdrysdale.com', 'bhg.com',

  // Sotheby's
  'sothebysrealty.com', 'sothebyshomes.com', 'sothebys.realty', 'ggsir.com', 'pacificsir.com', 'premiersir.com', 'vistasir.com',

  // Regional Brokerages
  'firstteam.com', 'interorealestate.com', 'intero.com', 'pmz.com', 'golyon.com', 'apr.com',
  'camoves.com', 'floridamoves.com', 'azmoves.com', 'hsmove.com',
  'elliman.com', 'theagencyre.com', 'pacunion.com', 'pacunionla.com',
  'serenogroup.com', 'dilbeck.com', 'surterreproperties.com', 'watsonrealtycorp.com',
  'windermere.com', 'bdhomes.com', 'russlyon.com', 'westusa.com', 'rodeore.com',
  'newstarrealty.com', 'realtyconcepts.com', 'realtyexecutives.com',
  'garygreene.com', 'keyes.com', 'sevengables.com', 'judgefite.com',
  'ebby.com', 'villarealestate.com', 'realtyaustin.com', 'evusa.com',
  'londonproperties.com', 'guarantee.com', 'cbnapavalley.com', 'rockcliff.com',
  'vanguardsf.com', 'newmarkccarey.com', 'alainpinel.com', 'dreyfus.com',
  'serenogroup.com', 'paragon-re.com', 'corcoran.com', 'stribling.com',

  // Commercial Real Estate
  'cbre.com', 'cbrealty.com', 'cushwake.com', 'colliers.com', 'jll.com', 'am.jll.com',
  'marcusmillichap.com', 'lee-associates.com', 'ngkf.com', 'kiddermathews.com',
  'svn.com', 'daumcommercial.com', 'tricommercial.com', 'eastdilsecured.com',
  'savills-studley.com', 'dppre.com', 'mycvre.com', 'voitco.com',

  // MORE Century 21 / Coldwell Banker variants
  'c21be.com', 'c21troop.com', 'c21peak.com', 'cbdfw.com', 'cbharper.com',
  'cbbakersfield.com', 'cbvfl.com',

  // Luxury / Boutique brokerages
  'engelvoelkers.com', 'vanguardsonoma.com', 'kappelgateway.com', 'davidlyng.com',
  'zephyrsf.com', 'bullockrussell.com', 'johnrwood.com', 'gogrupe.com',
  'briggsfreeman.com', 'willisallen.com', 'mcguire.com', 'alliebeth.com',
  'raveis.com', 'podley.com', 'laughtonteam.com', 'kupersir.com',
  'chaseinternational.com', 'rmdfw.com', 'grubbco.com', 'hiltonhyland.com',
  'thepartnerstrust.com', 'adamscameron.com', 'smithandassociates.com',
  'dudum.com', 'nourmand.com', 'ewm.com', 'corcorangl.com', 'fresyes.com',
  'carringtonres.com', 'sequoia-re.com', 'rancon.com', 'americanagrp.com',
  'norcalgold.com', 'jbgoodwin.com', 'deasypenner.com', 'irvinecompany.com',
  'interomove.com', 'interonc.com', 'remaxpv.com', 'harcourtsprime.com',
  'moreland.com', 'era.com', 'elitenorcal.com', 'lsgateway.com', 'legacyrea.com',
  'gibsonintl.com', 'bundesen.com', 'troop.com', 'nreliving.com', 'villagesite.com',

  // More brokerages found in data
  'c21allstars.com', 'eragrizzard.com', 'ipre.com', 'c21everest.com', 'beerhometeam.com',
  'phyllisbrowning.com', 'michaelsaunders.com', 'hfflp.com', 'cresa.com', 'vylla.com',
  'vanguardmarin.com', 'regencyre.com', 'interohouston.com', 'remaxcir.com',
  'arizonabest.com', 'williamstrew.com', 'thehighlandpartners.com', 'scenicsir.com',
  'royalshellsales.com', 'ccim.net', 'lee-re.com', 'lee-assoc.com', 'jasonmitchellgroup.com',
  'deckerbullocksir.com', 'charlesdunn.com', 'reali.com', 'owning.com', 'keegancoppin.com',
  'hill-co.com', 'northandco.com', 'lyonstahl.com', 'illicre.com', 'interodb.com',
  'avisonyoung.com', 'daveperrymiller.com', 'berkadia.com', 'themcmonigleteam.com',
  'terrafirmaglobalpartners.com', 'rogershealy.com', 'fanniehillman.com', 'resf.com',
  'monumentstar.com', 'reagan.com',

  // Tech-enabled
  'redfin.com', 'realtor.com', 'zillow.com', 'trulia.com', 'opendoor.com',

  // Pattern matches (partial)
  'realty', 'realtor', 'realestate', 'real-estate', 'properties', 'homes',
  'sotheby', 'berkshire', 'coldwell', 'keller', 'century21', 'bhhs', 'bhg',
  'movoto', 'homeservices', 'homesmart', 'homelife', 'broker', 'mls'
];

// Lender patterns
const LENDER_PATTERNS = [
  'mortgage', 'lending', 'lender', 'loan', 'homeloan', 'homeloans',
  'mtg', 'nmls', 'refinance', 'heloc', 'loanofficer',
  'quicken', 'rocket', 'uwm', 'pennymac', 'guild', 'caliber',
  'fairway', 'movement', 'guaranteed', 'amcap', 'primelending',
  'supremelending', 'cardinal', 'homeside', 'rate.com', 'finance',
  'funding', 'capital', 'bancorp', 'fidelity'
];

// Insurance patterns
const INSURANCE_PATTERNS = [
  'insurance', 'insure', 'allstate', 'statefarm', 'geico', 'progressive',
  'farmers', 'liberty', 'nationwide', 'usaa', 'amica', 'travelers',
  'policy', 'coverage', 'underwriter'
];

// Attorney patterns
const ATTORNEY_PATTERNS = [
  'attorney', 'lawyer', 'lawfirm', 'legal', 'law.com', 'esq',
  'counsel', 'litigation', 'paralegal', 'lawoffice'
];

// Title/Escrow patterns
const TITLE_PATTERNS = [
  'title', 'escrow', 'closing', 'settlement', 'stewart', 'fidelity',
  'firstam', 'oldrepublic', 'chicago-title', 'ticor', 'wfg'
];

// Appraiser patterns
const APPRAISER_PATTERNS = [
  'appraisal', 'appraiser', 'valuation', 'bpo'
];

// Builder patterns
const BUILDER_PATTERNS = [
  'builder', 'construction', 'developer', 'homebuilder',
  'lennar', 'drhorton', 'pulte', 'meritage', 'toll', 'kb-home'
];

// Pattern words to check in FULL email (local + domain)
const REALTOR_PATTERNS = [
  'realty', 'realtor', 'realestate', 'real-estate', 'homes', 'properties',
  'sotheby', 'berkshire', 'coldwell', 'keller', 'century21', 'bhhs', 'bhg',
  'movoto', 'homeservices', 'homesmart', 'homelife', 'broker', 'mls',
  'selling', 'listwith', 'buyingandselling', 'househunter', 'homefinder',
  'sells', 'agent', 'estate', 'house', 'property', 'listing', 'buyingand',
  'youragent', 'myagent', 'dreamhome', 'findahome', 'homesforsale'
];

function categorizeEmail(email) {
  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1] || '';

  // Check exact domain matches first (real estate brokerages)
  for (const realtorDomain of REALTOR_DOMAINS) {
    if (domain === realtorDomain || domain.endsWith('.' + realtorDomain) || domain.includes(realtorDomain)) {
      return 'Realtor';
    }
  }

  // Check realtor patterns in FULL email (catches johnrealty@gmail.com)
  if (REALTOR_PATTERNS.some(p => emailLower.includes(p))) return 'Realtor';

  // Check other profession patterns
  if (LENDER_PATTERNS.some(p => emailLower.includes(p))) return 'Lender';
  if (INSURANCE_PATTERNS.some(p => emailLower.includes(p))) return 'Insurance';
  if (ATTORNEY_PATTERNS.some(p => emailLower.includes(p))) return 'Attorney';
  if (TITLE_PATTERNS.some(p => emailLower.includes(p))) return 'Title/Escrow';
  if (APPRAISER_PATTERNS.some(p => emailLower.includes(p))) return 'Appraiser';
  if (BUILDER_PATTERNS.some(p => emailLower.includes(p))) return 'Builder/Developer';

  return 'Unknown';
}

// Common first names for parsing
const COMMON_FIRST_NAMES = new Set([
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
  'kim', 'pam', 'ann', 'deb', 'meg', 'jill', 'tina', 'gina', 'nina', 'rosa',
  'juan', 'carlos', 'miguel', 'luis', 'jorge', 'pedro', 'jesus', 'manuel',
  'francisco', 'antonio', 'fernando', 'sergio', 'roberto', 'ricardo', 'ramon'
]);

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseNameFromEmail(email) {
  const localPart = email.split('@')[0].toLowerCase();
  const cleaned = localPart.replace(/[0-9]+$/, '').replace(/_+$/, '').replace(/-+$/, '');

  const skipPatterns = ['info', 'contact', 'admin', 'support', 'sales', 'hello', 'mail', 'office', 'team', 'noreply'];
  if (skipPatterns.some(p => cleaned === p)) {
    return { firstName: 'Unknown', lastName: '', confidence: 'none' };
  }

  // Pattern 1: firstname.lastname
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.').filter(p => p.length > 0);
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return { firstName: capitalize(parts[0]), lastName: capitalize(parts[parts.length - 1]), confidence: 'high' };
    }
  }

  // Pattern 2: firstname_lastname
  if (cleaned.includes('_')) {
    const parts = cleaned.split('_').filter(p => p.length > 0);
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return { firstName: capitalize(parts[0]), lastName: capitalize(parts[parts.length - 1]), confidence: 'high' };
    }
  }

  // Pattern 3: firstname-lastname
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').filter(p => p.length > 0);
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      return { firstName: capitalize(parts[0]), lastName: capitalize(parts[parts.length - 1]), confidence: 'high' };
    }
  }

  // Pattern 4: Concatenated firstnamelastname
  for (const firstName of COMMON_FIRST_NAMES) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const potentialLastName = cleaned.substring(firstName.length);
      if (potentialLastName.length >= 2 && /^[a-z]+$/.test(potentialLastName)) {
        return { firstName: capitalize(firstName), lastName: capitalize(potentialLastName), confidence: 'medium' };
      }
    }
  }

  return { firstName: 'Unknown', lastName: '', confidence: 'none' };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function processFile(fileConfig) {
  console.log(`\nProcessing: ${fileConfig.path}`);
  const content = fs.readFileSync(fileConfig.path, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headerFields = parseCSVLine(lines[0]);

  const emailCol = headerFields.findIndex(h => h.toLowerCase().includes('email'));
  const firstNameCol = headerFields.findIndex(h => h.toLowerCase().includes('first'));
  const lastNameCol = headerFields.findIndex(h => h.toLowerCase().includes('last'));
  const groupsCol = headerFields.findIndex(h => h.toLowerCase().includes('group'));
  const phoneCol = headerFields.findIndex(h => h.toLowerCase().includes('phone'));

  const contacts = [];
  const stats = { total: 0, namesParsed: 0, categorized: {} };

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const email = (fields[emailCol] || '').replace(/"/g, '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;

    let firstName = (fields[firstNameCol] || '').replace(/"/g, '').trim();
    let lastName = (fields[lastNameCol] || '').replace(/"/g, '').trim();
    const phone = phoneCol >= 0 ? (fields[phoneCol] || '').replace(/"/g, '').trim() : '';
    const groups = groupsCol >= 0 ? (fields[groupsCol] || '').replace(/"/g, '').trim() : '';

    // ALWAYS try to parse name from email for AdRoll data (names are fake)
    const isAdRollData = fileConfig.source.includes('AdRoll');
    let confidence = 'original';

    if (isAdRollData) {
      // AdRoll data has fake names - always parse from email
      const parsed = parseNameFromEmail(email);
      if (parsed.confidence !== 'none') {
        firstName = parsed.firstName;
        lastName = parsed.lastName;
        confidence = parsed.confidence;
        stats.namesParsed++;
      }
      // If can't parse, keep original (even if fake, better than Unknown)
    } else {
      // Non-AdRoll data - only parse if name is missing
      const needsParsing = /^First\d+$/i.test(firstName) || firstName === '' || firstName === 'Unknown';
      if (needsParsing) {
        const parsed = parseNameFromEmail(email);
        firstName = parsed.firstName;
        lastName = parsed.lastName;
        confidence = parsed.confidence;
        if (parsed.firstName !== 'Unknown') stats.namesParsed++;
      }
    }

    // Categorize
    const category = categorizeEmail(email);
    stats.categorized[category] = (stats.categorized[category] || 0) + 1;

    // State detection
    let state = fileConfig.state || '';
    if (!state && groups) {
      if (groups.includes('FL')) state = 'FL';
      else if (groups.includes('TX')) state = 'TX';
      else if (groups.includes('CA')) state = 'CA';
      else if (groups.includes('Nevada')) state = 'NV';
      else if (groups.includes('AZ')) state = 'AZ';
    }

    contacts.push({ firstName, lastName, email, category, state, phone, source: fileConfig.source, originalGroup: groups, nameConfidence: confidence });
    stats.total++;

    if (stats.total % 50000 === 0) console.log(`  ${stats.total} processed...`);
  }

  console.log(`  Total: ${stats.total}, Names parsed: ${stats.namesParsed}`);
  console.log(`  Categories:`, stats.categorized);
  return { contacts, stats };
}

async function main() {
  console.log('=== Paul Tropp Leads Parser V2 ===\n');

  const allContacts = [];
  const totalStats = { total: 0, namesParsed: 0, categorized: {} };

  for (const fileConfig of FILES) {
    try {
      const { contacts, stats } = processFile(fileConfig);
      allContacts.push(...contacts);
      totalStats.total += stats.total;
      totalStats.namesParsed += stats.namesParsed;
      for (const [cat, count] of Object.entries(stats.categorized)) {
        totalStats.categorized[cat] = (totalStats.categorized[cat] || 0) + count;
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log('\n=== FINAL TOTALS ===');
  console.log(`Total contacts: ${totalStats.total}`);
  console.log(`Names parsed from email: ${totalStats.namesParsed}`);
  console.log('Categories:', totalStats.categorized);

  // Write output
  const outputDir = '/mnt/c/Users/dyoun/Downloads';
  const csvHeader = 'First Name,Last Name,Email,Category,State,Phone,Source,Original Group,Name Confidence\n';

  // Full dataset
  const fullRows = allContacts.map(c =>
    `"${c.firstName}","${c.lastName}","${c.email}","${c.category}","${c.state}","${c.phone}","${c.source}","${c.originalGroup}","${c.nameConfidence}"`
  ).join('\n');
  fs.writeFileSync(`${outputDir}/Paul-Tropp-ALL-PARSED-V2.csv`, csvHeader + fullRows);
  console.log(`\nWritten: Paul-Tropp-ALL-PARSED-V2.csv`);

  // By category
  for (const category of Object.keys(totalStats.categorized)) {
    const catContacts = allContacts.filter(c => c.category === category);
    const catRows = catContacts.map(c =>
      `"${c.firstName}","${c.lastName}","${c.email}","${c.category}","${c.state}","${c.phone}","${c.source}","${c.originalGroup}","${c.nameConfidence}"`
    ).join('\n');
    const safeName = category.replace(/\//g, '-');
    fs.writeFileSync(`${outputDir}/Paul-Tropp-V2-${safeName}.csv`, csvHeader + catRows);
    console.log(`Written: Paul-Tropp-V2-${safeName}.csv (${catContacts.length})`);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
