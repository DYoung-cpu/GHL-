/**
 * Generate PDF Report for Paul Tropp Leads
 */

const fs = require('fs');

// Report data
const report = {
  generatedAt: new Date().toLocaleString(),

  totalContacts: 606131,

  byCategory: {
    'Realtor': 211691,
    'Personal Email (Unknown)': 386006,
    'Lender': 5437,
    'Attorney': 1168,
    'Title/Escrow': 557,
    'Builder/Developer': 528,
    'Insurance': 372,
    'Appraiser': 372
  },

  realtorsByState: {
    'California (CA)': 57840,
    'Florida (FL)': 21822,
    'Texas (TX)': 17831,
    'Arizona (AZ)': 10287,
    'Nevada (NV)': 5397,
    'No State (AdRoll)': 98514
  },

  realtorsBySource: {
    'California Realtors': 57840,
    'AdRoll 15-18': 36235,
    'Florida Realtors': 21816,
    'AdRoll 7-10': 21065,
    'AdRoll 3-6': 20892,
    'AdRoll 11-14': 20322,
    'Texas Realtors': 17831,
    'AZ-NV Realtors': 15690
  },

  nameQuality: {
    'High Confidence (parsed firstname.lastname)': 64258,
    'Medium Confidence (parsed patterns)': 46318,
    'Original Names (State files - real)': 205464,
    'Original Names (AdRoll - potentially fake)': 290091
  },

  contactsWithMismatchedNames: 290091,
  percentMismatched: '47.9%'
};

// Generate HTML report (can be printed to PDF)
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Paul Tropp Leads Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
    .summary-box { background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .big-number { font-size: 48px; font-weight: bold; color: #2980b9; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #bdc3c7; padding: 12px; text-align: left; }
    th { background: #3498db; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .highlight { background: #fff3cd; }
    .warning { color: #e74c3c; font-weight: bold; }
    .success { color: #27ae60; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; color: #7f8c8d; font-size: 12px; }
    .percent { color: #7f8c8d; font-size: 14px; }
  </style>
</head>
<body>

<h1>📊 Paul Tropp Leads - Complete Analysis Report</h1>
<p><strong>Generated:</strong> ${report.generatedAt}</p>

<div class="summary-box">
  <div class="big-number">${report.totalContacts.toLocaleString()}</div>
  <p>Total Contacts in Database</p>
</div>

<h2>📁 Breakdown by Category</h2>
<table>
  <tr>
    <th>Category</th>
    <th>Count</th>
    <th>Percentage</th>
  </tr>
  ${Object.entries(report.byCategory).map(([cat, count]) => {
    const pct = ((count / report.totalContacts) * 100).toFixed(1);
    return `<tr><td>${cat}</td><td>${count.toLocaleString()}</td><td>${pct}%</td></tr>`;
  }).join('\n')}
</table>

<h2>🏠 Realtors by State</h2>
<table>
  <tr>
    <th>State</th>
    <th>Count</th>
    <th>Percentage of Realtors</th>
  </tr>
  ${Object.entries(report.realtorsByState).map(([state, count]) => {
    const pct = ((count / 211691) * 100).toFixed(1);
    return `<tr><td>${state}</td><td>${count.toLocaleString()}</td><td>${pct}%</td></tr>`;
  }).join('\n')}
</table>

<h2>📤 Realtors by Source</h2>
<table>
  <tr>
    <th>Source</th>
    <th>Count</th>
  </tr>
  ${Object.entries(report.realtorsBySource).map(([source, count]) => {
    return `<tr><td>${source}</td><td>${count.toLocaleString()}</td></tr>`;
  }).join('\n')}
</table>

<h2>👤 Name Quality Analysis</h2>
<table>
  <tr>
    <th>Name Quality</th>
    <th>Count</th>
    <th>Percentage</th>
  </tr>
  ${Object.entries(report.nameQuality).map(([quality, count]) => {
    const pct = ((count / report.totalContacts) * 100).toFixed(1);
    const cls = quality.includes('fake') ? 'class="highlight"' : '';
    return `<tr ${cls}><td>${quality}</td><td>${count.toLocaleString()}</td><td>${pct}%</td></tr>`;
  }).join('\n')}
</table>

<div class="summary-box">
  <h3>⚠️ Contacts with Potentially Mismatched Names</h3>
  <div class="big-number warning">${report.contactsWithMismatchedNames.toLocaleString()}</div>
  <p>${report.percentMismatched} of total contacts have names from AdRoll that may not match the email address</p>
  <p><small>These contacts were scraped from ads - the "First Name" and "Last Name" fields contain random/fake data that doesn't correspond to the actual email owner.</small></p>
</div>

<h2>📋 Summary</h2>
<ul>
  <li><strong>Identified Professionals:</strong> ${(report.totalContacts - 386006).toLocaleString()} (${((report.totalContacts - 386006) / report.totalContacts * 100).toFixed(1)}%)</li>
  <li><strong>Personal Emails (Unknown profession):</strong> 386,006 (63.7%)</li>
  <li><strong>Realtors with State Data:</strong> ${(211691 - 98514).toLocaleString()} contacts</li>
  <li><strong>Names Successfully Parsed from Email:</strong> ${(64258 + 46318).toLocaleString()} contacts</li>
  <li><strong>Names That May Be Incorrect:</strong> 290,091 contacts</li>
</ul>

<div class="footer">
  <p>Report generated by GHL Automation System</p>
  <p>Data source: Paul Tropp AdRoll leads + State-specific realtor lists</p>
</div>

</body>
</html>
`;

// Save HTML file
fs.writeFileSync('/mnt/c/Users/dyoun/Downloads/Paul-Tropp-Leads-Report.html', html);
console.log('Report saved to: /mnt/c/Users/dyoun/Downloads/Paul-Tropp-Leads-Report.html');
console.log('Open in browser and print to PDF');
