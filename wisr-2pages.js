/**
 * WISR Intel - EXACTLY 2 PAGES
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 25, bottom: 25, left: 40, right: 40 },
  autoFirstPage: false
});

const outputPath = '/mnt/c/Users/dyoun/Downloads/WISR-Parse-Paul-Tropp-Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

const logoPath = '/mnt/c/Users/dyoun/OneDrive/Documents/Desktop/LOGOS/owl-logo-optimized.png';

// Colors
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
doc.addPage();

// Header
doc.rect(0, 0, 612, 110).fill(forestGreen);
doc.rect(0, 110, 612, 5).fill(brilliantGold);

try { doc.image(logoPath, 25, 5, { width: 120 }); } catch (e) {}

doc.fillColor(brilliantGold).fontSize(48).font('Helvetica-Bold').text('WISR Intel', 160, 18);
doc.fillColor('white').fontSize(14).font('Helvetica').text('Data Intelligence & Enrichment', 165, 68);
doc.fillColor(lightGold).fontSize(13).text('Paul Tropp & Gary Sable', 165, 88);

doc.y = 130;

// DATABASE
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold').text('The Database', 40);
doc.moveDown(0.4);

doc.rect(40, doc.y, 532, 80).fill(paleGold).stroke(brilliantGold);
const dbY = doc.y;
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('Total Contacts', 60, dbY + 15);
doc.fillColor(brilliantGold).fontSize(40).font('Helvetica-Bold').text('586,557', 60, dbY + 38);
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('Original Names', 340, dbY + 15);
doc.fillColor('#C0392B').fontSize(40).font('Helvetica-Bold').text('0', 340, dbY + 38);

doc.y = dbY + 100;

// WHAT WE FOUND
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold').text('What We Found', 40);
doc.moveDown(0.4);

const fY = doc.y;
doc.rect(40, fY, 255, 85).fill('#C8E6C9').stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('Names Extracted', 60, fY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold').text('204,621', 60, fY + 40);

doc.rect(315, fY, 255, 85).fill(lightGold).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('Realtors Identified', 335, fY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold').text('138,290', 335, fY + 40);

doc.y = fY + 105;

// READY TO USE
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold').text('Ready to Use', 40);
doc.moveDown(0.4);

doc.rect(40, doc.y, 532, 70).fill('#A5D6A7').stroke(forestGreen);
const rY = doc.y;
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('Realtors with Verified Names', 60, rY + 15);
doc.fillColor(brilliantGold).fontSize(36).font('Helvetica-Bold').text('46,721', 60, rY + 38);

doc.y = rY + 90;

// WHAT'S NEXT
doc.fillColor(forestGreen).fontSize(18).font('Helvetica-Bold').text("What's Next", 40);
doc.moveDown(0.4);

const nY = doc.y;
doc.rect(40, nY, 168, 70).fill(lightGold).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Email Validation', 50, nY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica').text('Bounce test confirms', 50, nY + 28);
doc.text('which emails are active', 50, nY + 40);

doc.rect(218, nY, 168, 70).fill('#C8E6C9').stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Personalized Content', 228, nY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica').text('Campaigns using', 228, nY + 28);
doc.text('real contact names', 228, nY + 40);

doc.rect(396, nY, 174, 70).fill(paleGold).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Geo-Targeted Flyers', 406, nY + 10);
doc.fillColor(charcoal).fontSize(9).font('Helvetica').text('State-specific', 406, nY + 28);
doc.text('marketing materials', 406, nY + 40);

// Footer 1
doc.rect(0, 740, 612, 52).fill(forestGreen);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(lightGold).fontSize(9).font('Helvetica').text('Page 1 of 2', 0, 760, { width: 612, align: 'center' });

// ============== PAGE 2 ==============
doc.addPage();

doc.rect(0, 0, 612, 70).fill(forestGreen);
doc.rect(0, 70, 612, 4).fill(brilliantGold);

try { doc.image(logoPath, 25, 8, { width: 55 }); } catch (e) {}

doc.fillColor(brilliantGold).fontSize(28).font('Helvetica-Bold').text('WISR Intel', 90, 18);
doc.fillColor('white').fontSize(11).font('Helvetica').text('Complete Data Breakdown', 92, 45);

doc.y = 85;

// BY PROFESSION
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold').text('By Profession', 40);
doc.moveDown(0.3);

const profs = [
  ['Realtors', '138,290'], ['Lenders', '4,168'], ['Attorneys', '2,582'], ['Title/Escrow', '335'],
  ['Appraisers', '330'], ['Builders', '313'], ['Insurance', '219'], ['Personal Email', '440,320']
];

let pY = doc.y, pX = 40;
profs.forEach((p, i) => {
  if (i === 4) { pY += 55; pX = 40; }
  const isPers = p[0] === 'Personal Email';
  doc.rect(pX, pY, 128, 50).fill(isPers ? '#EEEEEE' : (p[0] === 'Realtors' ? '#C8E6C9' : lightGold)).stroke(isPers ? '#BDBDBD' : brilliantGold);
  doc.fillColor(isPers ? gray : forestGreen).fontSize(11).font('Helvetica-Bold').text(p[0], pX + 8, pY + 10);
  doc.fillColor(isPers ? gray : brilliantGold).fontSize(18).font('Helvetica-Bold').text(p[1], pX + 8, pY + 28);
  pX += 133;
});

doc.y = pY + 65;

// BY STATE
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold').text('Realtors by State', 40);
doc.moveDown(0.3);

const states = [
  ['California', '57,840', '19,847'], ['Florida', '21,822', '7,492'], ['Texas', '17,831', '6,121'],
  ['Arizona', '10,287', '3,532'], ['Nevada', '5,397', '1,852'], ['Unknown', '25,113', '7,877']
];

let sY = doc.y, sX = 40, sRow = 0;
states.forEach((s, i) => {
  if (i === 3) { sRow = 1; sX = 40; }
  const curY = sRow === 0 ? sY : sY + 75;
  const isUnk = s[0] === 'Unknown';
  doc.rect(sX, curY, 170, 70).fill(isUnk ? '#E0E0E0' : lightGold).stroke(isUnk ? '#BDBDBD' : brilliantGold);
  doc.fillColor(isUnk ? gray : forestGreen).fontSize(14).font('Helvetica-Bold').text(s[0], sX + 12, curY + 10);
  doc.fillColor(isUnk ? gray : brilliantGold).fontSize(22).font('Helvetica-Bold').text(s[1], sX + 12, curY + 30);
  doc.fillColor(lightGreen).fontSize(10).font('Helvetica').text(s[2] + ' with names', sX + 12, curY + 54);
  sX += 180;
});

doc.y = sY + 160;

// NAME EXTRACTION
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold').text('Name Extraction', 40);
doc.moveDown(0.3);

const neY = doc.y;
doc.rect(40, neY, 168, 55).fill('#C8E6C9').stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Verified', 55, neY + 10);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold').text('93,038', 55, neY + 28);

doc.rect(218, neY, 168, 55).fill(lightGold).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Possible', 233, neY + 10);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold').text('111,583', 233, neY + 28);

doc.rect(396, neY, 174, 55).fill('#FFECB3').stroke('#FFB300');
doc.fillColor('#E65100').fontSize(12).font('Helvetica-Bold').text('Still Need', 411, neY + 10);
doc.fillColor('#E65100').fontSize(22).font('Helvetica-Bold').text('381,936', 411, neY + 28);

doc.y = neY + 70;

// READY SUMMARY
doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold').text('Ready to Use', 40);
doc.moveDown(0.3);

doc.rect(40, doc.y, 532, 55).fill('#A5D6A7').stroke(forestGreen);
const ruY = doc.y;
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold').text('Realtors with Names by State', 55, ruY + 8);

const rdy = [['CA', '19,847'], ['FL', '7,492'], ['TX', '6,121'], ['AZ', '3,532'], ['NV', '1,852']];
let rX = 55;
rdy.forEach(r => {
  doc.fillColor(forestGreen).fontSize(10).font('Helvetica-Bold').text(r[0], rX, ruY + 25);
  doc.fillColor(brilliantGold).fontSize(12).font('Helvetica-Bold').text(r[1], rX, ruY + 38);
  rX += 70;
});
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold').text('TOTAL: 46,721', 420, ruY + 30);

// Footer 2
doc.rect(0, 740, 612, 52).fill(forestGreen);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(brilliantGold).fontSize(10).font('Helvetica-Bold').text('WISR Intel', 0, 752, { width: 612, align: 'center' });
doc.fillColor(lightGold).fontSize(9).font('Helvetica').text('Page 2 of 2', 0, 765, { width: 612, align: 'center' });

doc.end();
console.log('2-page report saved: ' + outputPath);
