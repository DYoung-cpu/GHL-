/**
 * FULL NAME ENRICHMENT
 * Process ALL contacts, extract names, save enriched data
 */

const fs = require('fs');
const path = require('path');

const downloadsDir = '/mnt/c/Users/dyoun/Downloads';
const outputDir = '/mnt/c/Users/dyoun/Downloads/Enriched';

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Common first names for detection
const commonFirstNames = new Set([
  'michael', 'david', 'john', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles',
  'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
  'jennifer', 'linda', 'patricia', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy',
  'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy',
  'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen',
  'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha',
  'brian', 'kevin', 'jason', 'jeff', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
  'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory',
  'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam',
  'doug', 'douglas', 'nathan', 'henry', 'peter', 'kyle', 'zachary', 'noah', 'ethan', 'jeremy',
  'walter', 'christian', 'keith', 'roger', 'terry', 'carl', 'sean', 'austin', 'arthur', 'lawrence',
  'jesse', 'dylan', 'bryan', 'joe', 'jordan', 'billy', 'bruce', 'albert', 'willie', 'gabriel',
  'mary', 'maria', 'catherine', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia',
  'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea',
  'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn',
  'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise', 'amber', 'doris',
  'marilyn', 'danielle', 'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie',
  'kayla', 'alexis', 'lori', 'chris', 'mike', 'jim', 'bob', 'bill', 'tom', 'steve', 'dan', 'matt', 'rob', 'tony',
  'nick', 'rick', 'tim', 'sam', 'ben', 'ken', 'don', 'ron', 'ed', 'ray', 'lee', 'jay',
  'sue', 'beth', 'kate', 'jane', 'kim', 'lynn', 'joy', 'pat', 'kay', 'jo', 'meg',
  'sherry', 'penny', 'glenn', 'suzanne', 'jeff', 'ron', 'patricia', 'natalie', 'lily', 'jameson',
  'terri', 'jeanne', 'jeanine', 'cliff', 'clifford', 'regina', 'wendy', 'barry', 'cindy', 'sandy',
  'greg', 'phil', 'phillip', 'ted', 'theodore', 'brad', 'bradley', 'chad', 'todd', 'craig',
  'derek', 'travis', 'randy', 'russell', 'russ', 'lonnie', 'lenny', 'marvin', 'melvin', 'vernon',
  'wayne', 'earl', 'eugene', 'gene', 'roy', 'ralph', 'louis', 'lou', 'fred', 'frederick',
  'norman', 'norm', 'stanley', 'stan', 'harry', 'harold', 'howard', 'oscar', 'victor', 'vincent',
  'leonard', 'leo', 'leon', 'lloyd', 'lyle', 'marshall', 'martin', 'marty', 'morris', 'murray',
  'neil', 'perry', 'rex', 'rodney', 'roland', 'ross', 'sidney', 'sid', 'stuart', 'stu',
  'sylvia', 'tanya', 'tara', 'tiffany', 'tina', 'tracy', 'valerie', 'vanessa', 'veronica', 'vicky',
  'vivian', 'wanda', 'whitney', 'yolanda', 'yvonne', 'adriana', 'adrienne', 'alicia', 'allison', 'alyssa',
  'bonnie', 'carla', 'carmen', 'carolyn', 'cassandra', 'charlene', 'claudia', 'colleen', 'connie', 'crystal',
  'cathy', 'daisy', 'darlene', 'dawn', 'deanna', 'debra', 'delia', 'elaine', 'elena', 'erica',
  'erin', 'esther', 'eva', 'gail', 'gina', 'glenda', 'gwen', 'holly', 'irene', 'irma',
  'jackie', 'janet', 'jenna', 'jenny', 'jill', 'joann', 'joanna', 'joanne', 'jodi', 'jody',
  'jolene', 'josephine', 'josie', 'juanita', 'julia', 'juliana', 'julianne', 'kara', 'karla', 'katrina',
  'kendra', 'kerri', 'kerry', 'krista', 'kristen', 'kristin', 'kristina', 'kristine', 'lacey', 'latoya',
  'leah', 'leigh', 'lena', 'leslie', 'leticia', 'liliana', 'lillian', 'loretta', 'lorna', 'lorraine',
  'lucia', 'lucille', 'lucy', 'lydia', 'lynda', 'lynne', 'maggie', 'mandy', 'marcia', 'margarita',
  'marian', 'marianne', 'maribel', 'marisol', 'marlene', 'marsha', 'marta', 'maureen', 'maxine', 'mayra',
  'miranda', 'miriam', 'misty', 'molly', 'mona', 'monica', 'monique', 'myra', 'nadine', 'naomi',
  'nora', 'norma', 'olga', 'paige', 'paula', 'pauline', 'peggy', 'priscilla', 'rachael', 'rachel',
  'ramona', 'raquel', 'reba', 'regina', 'renee', 'rhonda', 'rita', 'roberta', 'rochelle', 'rosa',
  'rosalie', 'rosemary', 'roxanne', 'ruby', 'sabrina', 'sally', 'selena', 'serena', 'shannon', 'sheila',
  'shelby', 'shelia', 'shelley', 'shelly', 'sherri', 'sheryl', 'silvia', 'sonia', 'sonya', 'stacey',
  'stacy', 'stella', 'tamara', 'tammy', 'tanisha', 'terrie', 'terry', 'thelma', 'tonya', 'traci',
  'tracie', 'tricia', 'trudy', 'vera', 'verna', 'vickie', 'viola', 'violet', 'willie', 'wilma', 'yesenia',
  'alan', 'allen', 'barry', 'bernard', 'bobby', 'carl', 'carlos', 'cecil', 'clarence', 'claude',
  'clayton', 'clyde', 'corey', 'cory', 'curtis', 'dale', 'danny', 'darrell', 'darren', 'darryl',
  'dean', 'derrick', 'devin', 'dewey', 'dominic', 'duane', 'dustin', 'dwight', 'eddie', 'edgar',
  'edmond', 'edmund', 'edwin', 'eli', 'elijah', 'elliot', 'elliott', 'elmer', 'ernest', 'ernie',
  'felix', 'floyd', 'francis', 'franklin', 'freddie', 'garrett', 'geoffrey', 'george', 'gerald', 'gilbert',
  'glen', 'gordon', 'grant', 'gregg', 'guy', 'harvey', 'heath', 'hector', 'herbert', 'herman',
  'homer', 'horace', 'hugh', 'hunter', 'irvin', 'irving', 'isaac', 'ivan', 'jace', 'jackson',
  'jared', 'jarrod', 'jasper', 'javier', 'jeffery', 'jerome', 'jimmie', 'jimmy', 'joel', 'johnnie',
  'johnny', 'jonah', 'jonas', 'jorge', 'josh', 'juan', 'karl', 'kellen', 'kelly', 'kendall',
  'kenneth', 'kenny', 'kent', 'kerry', 'kirk', 'kurt', 'lance', 'landon', 'larry', 'laurence',
  'layne', 'leroy', 'leslie', 'lester', 'lewis', 'logan', 'lonnie', 'lorenzo', 'louis', 'lowell',
  'lucas', 'luis', 'luke', 'luther', 'lyle', 'mack', 'malcolm', 'manuel', 'marc', 'marco',
  'marcus', 'mario', 'marlon', 'marshall', 'mason', 'maurice', 'max', 'maxwell', 'melvin', 'merle',
  'mickey', 'miguel', 'miles', 'milo', 'mitchell', 'monte', 'monty', 'morgan', 'moses', 'myron',
  'neal', 'ned', 'nelson', 'noel', 'oliver', 'omar', 'orlando', 'orville', 'otis', 'otto',
  'owen', 'pablo', 'percy', 'pete', 'phil', 'preston', 'quentin', 'rafael', 'raleigh', 'ramon',
  'randall', 'randolph', 'raul', 'reginald', 'rene', 'rex', 'ricardo', 'riley', 'rob', 'robbie',
  'rocky', 'roderick', 'rodger', 'rodolfo', 'rodrigo', 'rogelio', 'roger', 'rolando', 'roman', 'ron',
  'ronald', 'ronnie', 'roscoe', 'ross', 'roy', 'ruben', 'rudolph', 'rudy', 'rufus', 'russel',
  'rusty', 'salvador', 'salvatore', 'sammy', 'santiago', 'santos', 'saul', 'scotty', 'sebastian', 'sergio',
  'seth', 'shane', 'shawn', 'sheldon', 'sherman', 'sid', 'simon', 'sonny', 'spencer', 'stacy',
  'stefan', 'sterling', 'stevie', 'stewart', 'taylor', 'terrance', 'terrence', 'terry', 'theo', 'tim',
  'timmy', 'timothy', 'toby', 'todd', 'tommy', 'toney', 'travis', 'trent', 'trevor', 'troy',
  'ty', 'tyler', 'tyrone', 'ulysses', 'vance', 'vaughn', 'vern', 'vernon', 'vince', 'virgil',
  'wade', 'wallace', 'wally', 'walt', 'warren', 'wendell', 'wesley', 'wes', 'wilbert', 'wilbur',
  'wiley', 'will', 'willard', 'willis', 'wilson', 'winfred', 'winston', 'woodrow', 'woody', 'wyatt',
  'xavier', 'zach', 'zachery', 'zack', 'andre', 'andres', 'angel', 'angelo', 'armando', 'arturo',
  'benito', 'benny', 'cesar', 'christoper', 'cody', 'colby', 'cole', 'colin', 'connor', 'damon',
  'dana', 'dante', 'darin', 'darnell', 'darrin', 'darwin', 'dave', 'dexter', 'dillon', 'dirk',
  'domingo', 'donnie', 'dwayne', 'elias', 'emilio', 'enrique', 'erasmo', 'ernesto', 'esteban', 'eugenio',
  'evan', 'everett', 'fabian', 'fausto', 'felipe', 'fernando', 'fidel', 'forrest', 'freddy', 'fredrick',
  'gabriel', 'gavin', 'gerry', 'gilberto', 'gonzalo', 'grady', 'graham', 'guillermo', 'gustavo', 'hal',
  'hans', 'harley', 'harriet', 'harrison', 'heath', 'heriberto', 'humberto', 'ignacio', 'ira', 'ismael',
  'israel', 'jacinto', 'jaime', 'jake', 'jamey', 'jamie', 'jan', 'jarvis', 'jay', 'jean',
  'jed', 'jefferson', 'jeffry', 'jennie', 'jerald', 'jeremiah', 'jermaine', 'jerrod', 'jerry', 'jess',
  'jessie', 'jesus', 'jewel', 'joaquin', 'jody', 'joey', 'johnie', 'jon', 'jonathon', 'jordon',
  'julian', 'julio', 'junior', 'kareem', 'kasey', 'kelley', 'kelvin', 'kermit', 'keven', 'kieran',
  'korey', 'kraig', 'kris', 'kristopher', 'lamar', 'lamont', 'lanny', 'lars', 'latrell', 'laurie',
  'lavern', 'laverne', 'lawanda', 'lawerence', 'lazaro', 'leandro', 'leland', 'lemuel', 'lenard', 'lennon'
]);

