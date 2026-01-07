/**
 * Analyze data quality issues in the enrichment cache
 */

const fs = require('fs');
const path = require('path');

const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/enrichment-cache.json')));

// Find duplicates by name
const byName = {};
Object.entries(cache).forEach(([email, data]) => {
  const name = (data.name || '').toLowerCase().trim();
  if (name && name.length > 3) {
    if (!byName[name]) byName[name] = [];
    byName[name].push({ email, ...data });
  }
});

console.log('=== DUPLICATES BY NAME ===');
Object.entries(byName).filter(([n, arr]) => arr.length > 1).slice(0, 15).forEach(([name, contacts]) => {
  console.log(name + ' (' + contacts.length + ' entries):');
  contacts.forEach(c => console.log('  - ' + c.email));
});

// Find customer service type emails
console.log('\n=== CUSTOMER SERVICE EMAILS (should be removed) ===');
const csPatterns = /^(customerservice|customer-service|support|noreply|no-reply|info|news|team|marketing|notifications|alerts|admin|webmaster|postmaster|mailer-daemon|reply|do-not-reply|donotreply)@/i;
const csEmails = Object.keys(cache).filter(e => csPatterns.test(e));
console.log('Found: ' + csEmails.length);
csEmails.slice(0, 20).forEach(e => console.log('  ' + e));

// Find mortgage domain emails not tagged as loan_officer
console.log('\n=== MORTGAGE DOMAINS NOT TAGGED AS LO ===');
const mtgPattern = /(mortgage|mtg|lending|lend|loan|home)/i;
const mtgNotLO = Object.entries(cache).filter(([email, data]) => {
  const domain = email.split('@')[1] || '';
  return mtgPattern.test(domain) && data.classification?.type !== 'loan_officer';
});
console.log('Found: ' + mtgNotLO.length);
mtgNotLO.slice(0, 15).forEach(([email, data]) => {
  console.log('  ' + email + ' -> ' + (data.classification?.type || 'unknown'));
});

// Check for mixed-up phone numbers (same phone on multiple contacts)
console.log('\n=== SHARED PHONE NUMBERS (possible data mixing) ===');
const byPhone = {};
Object.entries(cache).forEach(([email, data]) => {
  (data.phones || []).forEach(phone => {
    if (!byPhone[phone]) byPhone[phone] = [];
    byPhone[phone].push(email);
  });
});
Object.entries(byPhone).filter(([p, arr]) => arr.length > 1).slice(0, 10).forEach(([phone, emails]) => {
  console.log(phone + ':');
  emails.forEach(e => console.log('  - ' + e));
});

// Summary
console.log('\n=== SUMMARY ===');
console.log('Total contacts: ' + Object.keys(cache).length);
console.log('Duplicate names: ' + Object.entries(byName).filter(([n, arr]) => arr.length > 1).length);
console.log('Customer service emails: ' + csEmails.length);
console.log('Mortgage domains not as LO: ' + mtgNotLO.length);
console.log('Shared phone numbers: ' + Object.entries(byPhone).filter(([p, arr]) => arr.length > 1).length);
