/**
 * WISR Intel - Paul Tropp Leads - FINAL
 * Page 1: Overview + What's Next
 * Page 2: All the Data
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

// ============== PAGE 1 ==============

// Header
const headerGrad = doc.linearGradient(0, 0, 612, 110);
headerGrad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 110).fill(headerGrad);
doc.rect(0, 110, 612, 5).fill(brilliantGold);

// Logo - BIG
try {
  doc.image(logoPath, 25, 5, { width: 120 });
} catch (e) {}

// WISR Intel
doc.fillColor(brilliantGold).fontSize(48).font('Helvetica-Bold');
doc.text('WISR Intel', 160, 18);
doc.fillColor('white').fontSize(14).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 165, 68);
doc.fillColor(lightGold).fontSize(13).font('Helvetica');
doc.text('Paul Tropp & Gary Sable', 165, 88);
doc.fillColor(lightGold).fontSize(10).font('Helvetica');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 500, 90);

doc.y = 130;

// THE DATABASE
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('The Database', 40);
doc.moveDown(0.4);

const dbGrad = doc.linearGradient(40, doc.y, 572, doc.y + 80);
dbGrad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 80).fill(dbGrad).stroke(brilliantGold);
const dbY = doc.y;

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Total Contacts Provided', 60, dbY + 15);
doc.fillColor(brilliantGold).fontSize(40).font('Helvetica-Bold');
doc.text('586,557', 60, dbY + 38);

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Original Names', 340, dbY + 15);
doc.fillColor('#C0392B').fontSize(40).font('Helvetica-Bold');
doc.text('0', 340, dbY + 38);
doc.fillColor(gray).fontSize(11).font('Helvetica');
doc.text('All were placeholders', 380, dbY + 50);

doc.y = dbY + 100;

// WHAT WE FOUND
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('What We Found', 40);
doc.moveDown(0.4);

const fndY = doc.y;

// Names Extracted
const g1 = doc.linearGradient(40, fndY, 40, fndY + 85);
g1.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, fndY, 255, 85).fill(g1).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Names Extracted', 60, fndY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold');
doc.text('204,621', 60, fndY + 40);
doc.fillColor(lightGreen).fontSize(11).font('Helvetica');
doc.text('Real names from email addresses', 60, fndY + 72);

// Realtors Found
const g2 = doc.linearGradient(315, fndY, 315, fndY + 85);
g2.stop(0, paleGold).stop(1, lightGold);
doc.rect(315, fndY, 255, 85).fill(g2).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Realtors Identified', 335, fndY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold');
doc.text('138,290', 335, fndY + 40);
doc.fillColor('#B8860B').fontSize(11).font('Helvetica');
doc.text('Real estate professionals', 335, fndY + 72);

doc.y = fndY + 105;

// READY TO USE
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('Ready to Use', 40);
doc.moveDown(0.4);

const rdyGrad = doc.linearGradient(40, doc.y, 572, doc.y + 70);
rdyGrad.stop(0, '#E8F5E9').stop(0.5, '#C8E6C9').stop(1, '#A5D6A7');
doc.rect(40, doc.y, 532, 70).fill(rdyGrad).stroke(forestGreen);
const rdyY = doc.y;

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('Realtors with Verified Names', 60, rdyY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold');
doc.text('46,721', 60, rdyY + 38);
doc.fillColor(lightGreen).fontSize(12).font('Helvetica');
doc.text('Ready for personalized outreach by state', 250, rdyY + 30);

doc.y = rdyY + 90;

// WHAT'S NEXT
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text("What's Next", 40);
doc.moveDown(0.4);

// Next steps boxes
const nxtY = doc.y;

// Bounce Test
const n1 = doc.linearGradient(40, nxtY, 40, nxtY + 70);
n1.stop(0, paleGold).stop(1, lightGold);
doc.rect(40, nxtY, 168, 70).fill(n1).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Email Validation', 50, nxtY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica');
doc.text('Bounce test confirms', 50, nxtY + 28);
doc.text('which emails are', 50, nxtY + 39);
doc.text('actually active', 50, nxtY + 50);

// Personalized Content
const n2 = doc.linearGradient(218, nxtY, 218, nxtY + 70);
n2.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(218, nxtY, 168, 70).fill(n2).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Personalized Content', 228, nxtY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica');
doc.text('Create campaigns that', 228, nxtY + 28);
doc.text('address contacts by', 228, nxtY + 39);
doc.text('their real name', 228, nxtY + 50);

// Geo-Targeted
const n3 = doc.linearGradient(396, nxtY, 396, nxtY + 70);
n3.stop(0, cream).stop(1, paleGold);
doc.rect(396, nxtY, 174, 70).fill(n3).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Geo-Targeted Flyers', 406, nxtY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica');
doc.text('Target realtors by', 406, nxtY + 28);
doc.text('state with localized', 406, nxtY + 39);
doc.text('marketing materials', 406, nxtY + 50);

// Footer Page 1
doc.y = 740;
const f1Grad = doc.linearGradient(0, 740, 612, 792);
f1Grad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 740, 612, 52).fill(f1Grad);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(lightGold).fontSize(9).font('Helvetica');
doc.text('Page 1 of 2', 0, 760, { width: 612, align: 'center' });

// ============== PAGE 2 ==============
doc.addPage();

// Header Page 2
const h2Grad = doc.linearGradient(0, 0, 612, 70);
h2Grad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 70).fill(h2Grad);
doc.rect(0, 70, 612, 4).fill(brilliantGold);

try {
  doc.image(logoPath, 25, 8, { width: 55 });
} catch (e) {}

doc.fillColor(brilliantGold).fontSize(28).font('Helvetica-Bold');
doc.text('WISR Intel', 90, 18);
doc.fillColor('white').fontSize(11).font('Helvetica');
doc.text('Complete Data Breakdown', 92, 45);
doc.fillColor(lightGold).fontSize(10);
doc.text('Paul Tropp & Gary Sable', 450, 30);

doc.y = 85;

// BY PROFESSION
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('By Profession', 40);
doc.moveDown(0.3);

const profs = [
  { name: 'Realtors', count: '138,290' },
  { name: 'Lenders', count: '4,168' },
  { name: 'Attorneys', count: '2,582' },
  { name: 'Title/Escrow', count: '335' },
  { name: 'Appraisers', count: '330' },
  { name: 'Builders', count: '313' },
  { name: 'Insurance', count: '219' },
  { name: 'Personal Email', count: '440,320' }
];

let pY = doc.y;
const pW = 128;
const pH = 50;
let pX = 40;

profs.forEach((p, i) => {
  if (i === 4) {
    pY += pH + 5;
    pX = 40;
  }

  const isPersonal = p.name === 'Personal Email';
  const isRealtor = p.name === 'Realtors';

  const grad = doc.linearGradient(pX, pY, pX, pY + pH);
  if (isPersonal) {
    grad.stop(0, '#F5F5F5').stop(1, '#EEEEEE');
  } else if (isRealtor) {
    grad.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }

  doc.rect(pX, pY, pW, pH).fill(grad).stroke(isPersonal ? '#BDBDBD' : (isRealtor ? forestGreen : brilliantGold));

  doc.fillColor(isPersonal ? gray : forestGreen).fontSize(11).font('Helvetica-Bold');
  doc.text(p.name, pX + 8, pY + 10);
  doc.fillColor(isPersonal ? gray : brilliantGold).fontSize(18).font('Helvetica-Bold');
  doc.text(p.count, pX + 8, pY + 28);

  pX += pW + 5;
});

doc.y = pY + pH + 20;

// REALTORS BY STATE
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Realtors by State', 40);
doc.moveDown(0.3);

const states = [
  { st: 'California', count: '57,840', names: '19,847' },
  { st: 'Florida', count: '21,822', names: '7,492' },
  { st: 'Texas', count: '17,831', names: '6,121' },
  { st: 'Arizona', count: '10,287', names: '3,532' },
  { st: 'Nevada', count: '5,397', names: '1,852' },
  { st: 'Unknown', count: '25,113', names: '7,877' }
];

const sY = doc.y;
const sW = 170;
const sH = 70;
let sX = 40;
let sRow = 0;

states.forEach((s, i) => {
  if (i === 3) {
    sRow = 1;
    sX = 40;
  }

  const currentY = sRow === 0 ? sY : sY + sH + 8;
  const isUnknown = s.st === 'Unknown';

  const grad = doc.linearGradient(sX, currentY, sX, currentY + sH);
  if (isUnknown) {
    grad.stop(0, '#F5F5F5').stop(1, '#E0E0E0');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }

  doc.rect(sX, currentY, sW, sH).fill(grad).stroke(isUnknown ? '#BDBDBD' : brilliantGold);

  doc.fillColor(isUnknown ? gray : forestGreen).fontSize(14).font('Helvetica-Bold');
  doc.text(s.st, sX + 12, currentY + 10);

  doc.fillColor(isUnknown ? gray : brilliantGold).fontSize(22).font('Helvetica-Bold');
  doc.text(s.count, sX + 12, currentY + 30);

  doc.fillColor(lightGreen).fontSize(10).font('Helvetica');
  doc.text(s.names + ' with names', sX + 12, currentY + 54);

  sX += sW + 10;
});

doc.y = sY + (sH * 2) + 25;

// NAME EXTRACTION
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Name Extraction Results', 40);
doc.moveDown(0.3);

const neY = doc.y;

// Verified
const ne1 = doc.linearGradient(40, neY, 40, neY + 60);
ne1.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, neY, 168, 60).fill(ne1).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Verified Names', 55, neY + 12);
doc.fillColor(brilliantGold).fontSize(24).font('Helvetica-Bold');
doc.text('93,038', 55, neY + 32);

// Possible
const ne2 = doc.linearGradient(218, neY, 218, neY + 60);
ne2.stop(0, paleGold).stop(1, lightGold);
doc.rect(218, neY, 168, 60).fill(ne2).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Possible Names', 233, neY + 12);
doc.fillColor(brilliantGold).fontSize(24).font('Helvetica-Bold');
doc.text('111,583', 233, neY + 32);

// Still Need
const ne3 = doc.linearGradient(396, neY, 396, neY + 60);
ne3.stop(0, '#FFF8E1').stop(1, '#FFECB3');
doc.rect(396, neY, 174, 60).fill(ne3).stroke('#FFB300');
doc.fillColor('#E65100').fontSize(12).font('Helvetica-Bold');
doc.text('Still Need Names', 411, neY + 12);
doc.fillColor('#E65100').fontSize(24).font('Helvetica-Bold');
doc.text('381,936', 411, neY + 32);

doc.y = neY + 75;

// READY TO USE SUMMARY
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Ready to Use Now', 40);
doc.moveDown(0.3);

const ruGrad = doc.linearGradient(40, doc.y, 572, doc.y + 65);
ruGrad.stop(0, '#E8F5E9').stop(0.5, '#C8E6C9').stop(1, '#A5D6A7');
doc.rect(40, doc.y, 532, 65).fill(ruGrad).stroke(forestGreen);
const ruY = doc.y;

doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('Realtors with Verified Names by State', 55, ruY + 10);

const ready = [
  { st: 'CA', n: '19,847' },
  { st: 'FL', n: '7,492' },
  { st: 'TX', n: '6,121' },
  { st: 'AZ', n: '3,532' },
  { st: 'NV', n: '1,852' },
  { st: '??', n: '7,877' }
];

let rX = 55;
ready.forEach(r => {
  doc.fillColor(r.st === '??' ? gray : forestGreen).fontSize(11).font('Helvetica-Bold');
  doc.text(r.st, rX, ruY + 30);
  doc.fillColor(brilliantGold).fontSize(13).font('Helvetica-Bold');
  doc.text(r.n, rX, ruY + 44);
  rX += 75;
});

doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold');
doc.text('TOTAL: 46,721', 420, ruY + 35);

// Footer Page 2
doc.y = 740;
const f2Grad = doc.linearGradient(0, 740, 612, 792);
f2Grad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 740, 612, 52).fill(f2Grad);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(brilliantGold).fontSize(10).font('Helvetica-Bold');
doc.text('WISR Intel', 0, 752, { width: 612, align: 'center' });
doc.fillColor(lightGold).fontSize(9).font('Helvetica');
doc.text('Page 2 of 2', 0, 765, { width: 612, align: 'center' });

doc.end();

console.log('  Report saved: ' + outputPath);