// Realtor domain patterns
const REALTOR_DOMAINS = [
  'kw.com', 'compass.com', 'remax.net', 'century21.com', 'coldwellbanker.com',
  'exprealty.com', 'bhhs.com', 'bhhscal.com', 'firstteam.com', 'cbre.com',
  'c21be.com', 'cbdfw.com', 'engelvoelkers.com', 'sothebysrealty.com',
  'cbnorcal.com', 'camoves.com', 'pmz.com', 'intero.com', 'interorealestate.com',
  'berkshirehathaway.com', 'era.com', 'weichert.com', 'kellerwilliams.com',
  'realogy.com', 'homesmart.com', 'fathomrealty.com', 'nextage.com',
  'redfin.com', 'opendoor.com', 'better.com', 'homepoint.com',
  'corcoran.com', 'elliman.com', 'stribling.com', 'halstead.com',
  'windermere.com', 'johncleek.com', 'trowelpride.com', 'svn.com',
  'marcusmillichap.com', 'costar.com', 'cushwake.com', 'jll.com', 'cresa.com',
  'kwrealty.com', 'remaxintegra.com', 'hfrealtor.com', 'realtyexecutives.com',
  'atlasre.com', 'bfrealtygroup.com', 'c21hf.com', 'cbhmrealty.com',
  'cbp1.com', 'connectathome.com', 'd1homeloans.com', 'homeserviceslending.com'
];

