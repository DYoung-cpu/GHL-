const fs = require('fs');
const pf = JSON.parse(fs.readFileSync('./data/priority-contacts.json'));
const contacts = pf.contacts || [];

// Categorize all business domains
const categories = {
  'Mortgage Lenders/Competitors': [],
  'Title/Escrow': [],
  'Realtors': [],
  'Insurance': [],
  'Appraisal': [],
  'Credit Vendors': [],
  'Tech/Software': [],
  'Marketing/Lead Gen': [],
  'Recruiting': [],
  'Banks': [],
  'Other': []
};

const patterns = {
  'Mortgage Lenders/Competitors': ['mortgage', 'lending', 'loan', 'home', 'rate.com', 'quicken', 'movement', 'guild', 'fairway', 'loandepot', 'ccm.com', 'nafinc', 'cardinal', 'homebridge', 'cmgfi', 'apmortgage', 'atlantic', 'lennar', 'motto', 'newrez', 'pennymac', 'freedom', 'crosscountry', 'caliber', 'amerihome', 'nationstar', 'mrcooper', 'uwm.com', 'rocketmortgage', 'boh.com', 'empire', 'loancare', 'shellpoint', 'bayequity', 'amres', 'phh.com', 'guaranteed', 'newhomefunding', 'prmi.com', 'academymortgage', 'fgmc.com'],
  'Title/Escrow': ['title', 'escrow', 'firstam', 'fidelity', 'stewart', 'oldrepublic', 'chicagotitle', 'ticor', 'landamerica'],
  'Realtors': ['realty', 'realtor', 'realestate', 'kw.com', 'compass', 'coldwell', 'century21', 'remax', 'bhhs', 'sotheby', 'berkshire', 'exp.com', 'zillow', 'trulia', 'redfinagent'],
  'Insurance': ['insurance', 'allstate', 'statefarm', 'geico', 'farmers', 'liberty', 'progressive'],
  'Appraisal': ['appraisal', 'appraise', 'valuation', 'amc.com'],
  'Credit Vendors': ['credit', 'equifax', 'experian', 'transunion', 'fico', 'creditreport', 'mergepoint'],
  'Tech/Software': ['floify', 'blend', 'encompass', 'calyx', 'zendesk', 'salesforce', 'hubspot', 'bigpurpledot', 'zapier', 'docusign', 'docmagic', 'ellie', 'icemortgage', 'optimal', 'blackknight'],
  'Marketing/Lead Gen': ['marketing', 'media', 'social', 'brand', 'leads', 'zillow', 'lending', 'nextdoor', 'bankrate', 'nerdwallet', 'freerateupdates'],
  'Recruiting': ['recruit', 'talent', 'staffing', 'career', 'hiring'],
  'Banks': ['bank', 'chase', 'wells', 'bofa', 'citi', 'usbank', 'pnc', 'regions', 'suntrust', 'td.com', 'capitalone', 'unionbank']
};

const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'icloud.com', 'outlook.com', 'me.com', 'msn.com', 'comcast.net', 'sbcglobal.net', 'att.net', 'verizon.net', 'live.com', 'ymail.com', 'rocketmail.com'];

// Extract domains
const domains = {};
contacts.forEach(c => {
  const email = (c.email || c.name || '').toLowerCase();
  const match = email.match(/@([a-z0-9.-]+)/);
  if (match) {
    const domain = match[1];
    domains[domain] = (domains[domain] || 0) + 1;
  }
});

// Categorize each domain
Object.entries(domains).forEach(([domain, count]) => {
  if (personalDomains.includes(domain) || domain.includes('priorityfinancial') || domain.includes('onenation')) return;

  let found = false;
  for (const [cat, keywords] of Object.entries(patterns)) {
    if (keywords.some(k => domain.includes(k))) {
      categories[cat].push({ domain, count });
      found = true;
      break;
    }
  }
  if (found === false) {
    categories['Other'].push({ domain, count });
  }
});

// Print results
console.log('=== PRIORITY FINANCIAL - BUSINESS DOMAIN BREAKDOWN ===\n');

let totalMortgage = 0;
let totalVendors = 0;
let totalPartners = 0;
let totalOther = 0;

for (const [cat, items] of Object.entries(categories)) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (total === 0) continue;

  // Track totals
  if (cat === 'Mortgage Lenders/Competitors') totalMortgage = total;
  else if (['Title/Escrow', 'Appraisal', 'Credit Vendors', 'Tech/Software'].includes(cat)) totalVendors += total;
  else if (['Realtors', 'Insurance', 'Banks'].includes(cat)) totalPartners += total;
  else totalOther += total;

  console.log(cat.toUpperCase() + ': ' + total + ' contacts');
  items.sort((a,b) => b.count - a.count).slice(0, 10).forEach(i => {
    console.log('    ' + i.count.toString().padStart(3) + '  ' + i.domain);
  });
  if (items.length > 10) console.log('    ... and ' + (items.length - 10) + ' more domains');
  console.log('');
}

console.log('='.repeat(55));
console.log('RECOMMENDATION SUMMARY:');
console.log('='.repeat(55));
console.log('');
console.log('  EXCLUDE (competitors, no value):     ' + totalMortgage);
console.log('  TAG AS VENDOR (useful contacts):     ' + totalVendors);
console.log('  TAG AS PARTNER (referral potential): ' + totalPartners);
console.log('  NEEDS MANUAL REVIEW:                 ' + totalOther);
