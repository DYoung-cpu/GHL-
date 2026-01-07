/**
 * WISR Intel - Paul Tropp Leads
 * LendWise Colors: Forest Green + Brilliant Gold
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 25, bottom: 25, left: 40, right: 40 }
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/WISR-Parse-Paul-Tropp-Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

const logoPath = '/mnt/c/Users/dyoun/OneDrive/Documents/Desktop/LOGOS/owl-logo-optimized.png';

// LendWise Colors
const forestGreen = '#1B4D3E';
const darkGreen = '#0D2818';
const lightGreen = '#2D6A4F';
const brilliantGold = '#D4A03C';
const lightGold = '#F5D78E';
const paleGold = '#FDF6E3';
const cream = '#FDFCF7';
const charcoal = '#2D3436';

// ====== HEADER ======
// Green gradient header
const headerGrad = doc.linearGradient(0, 0, 612, 90);
headerGrad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 90).fill(headerGrad);

// Gold accent line
doc.rect(0, 90, 612, 4).fill(brilliantGold);

// Logo - Large
try {
  doc.image(logoPath, 40, 12, { width: 70 });
} catch (e) {}

// WISR Intel text
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold');
doc.text('WISR Intel', 125, 22);
doc.fillColor('white').fontSize(11).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 127, 58);

// Client names - right side, under header area
doc.fillColor(lightGold).fontSize(10).font('Helvetica');
doc.text('Prepared for', 430, 25, { width: 150, align: 'right' });
doc.fillColor('white').fontSize(14).font('Helvetica-Bold');
doc.text('Paul Tropp & Gary Sable', 430, 40, { width: 150, align: 'right' });
doc.fillColor(lightGold).fontSize(9).font('Helvetica');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 430, 60, { width: 150, align: 'right' });

doc.y = 110;

// ====== WHAT YOU STARTED WITH ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('WHAT YOU STARTED WITH');
doc.moveDown(0.2);

const startGrad = doc.linearGradient(40, doc.y, 572, doc.y + 55);
startGrad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 55).fill(startGrad);
const sY = doc.y;

doc.fillColor(forestGreen).fontSize(22).font('Helvetica-Bold');
doc.text('Total Email Contacts', 55, sY + 8);
doc.fillColor(brilliantGold).fontSize(32).font('Helvetica-Bold');
doc.text('586,557', 55, sY + 28);

doc.fillColor(charcoal).fontSize(18).font('Helvetica-Bold');
doc.text('Real Names', 340, sY + 8);
doc.fillColor('#C0392B').fontSize(28).font('Helvetica-Bold');
doc.text('0', 340, sY + 28);
doc.fillColor('#7f8c8d').fontSize(9).font('Helvetica');
doc.text('(all were fake placeholders)', 365, sY + 35);

doc.y = sY + 70;

// ====== WHAT WE IDENTIFIED ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('WHAT WE IDENTIFIED');
doc.moveDown(0.2);

const idY = doc.y;
const bw = 170;
const bh = 60;

// Business Emails
const g1 = doc.linearGradient(40, idY, 40, idY + bh);
g1.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, idY, bw, bh).fill(g1).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Business Emails', 50, idY + 8);
doc.fontSize(9).font('Helvetica').fillColor(lightGreen);
doc.text('Identified profession', 50, idY + 24);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold');
doc.text('220,125', 50, idY + 36);

// Realtors
const g2 = doc.linearGradient(40 + bw + 10, idY, 40 + bw + 10, idY + bh);
g2.stop(0, paleGold).stop(1, lightGold);
doc.rect(40 + bw + 10, idY, bw, bh).fill(g2).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Realtors', 50 + bw + 10, idY + 8);
doc.fontSize(9).font('Helvetica').fillColor(lightGreen);
doc.text('36% of database', 50 + bw + 10, idY + 24);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold');
doc.text('138,290', 50 + bw + 10, idY + 36);

// Personal Email
const g3 = doc.linearGradient(40 + (bw + 10) * 2, idY, 40 + (bw + 10) * 2, idY + bh);
g3.stop(0, '#F5F5F5').stop(1, '#E0E0E0');
doc.rect(40 + (bw + 10) * 2, idY, bw, bh).fill(g3).stroke('#9E9E9E');
doc.fillColor(charcoal).fontSize(14).font('Helvetica-Bold');
doc.text('Personal Email', 50 + (bw + 10) * 2, idY + 8);
doc.fontSize(9).font('Helvetica').fillColor('#7f8c8d');
doc.text('Unknown profession', 50 + (bw + 10) * 2, idY + 24);
doc.fillColor('#7f8c8d').fontSize(22).font('Helvetica-Bold');
doc.text('440,320', 50 + (bw + 10) * 2, idY + 36);

doc.y = idY + bh + 15;

// ====== NAME EXTRACTION RESULTS ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('NAME EXTRACTION RESULTS');
doc.moveDown(0.2);

const exY = doc.y;

// Verified Names
const g4 = doc.linearGradient(40, exY, 40, exY + 50);
g4.stop(0, '#E8F5E9').stop(1, '#A5D6A7');
doc.rect(40, exY, 170, 50).fill(g4).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('Verified Names', 50, exY + 6);
doc.fontSize(8).font('Helvetica').fillColor(lightGreen);
doc.text('High confidence extractions', 50, exY + 20);
doc.fillColor(brilliantGold).fontSize(20).font('Helvetica-Bold');
doc.text('93,038', 50, exY + 32);

// Possible Names
const g5 = doc.linearGradient(220, exY, 220, exY + 50);
g5.stop(0, paleGold).stop(1, lightGold);
doc.rect(220, exY, 170, 50).fill(g5).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('Possible Names', 230, exY + 6);
doc.fontSize(8).font('Helvetica').fillColor('#B8860B');
doc.text('Needs verification', 230, exY + 20);
doc.fillColor(brilliantGold).fontSize(20).font('Helvetica-Bold');
doc.text('111,583', 230, exY + 32);

// No Name Found
const g6 = doc.linearGradient(400, exY, 400, exY + 50);
g6.stop(0, '#FFEBEE').stop(1, '#FFCDD2');
doc.rect(400, exY, 170, 50).fill(g6).stroke('#E57373');
doc.fillColor('#C62828').fontSize(13).font('Helvetica-Bold');
doc.text('No Name Found', 410, exY + 6);
doc.fontSize(8).font('Helvetica').fillColor('#E57373');
doc.text('Needs enrichment', 410, exY + 20);
doc.fillColor('#C62828').fontSize(20).font('Helvetica-Bold');
doc.text('381,936', 410, exY + 32);

doc.y = exY + 65;

// ====== REALTORS BY STATE ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('REALTORS BY STATE');
doc.moveDown(0.2);

const stY = doc.y;
const states = [
  { st: 'CA', n: '57,840' },
  { st: 'FL', n: '21,822' },
  { st: 'TX', n: '17,831' },
  { st: 'AZ', n: '10,287' },
  { st: 'NV', n: '5,397' },
  { st: '??', n: '98,514' }
];

let sx = 40;
states.forEach((s, i) => {
  const isUnknown = s.st === '??';
  const grad = doc.linearGradient(sx, stY, sx, stY + 45);
  if (isUnknown) {
    grad.stop(0, '#F5F5F5').stop(1, '#E0E0E0');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }
  doc.rect(sx, stY, 87, 45).fill(grad).stroke(isUnknown ? '#9E9E9E' : brilliantGold);
  doc.fillColor(isUnknown ? '#7f8c8d' : forestGreen).fontSize(16).font('Helvetica-Bold');
  doc.text(s.st, sx, stY + 5, { width: 87, align: 'center' });
  doc.fontSize(12).fillColor(isUnknown ? '#9E9E9E' : brilliantGold).font('Helvetica-Bold');
  doc.text(s.n, sx, stY + 25, { width: 87, align: 'center' });
  sx += 89;
});

doc.y = stY + 60;

// ====== READY TO USE ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('READY TO USE');
doc.moveDown(0.2);

const ruGrad = doc.linearGradient(40, doc.y, 572, doc.y + 50);
ruGrad.stop(0, '#E8F5E9').stop(0.5, '#C8E6C9').stop(1, '#A5D6A7');
doc.rect(40, doc.y, 532, 50).fill(ruGrad).stroke(forestGreen);
const ruY = doc.y;

doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Realtors with Verified Names', 55, ruY + 8);
doc.fillColor(brilliantGold).fontSize(28).font('Helvetica-Bold');
doc.text('46,721', 55, ruY + 24);

doc.fillColor(forestGreen).fontSize(11).font('Helvetica');
doc.text('Ready for personalized campaigns by state', 200, ruY + 18);

doc.y = ruY + 65;

// ====== NEXT STEPS ======
doc.fillColor(forestGreen).fontSize(11).font('Helvetica-Bold');
doc.text('NEXT STEPS TO ENRICH');
doc.moveDown(0.2);

const nsGrad = doc.linearGradient(40, doc.y, 572, doc.y + 70);
nsGrad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 70).fill(nsGrad).stroke(brilliantGold);
const nsY = doc.y;

const steps = [
  { n: '1', t: 'Email Validation', d: 'Bounce test removes 10-30% invalid addresses' },
  { n: '2', t: 'Name Enrichment', d: 'Data append for 381,936 contacts missing names' },
  { n: '3', t: 'Profession Discovery', d: 'Social lookup for 440,320 personal emails' },
  { n: '4', t: 'Fresh Data', d: 'State realtor lists include verified names' }
];

let ny = nsY + 6;
steps.forEach(s => {
  doc.fillColor(forestGreen).fontSize(10).font('Helvetica-Bold');
  doc.text(s.n + '. ' + s.t, 55, ny, { continued: true });
  doc.fillColor(charcoal).font('Helvetica').text('  -  ' + s.d);
  ny += 15;
});

// ====== FOOTER ======
doc.y = 735;
const footGrad = doc.linearGradient(0, 735, 612, 792);
footGrad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 735, 612, 57).fill(footGrad);
doc.rect(0, 735, 612, 3).fill(brilliantGold);

doc.fillColor(brilliantGold).fontSize(10).font('Helvetica-Bold');
doc.text('WISR Intel', 0, 750, { width: 612, align: 'center' });
doc.fillColor('white').fontSize(8).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 0, 762, { width: 612, align: 'center' });

doc.end();

console.log('');
console.log('  Report saved: ' + outputPath);
console.log('');