const REALTOR_PATTERNS = ['realty', 'realtor', 'realestate', 'homes', 'properties', 'broker', 'sells', 'agent', 'listings', 'mls'];
const LENDER_PATTERNS = ['mortgage', 'lending', 'loan', 'loans', 'finance', 'funding', 'homepoint', 'lend'];
const ATTORNEY_PATTERNS = ['law', 'legal', 'attorney', 'lawyer', 'esq', 'lawfirm'];
const TITLE_PATTERNS = ['title', 'escrow', 'closing', 'settlement'];
const INSURANCE_PATTERNS = ['insurance', 'insure', 'allstate', 'statefarm', 'geico', 'farmers'];
const BUILDER_PATTERNS = ['builder', 'construction', 'develop', 'homes'];
const APPRAISER_PATTERNS = ['apprais', 'valuation'];

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx] || '');
    results.push(row);
  }
  return results;
}

function extractNameFromEmail(email) {
  if (!email || !email.includes('@')) return null;

  const localPart = email.split('@')[0].toLowerCase();

  if (localPart.length < 4) return null;
  if (/^\d+$/.test(localPart)) return null;
  if (/^(info|admin|sales|contact|support|hello|office|team|service)/.test(localPart)) return null;

  // Pattern 1: firstname.lastname@
  if (localPart.includes('.')) {
    const parts = localPart.split('.');
    if (parts.length >= 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2 && !/^\d/.test(parts[0]) && !/^\d/.test(parts[1])) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'high'
        };
      }
    }
  }

  // Pattern 2: firstname_lastname@
  if (localPart.includes('_')) {
    const parts = localPart.split('_');
    if (parts.length >= 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'high'
        };
      }
    }
  }

  // Pattern 3: firstname-lastname@ (but not if it looks like a business)
  if (localPart.includes('-') && !localPart.startsWith('-')) {
    const parts = localPart.split('-');
    if (parts.length === 2) {
      const first = parts[0].replace(/[^a-z]/g, '');
      const last = parts[1].replace(/[^a-z]/g, '');
      if (first.length >= 2 && last.length >= 2 && !/\d/.test(first) && !REALTOR_PATTERNS.some(p => last.includes(p))) {
        return {
          firstName: first.charAt(0).toUpperCase() + first.slice(1),
          lastName: last.charAt(0).toUpperCase() + last.slice(1),
          confidence: 'medium'
        };
      }
    }
  }

  // Pattern 4: firstnamelastname@ (known first names only)
  const cleaned = localPart.replace(/[^a-z]/g, '');

  for (const firstName of commonFirstNames) {
    if (cleaned.startsWith(firstName) && cleaned.length > firstName.length + 2) {
      const lastName = cleaned.substring(firstName.length);
      // Filter out business-like suffixes
      if (lastName.length >= 3 && lastName.length <= 12 && /^[a-z]+$/.test(lastName) &&
          !REALTOR_PATTERNS.some(p => lastName.includes(p)) &&
          !LENDER_PATTERNS.some(p => lastName.includes(p)) &&
          !lastName.includes('home') && !lastName.includes('team') && !lastName.includes('group')) {
        return {
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          confidence: 'medium'
        };
      }
    }
  }

  return null;
}

