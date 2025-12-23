/**
 * WISR Intel - Paul Tropp Leads - 2 Page Report
 * Page 1: Story + What's Next
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

// ============== PAGE 1: THE STORY ==============

// Header
const headerGrad = doc.linearGradient(0, 0, 612, 100);
headerGrad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 100).fill(headerGrad);
doc.rect(0, 100, 612, 5).fill(brilliantGold);

// Logo - LARGE
try {
  doc.image(logoPath, 30, 5, { width: 100 });
} catch (e) {}

// WISR Intel
doc.fillColor(brilliantGold).fontSize(42).font('Helvetica-Bold');
doc.text('WISR Intel', 145, 20);
doc.fillColor('white').fontSize(13).font('Helvetica');
doc.text('Data Intelligence & Enrichment', 148, 62);
doc.fillColor(lightGold).fontSize(12).font('Helvetica');
doc.text('Prepared for  ', 148, 82, { continued: true });
doc.fillColor('white').font('Helvetica-Bold').text('Paul Tropp & Gary Sable');
doc.fillColor(lightGold).fontSize(10).font('Helvetica');
doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 480, 85);

doc.y = 120;

// THE STARTING POINT
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('The Starting Point', 40);
doc.moveDown(0.3);

doc.fillColor(charcoal).fontSize(11).font('Helvetica');
doc.text('You provided us with 586,557 email contacts collected from AdRoll advertising campaigns and various lead sources. Upon analysis, we discovered that none of these contacts had usable name data - all first and last name fields contained fake placeholder values that were added solely to meet CRM import requirements.', 40, doc.y, { width: 532, lineGap: 3 });

doc.moveDown(1.2);

// WHAT WE DID
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('What We Did', 40);
doc.moveDown(0.3);

doc.fillColor(charcoal).fontSize(11).font('Helvetica');
doc.text('WISR Intel analyzed every contact in your database:', 40, doc.y, { width: 532 });
doc.moveDown(0.5);

const actions = [
  'Extracted real names from email addresses where the format allowed (firstname.lastname@domain.com)',
  'Identified professionals by analyzing email domains - recognizing 200+ real estate brokerages, lenders, title companies, and other industry domains',
  'Categorized contacts by profession: Realtors, Lenders, Attorneys, Title/Escrow, Builders, Insurance, and Appraisers',
  'Mapped realtors to their geographic locations based on state-specific data sources'
];

actions.forEach((a, i) => {
  doc.fillColor(brilliantGold).fontSize(11).font('Helvetica-Bold').text((i + 1) + '.  ', 50, doc.y, { continued: true });
  doc.fillColor(charcoal).font('Helvetica').text(a, { width: 510, lineGap: 2 });
  doc.moveDown(0.4);
});

doc.moveDown(0.8);

// THE RESULTS BOX
const resGrad = doc.linearGradient(40, doc.y, 572, doc.y + 80);
resGrad.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, doc.y, 532, 80).fill(resGrad).stroke(forestGreen);
const resY = doc.y;

doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('The Results', 60, resY + 12);

doc.fontSize(11).font('Helvetica').fillColor(charcoal);
doc.text('We successfully extracted ', 60, resY + 32, { continued: true });
doc.fillColor(brilliantGold).font('Helvetica-Bold').text('93,038 verified names', { continued: true });
doc.fillColor(charcoal).font('Helvetica').text(' with high confidence.');

doc.text('We identified ', 60, resY + 48, { continued: true });
doc.fillColor(brilliantGold).font('Helvetica-Bold').text('138,290 real estate professionals', { continued: true });
doc.fillColor(charcoal).font('Helvetica').text(' across 5 states.');

doc.text('We now have ', 60, resY + 64, { continued: true });
doc.fillColor(brilliantGold).font('Helvetica-Bold').text('46,721 realtors with verified names', { continued: true });
doc.fillColor(charcoal).font('Helvetica').text(' ready for personalized outreach.');

doc.y = resY + 100;

// WHAT'S NEXT
doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text("What's Next", 40);
doc.moveDown(0.3);

// Step 1: Bounce Test
const step1Grad = doc.linearGradient(40, doc.y, 572, doc.y + 65);
step1Grad.stop(0, paleGold).stop(1, lightGold);
doc.rect(40, doc.y, 532, 65).fill(step1Grad).stroke(brilliantGold);
const s1Y = doc.y;

doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('1. Email Validation (Bounce Test)', 55, s1Y + 10);
doc.fillColor(charcoal).fontSize(10).font('Helvetica');
doc.text('Before launching any campaigns, we need to verify which email addresses are actually active. A bounce test sends a verification ping to each address and confirms deliverability. This typically removes 10-30% of invalid addresses, protecting your sender reputation and ensuring your messages reach real inboxes.', 55, s1Y + 28, { width: 500, lineGap: 2 });

doc.y = s1Y + 75;

// Step 2: Personalized Content
const step2Grad = doc.linearGradient(40, doc.y, 572, doc.y + 65);
step2Grad.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(40, doc.y, 532, 65).fill(step2Grad).stroke(forestGreen);
const s2Y = doc.y;

doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('2. Personalized Content Creation', 55, s2Y + 10);
doc.fillColor(charcoal).fontSize(10).font('Helvetica');
doc.text('For the 46,721 realtors with verified names, we can now create personalized email campaigns that address them by name. "Hi Sarah" converts significantly better than "Hi there" or "Dear Real Estate Professional." Personal touches build trust and increase response rates.', 55, s2Y + 28, { width: 500, lineGap: 2 });

doc.y = s2Y + 75;

// Step 3: Geo-Targeted Marketing
const step3Grad = doc.linearGradient(40, doc.y, 572, doc.y + 75);
step3Grad.stop(0, cream).stop(1, paleGold);
doc.rect(40, doc.y, 532, 75).fill(step3Grad).stroke(brilliantGold);
const s3Y = doc.y;

doc.fillColor(forestGreen).fontSize(13).font('Helvetica-Bold');
doc.text('3. Geo-Targeted Flyers & Campaigns', 55, s3Y + 10);
doc.fillColor(charcoal).fontSize(10).font('Helvetica');
doc.text('With realtors mapped to specific states (CA, FL, TX, AZ, NV), we can create hyper-targeted marketing materials. Imagine flyers that speak directly to California realtors about the CA market, or Texas-specific campaigns highlighting local opportunities. Geographic targeting dramatically increases relevance and engagement.', 55, s3Y + 28, { width: 500, lineGap: 2 });

// Footer
doc.y = 740;
const footGrad = doc.linearGradient(0, 740, 612, 792);
footGrad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 740, 612, 52).fill(footGrad);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(lightGold).fontSize(9).font('Helvetica');
doc.text('Page 1 of 2', 0, 760, { width: 612, align: 'center' });

// ============== PAGE 2: ALL THE DATA ==============
doc.addPage();

// Header - smaller for data page
const h2Grad = doc.linearGradient(0, 0, 612, 60);
h2Grad.stop(0, darkGreen).stop(0.5, forestGreen).stop(1, lightGreen);
doc.rect(0, 0, 612, 60).fill(h2Grad);
doc.rect(0, 60, 612, 4).fill(brilliantGold);

try {
  doc.image(logoPath, 30, 8, { width: 45 });
} catch (e) {}

doc.fillColor(brilliantGold).fontSize(24).font('Helvetica-Bold');
doc.text('WISR Intel', 85, 15);
doc.fillColor('white').fontSize(10).font('Helvetica');
doc.text('Complete Data Breakdown', 87, 38);
doc.fillColor(lightGold).fontSize(9);
doc.text('Paul Tropp & Gary Sable', 450, 25);

doc.y = 75;

// ROW 1: Total + Names
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('DATABASE OVERVIEW', 40);
doc.moveDown(0.3);

const r1Y = doc.y;

// Total Contacts
const t1Grad = doc.linearGradient(40, r1Y, 40, r1Y + 55);
t1Grad.stop(0, cream).stop(1, paleGold);
doc.rect(40, r1Y, 175, 55).fill(t1Grad).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Total Contacts', 50, r1Y + 8);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold');
doc.text('586,557', 50, r1Y + 26);

// Verified Names
const t2Grad = doc.linearGradient(225, r1Y, 225, r1Y + 55);
t2Grad.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
doc.rect(225, r1Y, 175, 55).fill(t2Grad).stroke(forestGreen);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Verified Names', 235, r1Y + 8);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold');
doc.text('93,038', 235, r1Y + 26);
doc.fillColor(lightGreen).fontSize(9).font('Helvetica');
doc.text('High confidence', 235, r1Y + 44);

// Possible Names
const t3Grad = doc.linearGradient(410, r1Y, 410, r1Y + 55);
t3Grad.stop(0, paleGold).stop(1, lightGold);
doc.rect(410, r1Y, 160, 55).fill(t3Grad).stroke(brilliantGold);
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('Possible Names', 420, r1Y + 8);
doc.fillColor(brilliantGold).fontSize(22).font('Helvetica-Bold');
doc.text('111,583', 420, r1Y + 26);
doc.fillColor('#B8860B').fontSize(9).font('Helvetica');
doc.text('Needs review', 420, r1Y + 44);

doc.y = r1Y + 65;

// ROW 2: By Profession
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('BY PROFESSION', 40);
doc.moveDown(0.3);

const professions = [
  { name: 'Realtors', count: '138,290', note: 'Real estate pros' },
  { name: 'Lenders', count: '4,168', note: 'Loan officers' },
  { name: 'Attorneys', count: '2,582', note: 'Legal' },
  { name: 'Title/Escrow', count: '335', note: 'Closings' },
  { name: 'Appraisers', count: '330', note: 'Valuations' },
  { name: 'Builders', count: '313', note: 'Construction' },
  { name: 'Insurance', count: '219', note: 'Coverage' },
  { name: 'Personal Email', count: '440,320', note: 'Gmail, Yahoo, etc.' }
];

let pY = doc.y;
const pW = 130;
const pH = 45;
let pX = 40;
let pRow = 0;

professions.forEach((p, i) => {
  if (i > 0 && i % 4 === 0) {
    pY += pH + 5;
    pX = 40;
    pRow++;
  }

  const isPersonal = p.name === 'Personal Email';
  const grad = doc.linearGradient(pX, pY, pX, pY + pH);
  if (isPersonal) {
    grad.stop(0, '#F5F5F5').stop(1, '#EEEEEE');
  } else if (p.name === 'Realtors') {
    grad.stop(0, '#E8F5E9').stop(1, '#C8E6C9');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }

  doc.rect(pX, pY, pW, pH).fill(grad).stroke(isPersonal ? '#BDBDBD' : (p.name === 'Realtors' ? forestGreen : brilliantGold));

  doc.fillColor(isPersonal ? gray : forestGreen).fontSize(10).font('Helvetica-Bold');
  doc.text(p.name, pX + 8, pY + 6);
  doc.fillColor(isPersonal ? gray : brilliantGold).fontSize(16).font('Helvetica-Bold');
  doc.text(p.count, pX + 8, pY + 20);
  doc.fillColor(gray).fontSize(8).font('Helvetica');
  doc.text(p.note, pX + 8, pY + 36);

  pX += pW + 5;
});

doc.y = pY + pH + 15;

// ROW 3: Realtors by State - THE BIG ONE
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('REALTORS BY STATE', 40);
doc.fontSize(10).font('Helvetica').fillColor(lightGreen);
doc.text('138,290 total real estate professionals identified', 185, doc.y - 12);
doc.moveDown(0.3);

const states = [
  { st: 'California', abbr: 'CA', count: '57,840', withNames: '19,847' },
  { st: 'Florida', abbr: 'FL', count: '21,822', withNames: '7,492' },
  { st: 'Texas', abbr: 'TX', count: '17,831', withNames: '6,121' },
  { st: 'Arizona', abbr: 'AZ', count: '10,287', withNames: '3,532' },
  { st: 'Nevada', abbr: 'NV', count: '5,397', withNames: '1,852' },
  { st: 'Unknown', abbr: '??', count: '25,113', withNames: '7,877' }
];

const stY = doc.y;
const stW = 175;
const stH = 65;
let stX = 40;
let stRow = 0;

states.forEach((s, i) => {
  if (i > 0 && i % 3 === 0) {
    stY2 = stY + stH + 8;
    stX = 40;
    stRow++;
  }

  const currentY = stRow === 0 ? stY : stY + stH + 8;
  const isUnknown = s.abbr === '??';

  const grad = doc.linearGradient(stX, currentY, stX, currentY + stH);
  if (isUnknown) {
    grad.stop(0, '#F5F5F5').stop(1, '#E0E0E0');
  } else {
    grad.stop(0, paleGold).stop(1, lightGold);
  }

  doc.rect(stX, currentY, stW, stH).fill(grad).stroke(isUnknown ? '#BDBDBD' : brilliantGold);

  doc.fillColor(isUnknown ? gray : forestGreen).fontSize(14).font('Helvetica-Bold');
  doc.text(s.st, stX + 10, currentY + 8);

  doc.fillColor(isUnknown ? gray : brilliantGold).fontSize(20).font('Helvetica-Bold');
  doc.text(s.count, stX + 10, currentY + 26);

  doc.fillColor(lightGreen).fontSize(9).font('Helvetica');
  doc.text(s.withNames + ' with names', stX + 10, currentY + 48);

  stX += stW + 8;
});

doc.y = stY + (stH * 2) + 25;

// ROW 4: Ready to Use Summary
doc.fillColor(forestGreen).fontSize(12).font('Helvetica-Bold');
doc.text('READY TO USE NOW', 40);
doc.moveDown(0.3);

const readyGrad = doc.linearGradient(40, doc.y, 572, doc.y + 70);
readyGrad.stop(0, '#E8F5E9').stop(0.5, '#C8E6C9').stop(1, '#A5D6A7');
doc.rect(40, doc.y, 532, 70).fill(readyGrad).stroke(forestGreen);
const rdY = doc.y;

doc.fillColor(forestGreen).fontSize(14).font('Helvetica-Bold');
doc.text('Realtors with Verified Names by State', 55, rdY + 10);

const readyStates = [
  { st: 'CA', n: '19,847' },
  { st: 'FL', n: '7,492' },
  { st: 'TX', n: '6,121' },
  { st: 'AZ', n: '3,532' },
  { st: 'NV', n: '1,852' },
  { st: '??', n: '7,877' }
];

let rdX = 55;
readyStates.forEach(s => {
  doc.fillColor(s.st === '??' ? gray : forestGreen).fontSize(12).font('Helvetica-Bold');
  doc.text(s.st, rdX, rdY + 32);
  doc.fillColor(brilliantGold).fontSize(14).font('Helvetica-Bold');
  doc.text(s.n, rdX, rdY + 48);
  rdX += 85;
});

doc.fillColor(forestGreen).fontSize(16).font('Helvetica-Bold');
doc.text('TOTAL: 46,721', 430, rdY + 40);

// Footer
doc.y = 740;
const foot2Grad = doc.linearGradient(0, 740, 612, 792);
foot2Grad.stop(0, forestGreen).stop(1, darkGreen);
doc.rect(0, 740, 612, 52).fill(foot2Grad);
doc.rect(0, 740, 612, 3).fill(brilliantGold);
doc.fillColor(brilliantGold).fontSize(10).font('Helvetica-Bold');
doc.text('WISR Intel', 0, 752, { width: 612, align: 'center' });
doc.fillColor(lightGold).fontSize(9).font('Helvetica');
doc.text('Page 2 of 2', 0, 765, { width: 612, align: 'center' });

doc.end();

console.log('');
console.log('  2-Page Report saved: ' + outputPath);
console.log('');
