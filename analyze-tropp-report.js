/**
 * Analyze Tropp Leads for PDF Report
 */

const fs = require('fs');

function parseCSV(filepath) {
  const data = fs.readFileSync(filepath, 'utf-8');
  const lines = data.split('\n').slice(1).filter(l => l.trim());

  return lines.map(line => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    fields.push(current);
    return fields;
  });
}

// Analyze all categories
const categories = ['Realtor', 'Unknown', 'Lender', 'Attorney', 'Title-Escrow', 'Builder-Developer', 'Insurance', 'Appraiser'];

const report = {
  total: 0,
  byCategory: {},
  realtorsBySource: {},
  realtorsByState: {},
  missingNames: { total: 0, byCategory: {} }
};

categories.forEach(cat => {
  const filepath = `/mnt/c/Users/dyoun/Downloads/Paul-Tropp-V2-${cat}.csv`;
  try {
    const rows = parseCSV(filepath);
    const count = rows.length;
    report.total += count;
    report.byCategory[cat] = count;

    // Count missing names
    let missing = 0;
    rows.forEach(fields => {
      const firstName = fields[0];
      if (firstName === 'Unknown' || !firstName) missing++;

      if (cat === 'Realtor') {
        const state = fields[4];
        const source = fields[6];
        report.realtorsBySource[source] = (report.realtorsBySource[source] || 0) + 1;
        if (state) {
          report.realtorsByState[state] = (report.realtorsByState[state] || 0) + 1;
        }
      }
    });

    report.missingNames.byCategory[cat] = missing;
    report.missingNames.total += missing;
  } catch (err) {
    console.error(`Error processing ${cat}:`, err.message);
  }
});

// Output report
console.log('\n========================================');
console.log('   PAUL TROPP LEADS - COMPLETE REPORT');
console.log('========================================\n');

console.log('TOTAL CONTACTS:', report.total.toLocaleString());
console.log('');

console.log('--- BY CATEGORY ---');
Object.entries(report.byCategory)
  .sort((a,b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / report.total) * 100).toFixed(1);
    console.log(`  ${cat.padEnd(20)} ${count.toLocaleString().padStart(10)}  (${pct}%)`);
  });

console.log('\n--- REALTORS BY SOURCE ---');
Object.entries(report.realtorsBySource)
  .sort((a,b) => b[1] - a[1])
  .forEach(([source, count]) => {
    console.log(`  ${source.padEnd(20)} ${count.toLocaleString().padStart(10)}`);
  });

console.log('\n--- REALTORS BY STATE ---');
if (Object.keys(report.realtorsByState).length > 0) {
  Object.entries(report.realtorsByState)
    .sort((a,b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state.padEnd(10)} ${count.toLocaleString().padStart(10)}`);
    });
} else {
  console.log('  (State data only available for state-specific files)');
}

console.log('\n--- CONTACTS MISSING NAMES ---');
console.log(`  TOTAL: ${report.missingNames.total.toLocaleString()}`);
Object.entries(report.missingNames.byCategory)
  .filter(([cat, count]) => count > 0)
  .sort((a,b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const total = report.byCategory[cat];
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`    ${cat.padEnd(20)} ${count.toLocaleString().padStart(10)} / ${total.toLocaleString()} (${pct}%)`);
  });

console.log('\n========================================\n');

// Export as JSON for PDF generation
fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/tropp-report-data.json', JSON.stringify(report, null, 2));
console.log('Report data saved to tropp-report-data.json');
