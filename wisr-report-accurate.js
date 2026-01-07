/**
 * WISR Parse - Paul Tropp Leads - ACCURATE Numbers
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 30, bottom: 30, left: 40, right: 40 }
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/WISR-Parse-Paul-Tropp-Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

const logoPath = '/mnt/c/Users/dyoun/OneDrive/Documents/Desktop/LOGOS/owl-logo-optimized.png';

// Colors
const navy = '#0f172a';
const blue = '#3b82f6';
const green = '#10b981';
const orange = '#f59e0b';
const red = '#ef4444';
const purple = '#8b5cf6';
const gray = '#64748b';
const lightBg = '#f1f5f9';

// ====== HEADER WITH LOGO ======
doc.rect(0, 0, 612, 70).fill(navy);

try {
  doc.image(logoPath, 30, 10, { width: 50 });
} catch (e) {}

doc.fillColor('white').fontSize(26).font('Helvetica-Bold');
doc.text('WISR Parse', 90, 18);
doc.fontSize(11).font('Helvetica').fillColor('#94a3b8');
doc.text('Data Intelligence Report', 90, 45);

doc.fontSize(10).fillColor('white').font('Helvetica');
doc.text('Paul Tropp & Gary Sable', 400, 25, { width: 180, align: 'right' });
doc.fontSize(9).fillColor('#94a3b8');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 400, 40, { width: 180, align: 'right' });

doc.y = 85;

// ====== WHAT YOU STARTED WITH ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('What You Started With');
doc.moveDown(0.3);

doc.rect(40, doc.y, 532, 65).fill(lightBg);
const startY = doc.y;

doc.fillColor(blue).fontSize(44).font('Helvetica-Bold');
doc.text('586,557', 55, startY + 8);
doc.fillColor(navy).fontSize(16).font('Helvetica');
doc.text('Email Contacts', 230, startY + 15);

doc.fillColor(red).fontSize(24).font('Helvetica-Bold');
doc.text('0', 230, startY + 38, { continued: true });
doc.fillColor(gray).fontSize(12).font('Helvetica').text('  Real Names', 255, startY + 45);
doc.fontSize(10).fillColor(gray);
doc.text('All names were fake placeholders added for CRM import', 55, startY + 50);

doc.y = startY + 80;

// ====== WHAT WE IDENTIFIED ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('What We Identified');
doc.moveDown(0.3);

const idY = doc.y;
const bw = 170;
const bh = 70;

// Professionals
const g1 = doc.linearGradient(40, idY, 40, idY + bh);
g1.stop(0, '#ecfdf5').stop(1, '#d1fae5');
doc.rect(40, idY, bw, bh).fill(g1);
doc.fillColor(green).fontSize(12).font('Helvetica-Bold');
doc.text('Business Emails', 50, idY + 10);
doc.fontSize(26).text('220,125', 50, idY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('Identified profession', 50, idY + 54);

// Realtors
const g2 = doc.linearGradient(40 + bw + 10, idY, 40 + bw + 10, idY + bh);
g2.stop(0, '#eff6ff').stop(1, '#dbeafe');
doc.rect(40 + bw + 10, idY, bw, bh).fill(g2);
doc.fillColor(blue).fontSize(12).font('Helvetica-Bold');
doc.text('Realtors', 50 + bw + 10, idY + 10);
doc.fontSize(26).text('211,691', 50 + bw + 10, idY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('36% of database', 50 + bw + 10, idY + 54);

// Unknown
const g3 = doc.linearGradient(40 + (bw + 10) * 2, idY, 40 + (bw + 10) * 2, idY + bh);
g3.stop(0, '#faf5ff').stop(1, '#f3e8ff');
doc.rect(40 + (bw + 10) * 2, idY, bw, bh).fill(g3);
doc.fillColor(purple).fontSize(12).font('Helvetica-Bold');
doc.text('Personal Email', 50 + (bw + 10) * 2, idY + 10);
doc.fontSize(26).text('366,432', 50 + (bw + 10) * 2, idY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('Unknown profession', 50 + (bw + 10) * 2, idY + 54);

doc.y = idY + bh + 15;

// ====== NAME EXTRACTION RESULTS ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('Name Extraction Results');
doc.moveDown(0.3);

const exY = doc.y;

// Extracted - HIGH
const g4 = doc.linearGradient(40, exY, 40, exY + 55);
g4.stop(0, '#ecfdf5').stop(1, '#d1fae5');
doc.rect(40, exY, 170, 55).fill(g4);
doc.fillColor(green).fontSize(10).font('Helvetica-Bold');
doc.text('Verified Names', 50, exY + 8);
doc.fontSize(24).text('93,036', 50, exY + 24);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('16% - High confidence', 50, exY + 44);

// Extracted - MEDIUM
const g5 = doc.linearGradient(220, exY, 220, exY + 55);
g5.stop(0, '#fefce8').stop(1, '#fef9c3');
doc.rect(220, exY, 170, 55).fill(g5);
doc.fillColor(orange).fontSize(10).font('Helvetica-Bold');
doc.text('Possible Names', 230, exY + 8);
doc.fontSize(24).text('111,576', 230, exY + 24);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('19% - Needs review', 230, exY + 44);

// Not Extracted
const g6 = doc.linearGradient(400, exY, 400, exY + 55);
g6.stop(0, '#fef2f2').stop(1, '#fee2e2');
doc.rect(400, exY, 170, 55).fill(g6);
doc.fillColor(red).fontSize(10).font('Helvetica-Bold');
doc.text('No Name Found', 410, exY + 8);
doc.fontSize(24).text('381,945', 410, exY + 24);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('65% - Needs enrichment', 410, exY + 44);

doc.y = exY + 70;

// ====== REALTORS BY STATE ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('Realtors by State');
doc.moveDown(0.3);

const stY = doc.y;
const states = [
  { st: 'CA', n: '57,840', c: '#3b82f6' },
  { st: 'FL', n: '21,822', c: '#10b981' },
  { st: 'TX', n: '17,831', c: '#f59e0b' },
  { st: 'AZ', n: '10,287', c: '#8b5cf6' },
  { st: 'NV', n: '5,397', c: '#ec4899' },
  { st: '??', n: '98,514', c: '#64748b' }
];

let sx = 40;
states.forEach(s => {
  const bg = s.st === '??' ? '#f1f5f9' : '#ffffff';
  doc.rect(sx, stY, 87, 48).fill(bg).stroke('#e2e8f0');
  doc.fillColor(s.c).fontSize(18).font('Helvetica-Bold');
  doc.text(s.st, sx, stY + 6, { width: 87, align: 'center' });
  doc.fontSize(11).fillColor(navy).font('Helvetica');
  doc.text(s.n, sx, stY + 28, { width: 87, align: 'center' });
  sx += 89;
});

doc.y = stY + 62;

// ====== THE BOTTOM LINE ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('The Bottom Line');
doc.moveDown(0.3);

const blY = doc.y;
doc.rect(40, blY, 532, 55).fill('#f0fdf4').stroke(green);
doc.fillColor(green).fontSize(11).font('Helvetica-Bold');
doc.text('What\'s Ready to Use:', 55, blY + 10);
doc.fontSize(10).font('Helvetica').fillColor(navy);
doc.text('93,036 contacts with verified real names + 211,691 identified as realtors', 55, blY + 26);
doc.text('You can run targeted campaigns to realtors by state immediately', 55, blY + 40);

doc.y = blY + 70;

// ====== NEXT STEPS ======
doc.fillColor(navy).fontSize(16).font('Helvetica-Bold');
doc.text('Next Steps to Enrich');
doc.moveDown(0.3);

const nsY = doc.y;
doc.rect(40, nsY, 532, 75).fill(lightBg).stroke('#e2e8f0');

doc.fontSize(10).font('Helvetica');
const steps = [
  { n: '1', t: 'Email Validation', d: 'Bounce test removes 10-30% invalid addresses' },
  { n: '2', t: 'Name Enrichment', d: 'Data append for 381k contacts missing names' },
  { n: '3', t: 'Profession Discovery', d: 'Social lookup for 366k personal emails' },
  { n: '4', t: 'Fresh Data', d: 'State realtor lists include verified names' }
];

let ny = nsY + 8;
steps.forEach(s => {
  doc.fillColor(blue).font('Helvetica-Bold').text(s.n + '. ' + s.t, 55, ny, { continued: true });
  doc.fillColor(gray).font('Helvetica').text('  -  ' + s.d);
  ny += 16;
});

// Footer
doc.y = 735;
doc.fontSize(8).fillColor(gray);
doc.text('WISR Parse  |  Data Intelligence & Enrichment', { align: 'center' });

doc.end();

console.log('');
console.log('  Report saved: ' + outputPath);
console.log('');