function identifyProfession(email) {
  if (!email) return 'Unknown';

  const domain = email.split('@')[1]?.toLowerCase() || '';
  const localPart = email.split('@')[0]?.toLowerCase() || '';
  const full = email.toLowerCase();

  if (REALTOR_DOMAINS.some(d => domain.includes(d.replace('.com', '').replace('.net', '')))) return 'Realtor';
  if (REALTOR_PATTERNS.some(p => full.includes(p))) return 'Realtor';
  if (LENDER_PATTERNS.some(p => full.includes(p))) return 'Lender';
  if (ATTORNEY_PATTERNS.some(p => full.includes(p))) return 'Attorney';
  if (TITLE_PATTERNS.some(p => full.includes(p))) return 'Title/Escrow';
  if (INSURANCE_PATTERNS.some(p => full.includes(p))) return 'Insurance';
  if (BUILDER_PATTERNS.some(p => domain.includes(p))) return 'Builder';
  if (APPRAISER_PATTERNS.some(p => full.includes(p))) return 'Appraiser';

  return 'Unknown';
}

// Find source files
const files = fs.readdirSync(downloadsDir).filter(f =>
  f.endsWith('.csv') &&
  !f.includes('V2') &&
  !f.includes('V3') &&
  !f.includes('parsed') &&
  !f.includes('enriched') &&
  !f.includes('CLEANED') &&
  !f.includes('FINAL') &&
  !f.includes('FOR-GHL') &&
  (f.includes('Leads-') || f.includes('Realtors') || f.startsWith('CA-') || f.startsWith('AZ-'))
);

