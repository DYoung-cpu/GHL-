/**
 * WISR Parse - Paul Tropp Leads - Clean 1-Page Report
 * The REAL story: All names were fake, here's what we extracted
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
// Gradient header effect (dark navy bar)
doc.rect(0, 0, 612, 70).fill(navy);

// Logo
try {
  doc.image(logoPath, 30, 10, { width: 50 });
} catch (e) {
  // Skip if logo fails
}

doc.fillColor('white').fontSize(26).font('Helvetica-Bold');
doc.text('WISR Parse', 90, 18);
doc.fontSize(11).font('Helvetica').fillColor('#94a3b8');
doc.text('Data Intelligence Report', 90, 45);

// Client name on right
doc.fontSize(10).fillColor('white').font('Helvetica');
doc.text('Paul Tropp & Gary Sable', 400, 25, { width: 180, align: 'right' });
doc.fontSize(9).fillColor('#94a3b8');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 400, 40, { width: 180, align: 'right' });

doc.y = 85;

// ====== SECTION 1: WHAT YOU STARTED WITH ======
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold');
doc.text('WHAT YOU STARTED WITH');
doc.moveDown(0.3);

// Big number box
doc.rect(40, doc.y, 532, 70).fill(lightBg);
const startY = doc.y;

doc.fillColor(blue).fontSize(48).font('Helvetica-Bold');
doc.text('606,131', 50, startY + 10);
doc.fillColor(navy).fontSize(14).font('Helvetica');
doc.text('Total Email Contacts', 220, startY + 20);

doc.fillColor(red).fontSize(11).font('Helvetica-Bold');
doc.text('0', 220, startY + 42, { continued: true });
doc.fillColor(gray).font('Helvetica').text('  had real names - all were fake placeholders');

doc.y = startY + 85;

// ====== SECTION 2: WHAT WE FOUND ======
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold');
doc.text('WHAT WE IDENTIFIED');
doc.moveDown(0.3);

const foundY = doc.y;
const boxW = 172;
const boxH = 75;

// Box 1: Professionals
const grad1 = doc.linearGradient(40, foundY, 40, foundY + boxH);
grad1.stop(0, '#ecfdf5').stop(1, '#d1fae5');
doc.rect(40, foundY, boxW, boxH).fill(grad1);
doc.fillColor(green).fontSize(11).font('Helvetica-Bold');
doc.text('Business Domains', 50, foundY + 10);
doc.fontSize(28).text('220,125', 50, foundY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('36% identified profession', 50, foundY + 58);

// Box 2: Realtors
const grad2 = doc.linearGradient(40 + boxW + 8, foundY, 40 + boxW + 8, foundY + boxH);
grad2.stop(0, '#eff6ff').stop(1, '#dbeafe');
doc.rect(40 + boxW + 8, foundY, boxW, boxH).fill(grad2);
doc.fillColor(blue).fontSize(11).font('Helvetica-Bold');
doc.text('Realtors', 50 + boxW + 8, foundY + 10);
doc.fontSize(28).text('211,691', 50 + boxW + 8, foundY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('35% of database', 50 + boxW + 8, foundY + 58);

// Box 3: Unknown
const grad3 = doc.linearGradient(40 + (boxW + 8) * 2, foundY, 40 + (boxW + 8) * 2, foundY + boxH);
grad3.stop(0, '#faf5ff').stop(1, '#f3e8ff');
doc.rect(40 + (boxW + 8) * 2, foundY, boxW, boxH).fill(grad3);
doc.fillColor(purple).fontSize(11).font('Helvetica-Bold');
doc.text('Personal Email', 50 + (boxW + 8) * 2, foundY + 10);
doc.fontSize(28).text('386,006', 50 + (boxW + 8) * 2, foundY + 28);
doc.fontSize(9).font('Helvetica').fillColor(gray);
doc.text('64% unknown profession', 50 + (boxW + 8) * 2, foundY + 58);

doc.y = foundY + boxH + 15;

// ====== SECTION 3: HOW WE ENRICHED ======
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold');
doc.text('HOW WE ENRICHED THE DATA');
doc.moveDown(0.3);

const enrichY = doc.y;

// Extracted names
const grad4 = doc.linearGradient(40, enrichY, 40, enrichY + 55);
grad4.stop(0, '#ecfdf5').stop(1, '#d1fae5');
doc.rect(40, enrichY, 260, 55).fill(grad4);
doc.fillColor(green).fontSize(11).font('Helvetica-Bold');
doc.text('Real Names Extracted', 50, enrichY + 8);
doc.fontSize(32).text('110,576', 50, enrichY + 23);

// Still need names
const grad5 = doc.linearGradient(310, enrichY, 310, enrichY + 55);
grad5.stop(0, '#fef3c7').stop(1, '#fde68a');
doc.rect(310, enrichY, 260, 55).fill(grad5);
doc.fillColor(orange).fontSize(11).font('Helvetica-Bold');
doc.text('Still Need Names', 320, enrichY + 8);
doc.fontSize(32).text('495,555', 320, enrichY + 23);

doc.y = enrichY + 70;

// ====== SECTION 4: REALTORS BY STATE ======
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold');
doc.text('REALTORS BY STATE');
doc.moveDown(0.3);

const stateY = doc.y;
const states = [
  { st: 'CA', n: '57,840', color: '#3b82f6' },
  { st: 'FL', n: '21,822', color: '#10b981' },
  { st: 'TX', n: '17,831', color: '#f59e0b' },
  { st: 'AZ', n: '10,287', color: '#8b5cf6' },
  { st: 'NV', n: '5,397', color: '#ec4899' },
  { st: '??', n: '98,514', color: '#64748b' }
];

let stateX = 40;
states.forEach(s => {
  const grad = doc.linearGradient(stateX, stateY, stateX, stateY + 50);
  if (s.st === '??') {
    grad.stop(0, '#f1f5f9').stop(1, '#e2e8f0');
  } else {
    grad.stop(0, '#ffffff').stop(1, '#f8fafc');
  }
  doc.rect(stateX, stateY, 87, 50).fill(grad).stroke('#e2e8f0');
  doc.fillColor(s.color).fontSize(18).font('Helvetica-Bold');
  doc.text(s.st, stateX, stateY + 6, { width: 87, align: 'center' });
  doc.fontSize(11).fillColor(navy).font('Helvetica');
  doc.text(s.n, stateX, stateY + 30, { width: 87, align: 'center' });
  stateX += 89;
});

doc.y = stateY + 65;

// ====== SECTION 5: NEXT STEPS ======
doc.fillColor(navy).fontSize(14).font('Helvetica-Bold');
doc.text('NEXT STEPS TO ENRICH');
doc.moveDown(0.3);

const stepsY = doc.y;
const grad6 = doc.linearGradient(40, stepsY, 40, stepsY + 85);
grad6.stop(0, '#f8fafc').stop(1, '#f1f5f9');
doc.rect(40, stepsY, 532, 85).fill(grad6).stroke('#e2e8f0');

doc.fontSize(10).font('Helvetica');
const steps = [
  { num: '1', title: 'Email Validation', desc: 'Bounce test to remove invalid addresses (expect 10-30% reduction)' },
  { num: '2', title: 'Name Enrichment', desc: 'Data append service for 495k contacts still missing real names' },
  { num: '3', title: 'Profession Discovery', desc: 'Social lookup for 386k personal email contacts' },
  { num: '4', title: 'Fresh Data', desc: 'State realtor databases provide verified names & locations' }
];

let stepY = stepsY + 8;
steps.forEach(s => {
  doc.fillColor(blue).fontSize(10).font('Helvetica-Bold');
  doc.text(s.num + '.', 50, stepY, { continued: true });
  doc.text(' ' + s.title, { continued: true });
  doc.fillColor(gray).font('Helvetica');
  doc.text('  ' + s.desc);
  stepY += 18;
});

// ====== FOOTER ======
doc.y = 730;
doc.fontSize(8).fillColor(gray);
doc.text('WISR Parse | Data Intelligence & Enrichment', { align: 'center' });

doc.end();

console.log('');
console.log('  Report saved: ' + outputPath);
console.log('');
