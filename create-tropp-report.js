/**
 * Paul Tropp Leads - Full PDF Report
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/Paul-Tropp-Leads-Report.pdf';
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Colors
const blue = '#2980b9';
const darkBlue = '#2c3e50';
const gray = '#7f8c8d';
const lightGray = '#ecf0f1';
const warning = '#e74c3c';

// Title Page
doc.fontSize(32).fillColor(darkBlue).text('Paul Tropp Leads', { align: 'center' });
doc.fontSize(24).fillColor(blue).text('Complete Analysis Report', { align: 'center' });
doc.moveDown(2);
doc.fontSize(12).fillColor(gray).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
doc.moveDown(3);

// Big number
doc.fontSize(72).fillColor(blue).text('606,131', { align: 'center' });
doc.fontSize(16).fillColor(darkBlue).text('Total Contacts', { align: 'center' });

doc.moveDown(4);

// Executive Summary
doc.fontSize(14).fillColor(darkBlue).text('Executive Summary', { underline: true });
doc.moveDown(0.5);
doc.fontSize(11).fillColor('#333');
doc.text('• Identified Professionals: 220,125 (36.3%)', { indent: 20 });
doc.text('• Personal Emails (Unknown): 386,006 (63.7%)', { indent: 20 });
doc.text('• Names from Email Parsing: 110,576 contacts', { indent: 20 });
doc.text('• Names Potentially Incorrect: 290,091 contacts', { indent: 20 });

// Page 2 - Category Breakdown
doc.addPage();
doc.fontSize(20).fillColor(darkBlue).text('Breakdown by Category');
doc.moveDown();

const categories = [
  ['Realtor', '211,691', '34.9%'],
  ['Personal Email (Unknown)', '386,006', '63.7%'],
  ['Lender', '5,437', '0.9%'],
  ['Attorney', '1,168', '0.2%'],
  ['Title/Escrow', '557', '0.1%'],
  ['Builder/Developer', '528', '0.1%'],
  ['Insurance', '372', '0.1%'],
  ['Appraiser', '372', '0.1%']
];

doc.fontSize(11);
let y = doc.y;
const colWidths = [250, 100, 80];
const rowH = 25;

// Header
doc.fillColor('white').rect(50, y, 430, rowH).fill(blue);
doc.fillColor('white')
  .text('Category', 55, y + 7)
  .text('Count', 305, y + 7)
  .text('Percent', 405, y + 7);
y += rowH;

// Rows
categories.forEach((row, i) => {
  if (i % 2 === 0) doc.rect(50, y, 430, rowH).fill(lightGray);
  doc.fillColor('#333')
    .text(row[0], 55, y + 7)
    .text(row[1], 305, y + 7)
    .text(row[2], 405, y + 7);
  y += rowH;
});

doc.y = y + 20;

// Realtors by State
doc.fontSize(20).fillColor(darkBlue).text('Realtors by State');
doc.fontSize(12).fillColor(gray).text('Total Realtors: 211,691');
doc.moveDown();

const states = [
  ['California (CA)', '57,840', '27.3%'],
  ['Florida (FL)', '21,822', '10.3%'],
  ['Texas (TX)', '17,831', '8.4%'],
  ['Arizona (AZ)', '10,287', '4.9%'],
  ['Nevada (NV)', '5,397', '2.5%'],
  ['No State Data (AdRoll)', '98,514', '46.5%']
];

y = doc.y;
doc.fillColor('white').rect(50, y, 430, rowH).fill(blue);
doc.fillColor('white')
  .text('State', 55, y + 7)
  .text('Count', 305, y + 7)
  .text('% of Realtors', 395, y + 7);
y += rowH;

states.forEach((row, i) => {
  if (i % 2 === 0) doc.rect(50, y, 430, rowH).fill(lightGray);
  doc.fillColor('#333')
    .text(row[0], 55, y + 7)
    .text(row[1], 305, y + 7)
    .text(row[2], 405, y + 7);
  y += rowH;
});

// Page 3 - Name Quality
doc.addPage();
doc.fontSize(20).fillColor(darkBlue).text('Name Quality Analysis');
doc.moveDown();

const nameQuality = [
  ['High Confidence (firstname.lastname@)', '64,258', '10.6%'],
  ['Medium Confidence (pattern match)', '46,318', '7.6%'],
  ['State Files (original real names)', '205,464', '33.9%'],
  ['AdRoll (original fake names)', '290,091', '47.9%']
];

doc.fontSize(11);
y = doc.y;
doc.fillColor('white').rect(50, y, 480, rowH).fill(blue);
doc.fillColor('white')
  .text('Name Quality Level', 55, y + 7)
  .text('Count', 355, y + 7)
  .text('Percent', 455, y + 7);
y += rowH;

nameQuality.forEach((row, i) => {
  const bgColor = row[0].includes('fake') ? '#fff3cd' : (i % 2 === 0 ? lightGray : 'white');
  doc.rect(50, y, 480, rowH).fill(bgColor);
  doc.fillColor('#333')
    .text(row[0], 55, y + 7)
    .text(row[1], 355, y + 7)
    .text(row[2], 455, y + 7);
  y += rowH;
});

doc.y = y + 30;

// Warning Box
doc.rect(50, doc.y, 500, 100).fill('#fff3cd').stroke('#ffc107');
const boxY = doc.y;
doc.fillColor(warning).fontSize(14).text('⚠ Contacts with Mismatched Names', 60, boxY + 10);
doc.fontSize(36).text('290,091', 60, boxY + 35);
doc.fontSize(10).fillColor('#856404').text('47.9% of contacts have AdRoll names that likely don\'t match email addresses.', 60, boxY + 70);
doc.text('These were scraped from ads with randomized name data.', 60, boxY + 82);

doc.y = boxY + 120;
doc.moveDown();

// Summary Stats
doc.fontSize(16).fillColor(darkBlue).text('Key Takeaways');
doc.moveDown(0.5);
doc.fontSize(11).fillColor('#333');
doc.text('1. 211,691 contacts identified as Realtors (35% of database)');
doc.text('2. 113,177 Realtors have state data (CA, FL, TX, AZ, NV)');
doc.text('3. 386,006 contacts use personal email - profession unknown');
doc.text('4. 110,576 names successfully extracted from email addresses');
doc.text('5. 290,091 contacts have potentially incorrect/fake names from AdRoll');

doc.moveDown(2);
doc.fontSize(9).fillColor(gray).text('Report generated by GHL Automation System', { align: 'center' });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log('PDF Report saved to:', outputPath);
  const stats = fs.statSync(outputPath);
  console.log('File size:', (stats.size / 1024).toFixed(1), 'KB');
});