console.log('');
console.log('='.repeat(65));
console.log('  FULL NAME ENRICHMENT - Processing All Contacts');
console.log('='.repeat(65));
console.log('');

const allContacts = [];
const seenEmails = new Set();
let stats = {
  total: 0,
  enrichedHigh: 0,
  enrichedMedium: 0,
  notEnriched: 0,
  byProfession: {}
};

files.forEach(file => {
  console.log(`  Processing: ${file}`);
  try {
    const content = fs.readFileSync(path.join(downloadsDir, file), 'utf-8');
    const contacts = parseCSV(content);
    let fileCount = 0;

    contacts.forEach(c => {
      const email = (c['email'] || '').trim();
      if (!email || !email.includes('@')) return;

      const emailLower = email.toLowerCase();
      if (seenEmails.has(emailLower)) return;
      seenEmails.add(emailLower);

      stats.total++;
      fileCount++;

      // Extract name from email
      const extracted = extractNameFromEmail(email);

      // Identify profession
      const profession = identifyProfession(email);
      stats.byProfession[profession] = (stats.byProfession[profession] || 0) + 1;

      // Build enriched contact
      const enriched = {
        firstName: '',
        lastName: '',
        email: email,
        phone: c['phone'] || '',
        profession: profession,
        nameSource: 'none',
        nameConfidence: 'none',
        tags: c['tags'] || '',
        source: c['source'] || file
      };

      if (extracted) {
        enriched.firstName = extracted.firstName;
        enriched.lastName = extracted.lastName;
        enriched.nameSource = 'email_parsed';
        enriched.nameConfidence = extracted.confidence;

        if (extracted.confidence === 'high') {
          stats.enrichedHigh++;
        } else {
          stats.enrichedMedium++;
        }
      } else {
        stats.notEnriched++;
      }

      allContacts.push(enriched);
    });

    console.log(`    → ${fileCount.toLocaleString()} unique contacts`);
  } catch (e) {
    console.log(`    Error: ${e.message}`);
  }
});

console.log('');
console.log('  ' + '-'.repeat(55));
console.log(`  Total Unique Contacts: ${stats.total.toLocaleString()}`);
console.log('');

// Save enriched contacts by category
function toCSV(contacts) {
  if (contacts.length === 0) return '';
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Profession', 'Name Confidence', 'Tags', 'Source'];
  const rows = contacts.map(c => [
    `"${c.firstName}"`,
    `"${c.lastName}"`,
    `"${c.email}"`,
    `"${c.phone}"`,
    `"${c.profession}"`,
    `"${c.nameConfidence}"`,
    `"${c.tags}"`,
    `"${c.source}"`
  ].join(','));
  return headers.join(',') + '\n' + rows.join('\n');
}

// Split by name confidence
const highConfidence = allContacts.filter(c => c.nameConfidence === 'high');
const mediumConfidence = allContacts.filter(c => c.nameConfidence === 'medium');
const noName = allContacts.filter(c => c.nameConfidence === 'none');

// Split by profession
const realtors = allContacts.filter(c => c.profession === 'Realtor');
const lenders = allContacts.filter(c => c.profession === 'Lender');
const attorneys = allContacts.filter(c => c.profession === 'Attorney');
const titleEscrow = allContacts.filter(c => c.profession === 'Title/Escrow');
const unknown = allContacts.filter(c => c.profession === 'Unknown');

