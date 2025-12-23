/**
 * WISR Intel - Paul Tropp Leads v2
 * Fixed: Logo size, name placement, centered labels, personal email framing
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
const gray = '#7f8c8d';

// ====== HEADER ======
const headerGrad = doc.linearGradient(0, 0, 612, 100);
headerGrad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 100).fill(headerGrad);

// Gold accent line
doc.rect(0, 100, 612, 5).fill(brilliantGold);

// Logo - LARGE
try {
  doc.image(logoPath, 35, 8, { width: 85 });
} catch (e) {}

// WISR Intel text
doc.fillColor(brilliantGold).fontSize(42).font('Helvetica-Bold');
doc.text('WISR Intel', 130, 20);
doc.fillColor('white').fontSize(13).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 133, 62);

// Client names - below WISR Intel, clear placement
doc.fillColor(lightGold).fontSize(12).font('Helvetica');
doc.text('Prepared for  ', 133, 82, { continued: true });
doc.fillColor('white').font('Helvetica-Bold');
doc.text('Paul Tropp & Gary Sable');

// Date - far right, plenty of space
doc.fillColor(lightGold).fontSize(10).font('Helvetica');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 480, 85);

doc.y = 120;

// ====== WHAT YOU STARTED WITH ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('WHAT YOU STARTED WITH', 40);
doc.moveDown(0.4);

const startGrad = doc.linearGradient(40, doc.y, 572, doc.y + 65);
startGrad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 65).fill(startGrad).stroke(brilliantGold);
const sY = doc.y;

// Left side - Total
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('Total Email Contacts', 60, sY + 10);
doc.fillColor(brilliantGold).fontSize(28).font('Helvetica-Bold');
doc.text('586,557', 60, sY + 32);

// Right side - Real Names
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('Real Names', 350, sY + 10);
doc.fillColor('#C0392B').fontSize(28).font('Helvetica-Bold');
doc.text('0', 350, sY + 32);
doc.fillColor(gray).fontSize(10).font('Helvetica');
doc.text('All were fake placeholders', 385, sY + 38);

doc.y = sY + 80;

// ====== WHAT WE IDENTIFIED ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('WHAT WE IDENTIFIED', 40);
doc.moveDown(0.4);

const idY = doc.y;

// Business Emails - LEFT
const g1 = doc.linearGradient(40, idY, 40, idY + 75);
g1.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, idY, 255, 75).fill(g1).stroke(forestGreen);

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Business Emails', 60, idY + 12);
doc.fillColor(lightGreen).fontSize(10).font('Helvetica');
doc.text('Profession identified by domain', 60, idY + 30);
doc.fillColor(brilliantGold).fontSize(26).font('Helvetica-Bold');
doc.text('146,237', 60, idY + 46);

// Personal Emails - RIGHT (not negative framing)
const g2 = doc.linearGradient(315, idY, 315, idY + 75);
g2.stop(0, paleGold).stop(1, lightGold);
doc.rect(315, idY, 255, 75).fill(g2).stroke(brilliantGold);

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Personal Emails', 335, idY + 12);
doc.fillColor('#B8860B').fontSize(10).font('Helvetica');
doc.text('Gmail, Yahoo, etc. - could still be realtors', 335, idY + 30);
doc.fillColor(brilliantGold).fontSize(26).font('Helvetica-Bold');
doc.text('440,320', 335, idY + 46);

doc.y = idY + 90;

// ====== NAME EXTRACTION RESULTS ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('NAME EXTRACTION RESULTS', 40);
doc.moveDown(0.4);

const exY = doc.y;

// Three boxes centered
const boxW = 168;
const gap = 14;
const startX = 40;

// Verified Names
const g3 = doc.linearGradient(startX, exY, startX, exY + 70);
g3.stop(0, '#E8F5E9').stop(1, '#A5D6A7');
doc.rect(startX, exY, boxW, 70).fill(g3).stroke(forestGreen);

doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Verified Names', startX + 15, exY + 10);
doc.fillColor(lightGreen).fontSize(9).font('Helvetica');
doc.text('High confidence from email', startX + 15, exY + 26);
doc.fillColor(brilliantGold).fontSize(24).font('Helvetica-Bold');
doc.text('93,038', startX + 15, exY + 42);

// Possible Names
const g4 = doc.linearGradient(startX + boxW + gap, exY, startX + boxW + gap, exY + 70);
g4.stop(0, paleGold).stop(1, lightGold);
doc.rect(startX + boxW + gap, exY, boxW, 70).fill(g4).stroke(brilliantGold);

doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Possible Names', startX + boxW + gap + 15, exY + 10);
doc.fillColor('#B8860B').fontSize(9).font('Helvetica');
doc.text('Medium confidence - review', startX + boxW + gap + 15, exY + 26);
doc.fillColor(brilliantGold).fontSize(24).font('Helvetica-Bold');
doc.text('111,583', startX + boxW + gap + 15, exY + 42);

// Still Need Names
const g5 = doc.linearGradient(startX + (boxW + gap) * 2, exY, startX + (boxW + gap) * 2, exY + 70);
g5.stop(0, '#FFF8E1').stop(1, '#FFECB3');
doc.rect(startX + (boxW + gap) * 2, exY, boxW, 70).fill(g5).stroke('#FFB300');

doc.fillColor('#E65100').fontSize(14).font('Helvetica-Bold');
doc.text('Still Need Names', startX + (boxW + gap) * 2 + 15, exY + 10);
doc.fillColor('#FF8F00').fontSize(9).font('Helvetica');
doc.text('Enrichment recommended', startX + (boxW + gap) * 2 + 15, exY + 26);
doc.fillColor('#E65100').fontSize(24).font('Helvetica-Bold');
doc.text('381,936', startX + (boxW + gap) * 2 + 15, exY + 42);

doc.y = exY + 85;

// ====== REALTORS BY STATE ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('REALTORS BY STATE', 40);
doc.fontSize(10).font('Helvetica').fillColor(lightGreen);
doc.text('138,290 total identified as real estate professionals', 200, doc.y - 12);
doc.moveDown(0.4);

const stY = doc.y;
const states = [
  { st: 'CA', n: '57,840' },
  { st: 'FL', n: '21,822' },
  { st: 'TX', n: '17,831' },
  { st: 'AZ', n: '10,287' },
  { st: 'NV', n: '5,397' },
  { st: 'Unknown', n: '25,113' }
];

const stateW = 85;
const stateGap = 5;
let sx = 45;

states.forEach((s, i) => {
  const isUnknown = s.st === 'Unknown';
  const grad = doc.linearGradient(sx, stY, sx, stY + 50);
  if (isUnknown) {
    grad.stop(0, '#F5F5F5').stop(1, '#E0E0E0');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }
  doc.rect(sx, stY, stateW, 50).fill(grad).stroke(isUnknown ? '#BDBDBD' : brilliantGold);

  doc.fillColor(isUnknown ? gray : forestGreen).fontSize(isUnknown ? 11 : 16).font('Helvetica-Bold');
  doc.text(s.st, sx, stY + 8, { width: stateW, align: 'center' });

  doc.fontSize(13).fillColor(isUnknown ? gray : brilliantGold).font('Helvetica-Bold');
  doc.text(s.n, sx, stY + 28, { width: stateW, align: 'center' });

  sx += stateW + stateGap;
});

doc.y = stY + 65;

// ====== READY TO USE ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('READY TO USE NOW', 40);
doc.moveDown(0.4);

const ruGrad = doc.linearGradient(40, doc.y, 572, doc.y + 55);
ruGrad.stop(0, '#E8F5E9').stop(0.5, '#C8E6C9').stop(1, '#A5D6A7');
doc.rect(40, doc.y, 532, 55).fill(ruGrad).stroke(forestGreen);
const ruY = doc.y;

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Realtors with Verified Names', 60, ruY + 10);
doc.fillColor(lightGreen).fontSize(10).font('Helvetica');
doc.text('Ready for personalized campaigns, segmented by state', 60, ruY + 28);
doc.fillColor(brilliantGold).fontSize(26).font('Helvetica-Bold');
doc.text('46,721', 420, ruY + 15);

doc.y = ruY + 70;

// ====== NEXT STEPS ======
doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('NEXT STEPS', 40);
doc.moveDown(0.3);

const nsGrad = doc.linearGradient(40, doc.y, 572, doc.y + 55);
nsGrad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 55).fill(nsGrad).stroke(brilliantGold);
const nsY = doc.y;

doc.fontSize(10).font('Helvetica');
doc.fillColor(forestGreen).font('Helvetica-Bold');
doc.text('1. Email Validation', 55, nsY + 8, { continued: true });
doc.fillColor(charcoal).font('Helvetica').text('  -  Bounce test to remove invalid addresses');

doc.fillColor(forestGreen).font('Helvetica-Bold');
doc.text('2. Name Enrichment', 55, nsY + 22, { continued: true });
doc.fillColor(charcoal).font('Helvetica').text('  -  Data append for contacts still missing names');

doc.fillColor(forestGreen).font('Helvetica-Bold');
doc.text('3. Fresh Data', 55, nsY + 36, { continued: true });
doc.fillColor(charcoal).font('Helvetica').text('  -  State realtor databases include verified names');

// ====== FOOTER ======
doc.y = 740;
const footGrad = doc.linearGradient(0, 740, 612, 792);
footGrad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 740, 612, 52).fill(footGrad);
doc.rect(0, 740, 612, 3).fill(brilliantGold);

doc.fillColor(brilliantGold).fontSize(11).font('Helvetica-Bold');
doc.text('WISR Intel', 0, 752, { width: 612, align: 'center' });
doc.fillColor('white').fontSize(9).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 0, 765, { width: 612, align: 'center' });

doc.end();

console.log('');
console.log('  Report saved: ' + outputPath);
console.log('');
