/**
 * WISR Parse - Paul Tropp Leads - 1 Page Snapshot
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 35, bottom: 35, left: 50, right: 50 }
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/WISR-Parse-Paul-Tropp-Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

// Colors
const dark = '#1a202c';
const blue = '#2b6cb0';
const green = '#276749';
const orange = '#c05621';
const gray = '#718096';

// Header
doc.rect(0, 0, 612, 50).fill('#1a365d');
doc.fillColor('white').fontSize(22).font('Helvetica-Bold');
doc.text('WISR Parse', 50, 15, { continued: true });
doc.fontSize(12).font('Helvetica').text('  Data Snapshot', 135, 20);

doc.y = 65;

// Total
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('TOTAL LEADS PROVIDED');
doc.fillColor(blue).fontSize(36).font('Helvetica-Bold');
doc.text('606,131');
doc.fillColor(gray).fontSize(9).font('Helvetica');
doc.text('Source: AdRoll Campaigns (400,667) + State Realtor Databases (205,464)');

doc.moveDown();

// What they had
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('WHAT THE DATA CONTAINED');
doc.moveDown(0.3);

let y = doc.y;
doc.rect(50, y, 250, 45).fill('#f0fff4').stroke(green);
doc.fillColor(green).fontSize(9).font('Helvetica-Bold');
doc.text('Had Real Names', 60, y + 8);
doc.fontSize(20).text('205,464', 60, y + 22);

doc.rect(310, y, 250, 45).fill('#fff5f5').stroke(orange);
doc.fillColor(orange).fontSize(9).font('Helvetica-Bold');
doc.text('Had Fake/Placeholder Names', 320, y + 8);
doc.fontSize(20).text('400,667', 320, y + 22);

doc.y = y + 55;

// What we found
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('WHAT WE IDENTIFIED');
doc.moveDown(0.3);

y = doc.y;
// Professionals box
doc.rect(50, y, 250, 105).fill('#ebf8ff').stroke(blue);
doc.fillColor(blue).fontSize(9).font('Helvetica-Bold');
doc.text('Business Domains Identified', 60, y + 8);
doc.fontSize(22).text('220,125', 60, y + 22);
doc.fontSize(8).font('Helvetica').fillColor(dark);
doc.text('Realtors: 211,691', 60, y + 48);
doc.text('Lenders: 5,437', 60, y + 59);
doc.text('Attorneys: 1,168', 60, y + 70);
doc.text('Title/Escrow: 557', 150, y + 48);
doc.text('Builders: 528', 150, y + 59);
doc.text('Insurance: 372', 150, y + 70);
doc.text('Appraisers: 372', 150, y + 81);

// Unknown box
doc.rect(310, y, 250, 105).fill('#faf5ff').stroke('#805ad5');
doc.fillColor('#805ad5').fontSize(9).font('Helvetica-Bold');
doc.text('Personal Email (Unknown Profession)', 320, y + 8);
doc.fontSize(22).text('386,006', 320, y + 22);
doc.fontSize(8).font('Helvetica').fillColor(dark);
doc.text('Gmail, Yahoo, AOL, Hotmail, etc.', 320, y + 48);
doc.text('Cannot determine profession', 320, y + 59);
doc.text('from email domain alone', 320, y + 70);

doc.y = y + 115;

// What we extracted
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('WHAT WE EXTRACTED');
doc.moveDown(0.3);

y = doc.y;
doc.rect(50, y, 250, 55).fill('#f0fff4').stroke(green);
doc.fillColor(green).fontSize(9).font('Helvetica-Bold');
doc.text('Names Parsed from Email Addresses', 60, y + 8);
doc.fontSize(22).text('110,576', 60, y + 24);
doc.fontSize(8).font('Helvetica').fillColor(dark);
doc.text('(firstname.lastname@domain.com format)', 60, y + 42);

doc.rect(310, y, 250, 55).fill('#fff5f5').stroke(orange);
doc.fillColor(orange).fontSize(9).font('Helvetica-Bold');
doc.text('Names Still Missing/Incorrect', 320, y + 8);
doc.fontSize(22).text('290,091', 320, y + 24);
doc.fontSize(8).font('Helvetica').fillColor(dark);
doc.text('(email format not parseable)', 320, y + 42);

doc.y = y + 65;

// Realtors by State
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('REALTOR BREAKDOWN BY STATE');
doc.moveDown(0.3);

y = doc.y;
const states = [
  { st: 'CA', n: '57,840' },
  { st: 'FL', n: '21,822' },
  { st: 'TX', n: '17,831' },
  { st: 'AZ', n: '10,287' },
  { st: 'NV', n: '5,397' },
  { st: '??', n: '98,514' }
];

let x = 50;
states.forEach((s, i) => {
  const bg = s.st === '??' ? '#fff5f5' : '#f0fff4';
  const color = s.st === '??' ? orange : green;
  doc.rect(x, y, 85, 40).fill(bg).stroke(color);
  doc.fillColor(color).fontSize(14).font('Helvetica-Bold');
  doc.text(s.st, x, y + 6, { width: 85, align: 'center' });
  doc.fontSize(10).fillColor(dark).font('Helvetica');
  doc.text(s.n, x, y + 24, { width: 85, align: 'center' });
  x += 87;
});

doc.y = y + 50;

// Question Marks
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('QUESTION MARKS');
doc.moveDown(0.3);
doc.fontSize(9).font('Helvetica').fillColor(dark);
doc.text('386,006 contacts with personal email - profession unknown', { indent: 10 });
doc.text('290,091 contacts with names we cannot verify or extract', { indent: 10 });
doc.text('98,514 realtors with unknown state location', { indent: 10 });

doc.moveDown(0.5);

// Game Plan
doc.fillColor(dark).fontSize(12).font('Helvetica-Bold');
doc.text('GAME PLAN TO ENRICH');
doc.moveDown(0.3);

y = doc.y;
doc.rect(50, y, 512, 70).fill('#f7fafc').stroke('#e2e8f0');
doc.fillColor(blue).fontSize(9).font('Helvetica-Bold');
doc.text('1. Email Validation', 60, y + 8, { continued: true });
doc.font('Helvetica').fillColor(dark).text(' - Bounce test to remove dead addresses (reduces list 10-30%)');
doc.fillColor(blue).font('Helvetica-Bold');
doc.text('2. Name Enrichment', 60, y + 22, { continued: true });
doc.font('Helvetica').fillColor(dark).text(' - Data append service for the 290k missing names');
doc.fillColor(blue).font('Helvetica-Bold');
doc.text('3. Profession Tagging', 60, y + 36, { continued: true });
doc.font('Helvetica').fillColor(dark).text(' - Social lookup for the 386k personal emails');
doc.fillColor(blue).font('Helvetica-Bold');
doc.text('4. New Data', 60, y + 50, { continued: true });
doc.font('Helvetica').fillColor(dark).text(' - State realtor databases come with verified names & locations');

// Footer
doc.y = 745;
doc.fontSize(8).fillColor(gray);
doc.text('WISR Parse | Paul Tropp & Gary Sable | ' + new Date().toLocaleDateString(), { align: 'center' });

doc.end();

console.log('');
console.log('  1-Page Snapshot saved to:');
console.log('  ' + outputPath);
console.log('');