// Save files
console.log('  Saving enriched files...');

fs.writeFileSync(path.join(outputDir, 'All-Contacts-Enriched.csv'), toCSV(allContacts));
console.log(`    → All-Contacts-Enriched.csv (${allContacts.length.toLocaleString()})`);

fs.writeFileSync(path.join(outputDir, 'Names-High-Confidence.csv'), toCSV(highConfidence));
console.log(`    → Names-High-Confidence.csv (${highConfidence.length.toLocaleString()})`);

fs.writeFileSync(path.join(outputDir, 'Names-Medium-Confidence.csv'), toCSV(mediumConfidence));
console.log(`    → Names-Medium-Confidence.csv (${mediumConfidence.length.toLocaleString()})`);

fs.writeFileSync(path.join(outputDir, 'Names-Not-Found.csv'), toCSV(noName));
console.log(`    → Names-Not-Found.csv (${noName.length.toLocaleString()})`);

fs.writeFileSync(path.join(outputDir, 'Realtors-Enriched.csv'), toCSV(realtors));
console.log(`    → Realtors-Enriched.csv (${realtors.length.toLocaleString()})`);

fs.writeFileSync(path.join(outputDir, 'Lenders-Enriched.csv'), toCSV(lenders));
console.log(`    → Lenders-Enriched.csv (${lenders.length.toLocaleString()})`);

if (attorneys.length > 0) {
  fs.writeFileSync(path.join(outputDir, 'Attorneys-Enriched.csv'), toCSV(attorneys));
  console.log(`    → Attorneys-Enriched.csv (${attorneys.length.toLocaleString()})`);
}

if (titleEscrow.length > 0) {
  fs.writeFileSync(path.join(outputDir, 'Title-Escrow-Enriched.csv'), toCSV(titleEscrow));
  console.log(`    → Title-Escrow-Enriched.csv (${titleEscrow.length.toLocaleString()})`);
}

fs.writeFileSync(path.join(outputDir, 'Unknown-Profession.csv'), toCSV(unknown));
console.log(`    → Unknown-Profession.csv (${unknown.length.toLocaleString()})`);

// Realtors with names
const realtorsWithNames = realtors.filter(c => c.nameConfidence !== 'none');
fs.writeFileSync(path.join(outputDir, 'Realtors-With-Names.csv'), toCSV(realtorsWithNames));
console.log(`    → Realtors-With-Names.csv (${realtorsWithNames.length.toLocaleString()})`);

console.log('');
console.log('  ' + '='.repeat(55));
console.log('  SUMMARY');
console.log('  ' + '='.repeat(55));
console.log('');
console.log(`  Total Contacts:           ${stats.total.toLocaleString()}`);
console.log('');
console.log('  NAME EXTRACTION:');
console.log(`    High Confidence:        ${stats.enrichedHigh.toLocaleString()} (${(stats.enrichedHigh/stats.total*100).toFixed(1)}%)`);
console.log(`    Medium Confidence:      ${stats.enrichedMedium.toLocaleString()} (${(stats.enrichedMedium/stats.total*100).toFixed(1)}%)`);
console.log(`    Not Extractable:        ${stats.notEnriched.toLocaleString()} (${(stats.notEnriched/stats.total*100).toFixed(1)}%)`);
console.log('');
console.log('  BY PROFESSION:');
Object.entries(stats.byProfession).sort((a,b) => b[1] - a[1]).forEach(([prof, count]) => {
  console.log(`    ${prof.padEnd(18)} ${count.toLocaleString().padStart(10)}`);
});
console.log('');
console.log(`  Files saved to: ${outputDir}`);
console.log('');
console.log('='.repeat(65));

// Save summary
const summary = {
  total: stats.total,
  enrichedHigh: stats.enrichedHigh,
  enrichedMedium: stats.enrichedMedium,
  notEnriched: stats.notEnriched,
  byProfession: stats.byProfession,
  outputDir: outputDir
};
fs.writeFileSync(path.join(outputDir, 'enrichment-summary.json'), JSON.stringify(summary, null, 2));
