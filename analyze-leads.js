const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      records.push(record);
    }
  }
  return { headers, records };
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

async function analyzeFile(filePath, label) {
  console.log('\n' + '='.repeat(60));
  console.log(`ANALYZING: ${label}`);
  console.log('='.repeat(60));

  const content = fs.readFileSync(filePath, 'utf-8');
  const { headers, records } = parseCSV(content);

  console.log(`\nTotal Records: ${records.length}`);
  console.log(`Total Columns: ${headers.length}`);

  // Count by type
  let hasEmail = 0;
  let hasPhone = 0;
  let hasAddress = 0;
  let hasEmployer = 0;
  let hasBirthday = 0;
  let hasCreditScore = 0;
  let hasSpouse = 0;

  const leadSources = {};
  const leadStatuses = {};
  const owners = {};

  records.forEach(r => {
    if (r['Email']) hasEmail++;
    if (r['Phone Cell'] || r['Phone Home'] || r['Phone Office']) hasPhone++;
    if (r['Address'] || r['City']) hasAddress++;
    if (r['Employer']) hasEmployer++;
    if (r['Birthday']) hasBirthday++;
    if (r['Credit Score']) hasCreditScore++;
    if (r['Spouse First Name']) hasSpouse++;

    const source = r['Lead Source'] || '(none)';
    leadSources[source] = (leadSources[source] || 0) + 1;

    const status = r['Lead Status'] || '(none)';
    leadStatuses[status] = (leadStatuses[status] || 0) + 1;

    const owner = r['Owner'] || '(none)';
    owners[owner] = (owners[owner] || 0) + 1;
  });

  console.log('\n📊 DATA COMPLETENESS:');
  console.log(`  Has Email: ${hasEmail} (${Math.round(hasEmail/records.length*100)}%)`);
  console.log(`  Has Phone: ${hasPhone} (${Math.round(hasPhone/records.length*100)}%)`);
  console.log(`  Has Address: ${hasAddress} (${Math.round(hasAddress/records.length*100)}%)`);
  console.log(`  Has Employer: ${hasEmployer} (${Math.round(hasEmployer/records.length*100)}%)`);
  console.log(`  Has Birthday: ${hasBirthday} (${Math.round(hasBirthday/records.length*100)}%)`);
  console.log(`  Has Credit Score: ${hasCreditScore} (${Math.round(hasCreditScore/records.length*100)}%)`);
  console.log(`  Has Spouse Info: ${hasSpouse} (${Math.round(hasSpouse/records.length*100)}%)`);

  console.log('\n📈 BY LEAD SOURCE:');
  Object.entries(leadSources).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  console.log('\n🏷️ BY LEAD STATUS:');
  Object.entries(leadStatuses).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  console.log('\n👤 BY OWNER:');
  Object.entries(owners).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  // Categorize contacts
  const referralPartners = records.filter(r => r['Employer'] && !r['Credit Score']);
  const actualLeads = records.filter(r => r['Credit Score'] || (r['Address'] && !r['Employer']));
  const emailOnly = records.filter(r => r['Email'] && !r['Phone Cell'] && !r['Address']);

  console.log('\n📂 CATEGORIZATION:');
  console.log(`  Likely Referral Partners (has Employer, no Credit Score): ${referralPartners.length}`);
  console.log(`  Likely Actual Leads (has Credit Score or Address w/o Employer): ${actualLeads.length}`);
  console.log(`  Email-only contacts: ${emailOnly.length}`);

  // Sample records
  console.log('\n📝 SAMPLE ACTUAL LEADS (first 5):');
  actualLeads.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r['First Name']} ${r['Last Name']} - ${r['Email'] || r['Phone Cell'] || '(no contact)'}`);
    if (r['Address']) console.log(`     Address: ${r['Address']}, ${r['City']}, ${r['State']} ${r['Zip']}`);
    if (r['Credit Score']) console.log(`     Credit: ${r['Credit Score']}`);
  });

  console.log('\n📝 SAMPLE REFERRAL PARTNERS (first 5):');
  referralPartners.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r['First Name']} ${r['Last Name']} - ${r['Employer']}`);
    console.log(`     ${r['Phone Office'] || r['Phone Cell'] || '(no phone)'}`);
  });

  return { records, referralPartners, actualLeads };
}

async function main() {
  const file1 = '/mnt/c/Users/dyoun/Downloads/Leads-2025-05-29 (2).csv';
  const file2 = '/mnt/c/Users/dyoun/Downloads/Leads-2025-05-29 (3).csv';

  const result1 = await analyzeFile(file1, 'File 1 - Alberto Martinez Leads');
  const result2 = await analyzeFile(file2, 'File 2 - David Young Leads');

  console.log('\n' + '='.repeat(60));
  console.log('COMBINED SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Records: ${result1.records.length + result2.records.length}`);
  console.log(`Total Referral Partners: ${result1.referralPartners.length + result2.referralPartners.length}`);
  console.log(`Total Actual Leads: ${result1.actualLeads.length + result2.actualLeads.length}`);

  console.log('\n✅ FIELDS NEEDED TO CREATE IN GHL:');
  console.log('  - Credit Score (TEXT)');
  console.log('  - Credit Score Date (DATE)');
  console.log('  - Lead Status (DROPDOWN)');
  console.log('  - Employer (TEXT)');
  console.log('  - Employer Address (TEXT)');
  console.log('  - Employer City (TEXT)');
  console.log('  - Employer State (TEXT)');
  console.log('  - Employer Zip (TEXT)');
  console.log('  - Anniversary (DATE)');
  console.log('  - Spouse First Name (TEXT)');
  console.log('  - Spouse Last Name (TEXT)');
  console.log('  - Spouse Email (TEXT)');
  console.log('  - Spouse Phone (PHONE)');
  console.log('  - Spouse Birthday (DATE)');
  console.log('  - Contact Type (DROPDOWN: Lead, Referral Partner, Past Client)');
  console.log('  - Original Lead Source (TEXT)');
  console.log('  - Original Creation Date (DATE)');
}

main().catch(console.error);
