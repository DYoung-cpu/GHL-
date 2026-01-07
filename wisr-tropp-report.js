/**
 * WISR Parse™ - Paul Tropp Leads Professional Report
 * Good / Bad / Ugly Format
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 40, bottom: 40, left: 50, right: 50 }
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/WISR-Parse-Paul-Tropp-Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

// Colors
const primaryBlue = '#1a5f7a';
const accentGold = '#d4a574';
const successGreen = '#2d6a4f';
const warningOrange = '#e67e22';
const dangerRed = '#c0392b';
const darkGray = '#2c3e50';
const lightGray = '#f8f9fa';

// ====== COVER PAGE ======
doc.rect(0, 0, 612, 100).fill(primaryBlue);
doc.fillColor('white').fontSize(32).font('Helvetica-Bold');
doc.text('WISR Parse', 50, 35, { align: 'center' });
doc.fontSize(12).font('Helvetica').text('Data Intelligence & Enrichment', { align: 'center' });

doc.moveDown(4);
doc.fillColor(darkGray).fontSize(24).font('Helvetica-Bold');
doc.text('Lead Database Analysis', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(18).font('Helvetica');
doc.text('Paul Tropp | Gary Sable', { align: 'center' });

doc.moveDown(2);
doc.fillColor(primaryBlue).fontSize(72).font('Helvetica-Bold');
doc.text('606,131', { align: 'center' });
doc.fillColor(darkGray).fontSize(14).font('Helvetica');
doc.text('Total Contacts Processed', { align: 'center' });

doc.moveDown(3);

// Executive Summary Box
const boxY = doc.y;
doc.rect(50, boxY, 512, 120).fill(lightGray);
doc.fillColor(darkGray).fontSize(14).font('Helvetica-Bold');
doc.text('Executive Summary', 70, boxY + 15);
doc.fontSize(11).font('Helvetica');
doc.text('WISR Parse analyzed over 600,000 contacts from multiple data sources', 70, boxY + 38);
doc.text('including state realtor databases and AdRoll marketing campaigns.', 70, boxY + 52);
doc.moveDown();
doc.text('Key Findings:', 70, boxY + 72);
doc.font('Helvetica-Bold').text('211,691', 90, boxY + 88, { continued: true });
doc.font('Helvetica').text(' Real Estate Professionals Identified');
doc.font('Helvetica-Bold').text('110,576', 90, boxY + 102, { continued: true });
doc.font('Helvetica').text(' Real Names Extracted from Email Addresses');

doc.y = boxY + 140;
doc.moveDown();
doc.fontSize(10).fillColor('#7f8c8d');
doc.text('Report Generated: ' + new Date().toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
}), { align: 'center' });

// ====== PAGE 2: THE GOOD ======
doc.addPage();

// Green header bar
doc.rect(0, 0, 612, 60).fill(successGreen);
doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
doc.text('THE GOOD', 50, 18);
doc.fontSize(12).font('Helvetica');
doc.text('What\'s Working in Your Database', 50, 42);

doc.y = 80;

// Section: Professional Breakdown
doc.fillColor(darkGray).fontSize(16).font('Helvetica-Bold');
doc.text('Professional Breakdown');
doc.moveDown(0.5);

const professions = [
  { name: 'Realtors & Agents', count: '211,691', pct: '34.9%', color: successGreen },
  { name: 'Lenders & Loan Officers', count: '5,437', pct: '0.9%', color: primaryBlue },
  { name: 'Attorneys', count: '1,168', pct: '0.2%', color: primaryBlue },
  { name: 'Title & Escrow', count: '557', pct: '0.1%', color: primaryBlue },
  { name: 'Builders & Developers', count: '528', pct: '0.1%', color: primaryBlue },
  { name: 'Insurance Agents', count: '372', pct: '0.1%', color: primaryBlue },
  { name: 'Appraisers', count: '372', pct: '0.1%', color: primaryBlue }
];

let tableY = doc.y;
doc.fontSize(10).font('Helvetica-Bold');
doc.rect(50, tableY, 512, 22).fill(primaryBlue);
doc.fillColor('white');
doc.text('Profession', 60, tableY + 6);
doc.text('Count', 350, tableY + 6);
doc.text('% of Total', 450, tableY + 6);
tableY += 22;

professions.forEach((p, i) => {
  const bgColor = i % 2 === 0 ? lightGray : 'white';
  doc.rect(50, tableY, 512, 22).fill(bgColor);
  doc.fillColor(darkGray).font('Helvetica');
  doc.text(p.name, 60, tableY + 6);
  doc.font('Helvetica-Bold').text(p.count, 350, tableY + 6);
  doc.font('Helvetica').text(p.pct, 450, tableY + 6);
  tableY += 22;
});

doc.y = tableY + 15;

// Section: Geographic Distribution
doc.fillColor(darkGray).fontSize(16).font('Helvetica-Bold');
doc.text('Realtor Geographic Distribution');
doc.fontSize(10).fillColor('#7f8c8d').font('Helvetica');
doc.text('Based on 211,691 identified realtors');
doc.moveDown(0.5);

const states = [
  { state: 'California', count: '57,840', pct: '27.3%' },
  { state: 'Florida', count: '21,822', pct: '10.3%' },
  { state: 'Texas', count: '17,831', pct: '8.4%' },
  { state: 'Arizona', count: '10,287', pct: '4.9%' },
  { state: 'Nevada', count: '5,397', pct: '2.5%' }
];

tableY = doc.y;
doc.rect(50, tableY, 350, 22).fill(successGreen);
doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
doc.text('State', 60, tableY + 6);
doc.text('Realtors', 220, tableY + 6);
doc.text('% of Realtors', 300, tableY + 6);
tableY += 22;

states.forEach((s, i) => {
  const bgColor = i % 2 === 0 ? lightGray : 'white';
  doc.rect(50, tableY, 350, 22).fill(bgColor);
  doc.fillColor(darkGray).font('Helvetica');
  doc.text(s.state, 60, tableY + 6);
  doc.font('Helvetica-Bold').text(s.count, 220, tableY + 6);
  doc.font('Helvetica').text(s.pct, 300, tableY + 6);
  tableY += 22;
});

doc.y = tableY + 20;

// Success highlight box
doc.rect(50, doc.y, 512, 70).fill('#d4edda').stroke('#28a745');
const highlightY = doc.y;
doc.fillColor(successGreen).fontSize(14).font('Helvetica-Bold');
doc.text('110,576 Names Successfully Extracted', 70, highlightY + 12);
doc.fontSize(11).font('Helvetica').fillColor(darkGray);
doc.text('WISR Parse extracted real names from email addresses for contacts', 70, highlightY + 32);
doc.text('that previously had fake or missing name data.', 70, highlightY + 46);

// ====== PAGE 3: THE BAD ======
doc.addPage();

doc.rect(0, 0, 612, 60).fill(warningOrange);
doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
doc.text('THE BAD', 50, 18);
doc.fontSize(12).font('Helvetica');
doc.text('Areas That Need Attention', 50, 42);

doc.y = 80;

doc.fillColor(darkGray).fontSize(16).font('Helvetica-Bold');
doc.text('Unknown Profession Contacts');
doc.moveDown(0.5);

// Warning box
doc.rect(50, doc.y, 512, 90).fill('#fff3cd').stroke('#ffc107');
const warnY = doc.y;
doc.fillColor(warningOrange).fontSize(36).font('Helvetica-Bold');
doc.text('386,006', 70, warnY + 10);
doc.fontSize(12).font('Helvetica').fillColor(darkGray);
doc.text('Contacts with Personal Email Addresses', 70, warnY + 48);
doc.fontSize(10).fillColor('#856404');
doc.text('These contacts use Gmail, Yahoo, AOL, etc. - their profession cannot be', 70, warnY + 65);
doc.text('determined from their email domain alone.', 70, warnY + 77);

doc.y = warnY + 110;

doc.fillColor(darkGray).fontSize(16).font('Helvetica-Bold');
doc.text('Name Quality Issues');
doc.moveDown(0.5);

const nameQuality = [
  { level: 'High Confidence (firstname.lastname@)', count: '64,258', pct: '10.6%', status: 'good' },
  { level: 'Medium Confidence (pattern match)', count: '46,318', pct: '7.6%', status: 'good' },
  { level: 'State Files (verified real names)', count: '205,464', pct: '33.9%', status: 'good' },
  { level: 'AdRoll (potentially mismatched names)', count: '290,091', pct: '47.9%', status: 'bad' }
];

tableY = doc.y;
doc.rect(50, tableY, 512, 22).fill(warningOrange);
doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
doc.text('Name Quality Level', 60, tableY + 6);
doc.text('Count', 370, tableY + 6);
doc.text('Percentage', 460, tableY + 6);
tableY += 22;

nameQuality.forEach((n, i) => {
  const bgColor = n.status === 'bad' ? '#fff3cd' : (i % 2 === 0 ? lightGray : 'white');
  doc.rect(50, tableY, 512, 22).fill(bgColor);
  doc.fillColor(darkGray).font('Helvetica');
  doc.text(n.level, 60, tableY + 6);
  doc.font('Helvetica-Bold').text(n.count, 370, tableY + 6);
  doc.font('Helvetica').text(n.pct, 460, tableY + 6);
  tableY += 22;
});

doc.y = tableY + 20;

doc.fillColor(darkGray).fontSize(11).font('Helvetica');
doc.text('Why are names mismatched?', { underline: true });
doc.moveDown(0.3);
doc.fontSize(10);
doc.text('AdRoll ad campaigns captured email addresses but populated first/last name', { indent: 10 });
doc.text('fields with random placeholder data. Example:', { indent: 10 });
doc.moveDown(0.3);
doc.font('Courier').fontSize(9);
doc.text('  Name in Database: "Piper Lewis"', { indent: 20 });
doc.text('  Actual Email:     lisapatton@aol.com', { indent: 20 });
doc.font('Helvetica').fontSize(10);
doc.moveDown(0.5);
doc.text('WISR Parse corrected 110,576 of these by extracting the real name from', { indent: 10 });
doc.text('parseable email formats (firstname.lastname@domain.com).', { indent: 10 });

// ====== PAGE 4: THE UGLY ======
doc.addPage();

doc.rect(0, 0, 612, 60).fill(dangerRed);
doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
doc.text('THE UGLY', 50, 18);
doc.fontSize(12).font('Helvetica');
doc.text('What Cannot Be Fixed Without Additional Data', 50, 42);

doc.y = 80;

// Big ugly number
doc.rect(50, doc.y, 512, 100).fill('#f8d7da').stroke(dangerRed);
const uglyY = doc.y;
doc.fillColor(dangerRed).fontSize(42).font('Helvetica-Bold');
doc.text('290,091', 70, uglyY + 15);
doc.fontSize(14).font('Helvetica').fillColor(darkGray);
doc.text('Contacts with Unparseable Names', 70, uglyY + 55);
doc.fontSize(10).fillColor('#721c24');
doc.text('47.9% of database has names that cannot be extracted from email address', 70, uglyY + 75);

doc.y = uglyY + 120;

doc.fillColor(darkGray).fontSize(14).font('Helvetica-Bold');
doc.text('Why These Names Cannot Be Fixed');
doc.moveDown(0.5);
doc.fontSize(10).font('Helvetica');
doc.text('Email formats that don\'t contain real names:', { indent: 10 });
doc.moveDown(0.3);
doc.font('Courier').fontSize(9);
doc.text('  xyz123@gmail.com', { indent: 20 });
doc.text('  sunshine99@yahoo.com', { indent: 20 });
doc.text('  coolcat2024@aol.com', { indent: 20 });
doc.text('  jsmith@hotmail.com (ambiguous)', { indent: 20 });

doc.moveDown();
doc.font('Helvetica').fontSize(10);
doc.text('These contacts require one of the following to fix:', { indent: 10 });
doc.moveDown(0.3);
doc.text('1. Email verification service that returns owner name', { indent: 20 });
doc.text('2. Social media lookup by email address', { indent: 20 });
doc.text('3. Direct user input via form submission', { indent: 20 });
doc.text('4. Append service (paid data enrichment)', { indent: 20 });

doc.moveDown();
doc.fillColor(primaryBlue).fontSize(12).font('Helvetica-Bold');
doc.text('Recommendation: Email Bounce Test');
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(darkGray);
doc.text('Before investing in data enrichment, run an email validation test to remove', { indent: 10 });
doc.text('invalid/bounced addresses. This could eliminate 10-30% of problematic contacts.', { indent: 10 });

// ====== PAGE 5: SUMMARY ======
doc.addPage();

doc.rect(0, 0, 612, 60).fill(primaryBlue);
doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
doc.text('SUMMARY', 50, 18);
doc.fontSize(12).font('Helvetica');
doc.text('Your Database at a Glance', 50, 42);

doc.y = 80;

// Stats grid
const statsY = doc.y;
const boxWidth = 160;
const boxHeight = 80;

// Box 1: Total
doc.rect(50, statsY, boxWidth, boxHeight).fill(lightGray).stroke('#dee2e6');
doc.fillColor(primaryBlue).fontSize(28).font('Helvetica-Bold');
doc.text('606K', 55, statsY + 15, { width: boxWidth - 10, align: 'center' });
doc.fontSize(10).fillColor(darkGray).font('Helvetica');
doc.text('Total Contacts', 55, statsY + 50, { width: boxWidth - 10, align: 'center' });

// Box 2: Professionals
doc.rect(50 + boxWidth + 15, statsY, boxWidth, boxHeight).fill('#d4edda').stroke('#28a745');
doc.fillColor(successGreen).fontSize(28).font('Helvetica-Bold');
doc.text('220K', 55 + boxWidth + 15, statsY + 15, { width: boxWidth - 10, align: 'center' });
doc.fontSize(10).fillColor(darkGray).font('Helvetica');
doc.text('Identified Pros', 55 + boxWidth + 15, statsY + 50, { width: boxWidth - 10, align: 'center' });

// Box 3: Names Fixed
doc.rect(50 + (boxWidth + 15) * 2, statsY, boxWidth, boxHeight).fill('#cce5ff').stroke('#0062cc');
doc.fillColor(primaryBlue).fontSize(28).font('Helvetica-Bold');
doc.text('111K', 55 + (boxWidth + 15) * 2, statsY + 15, { width: boxWidth - 10, align: 'center' });
doc.fontSize(10).fillColor(darkGray).font('Helvetica');
doc.text('Names Extracted', 55 + (boxWidth + 15) * 2, statsY + 50, { width: boxWidth - 10, align: 'center' });

doc.y = statsY + boxHeight + 30;

// Key Takeaways
doc.fillColor(darkGray).fontSize(16).font('Helvetica-Bold');
doc.text('Key Takeaways');
doc.moveDown(0.5);

const takeaways = [
  { icon: '+', text: '35% of your database are confirmed real estate professionals', color: successGreen },
  { icon: '+', text: '110,576 contacts now have REAL names for personalization', color: successGreen },
  { icon: '+', text: '5 states with concentrated realtor presence for targeting', color: successGreen },
  { icon: '!', text: '386,006 personal emails - profession unknown', color: warningOrange },
  { icon: '!', text: '290,091 contacts need name validation or enrichment', color: warningOrange },
  { icon: '-', text: 'Email bounce test recommended before marketing', color: dangerRed }
];

takeaways.forEach(t => {
  doc.fillColor(t.color).fontSize(11).font('Helvetica-Bold');
  doc.text(t.icon, 60, doc.y, { continued: true });
  doc.fillColor(darkGray).font('Helvetica');
  doc.text('  ' + t.text);
  doc.moveDown(0.3);
});

doc.moveDown(2);

// Next Steps
doc.fillColor(primaryBlue).fontSize(14).font('Helvetica-Bold');
doc.text('Recommended Next Steps');
doc.moveDown(0.5);
doc.fontSize(10).font('Helvetica').fillColor(darkGray);
doc.text('1. Run email bounce test to validate addresses');
doc.text('2. Segment realtors by state for targeted campaigns');
doc.text('3. Create separate workflows for professionals vs personal emails');
doc.text('4. Consider data enrichment for high-value unknown contacts');

// Footer
doc.moveDown(3);
doc.fontSize(9).fillColor('#7f8c8d');
doc.text('WISR Parse', { align: 'center', continued: true });
doc.text(' | Data Intelligence & Enrichment', { align: 'center' });
doc.text('Report prepared for Paul Tropp & Gary Sable', { align: 'center' });

doc.end();

console.log('');
console.log('='.repeat(60));
console.log('  WISR Parse Report Generated');
console.log('='.repeat(60));
console.log('');
console.log('  Output: ' + outputPath);
console.log('');
console.log('  Contents:');
console.log('    Page 1: Cover & Executive Summary');
console.log('    Page 2: THE GOOD - Professionals & Geography');
console.log('    Page 3: THE BAD - Unknown Professions & Name Issues');
console.log('    Page 4: THE UGLY - Unfixable Names');
console.log('    Page 5: Summary & Next Steps');
console.log('');
console.log('='.repeat(60));
