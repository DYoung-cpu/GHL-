/**
 * Paul Tropp Leads - Complete PDF Report
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
const out = '/mnt/c/Users/dyoun/Downloads/Paul-Tropp-Leads-Report.pdf';
doc.pipe(fs.createWriteStream(out));

// ====== PAGE 1: TITLE & SUMMARY ======
doc.font('Helvetica-Bold').fontSize(28).text('PAUL TROPP LEADS', { align: 'center' });
doc.font('Helvetica').fontSize(16).text('Complete Analysis Report', { align: 'center' });
doc.moveDown();
doc.fontSize(10).text('Generated: ' + new Date().toLocaleString(), { align: 'center' });

doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(48).text('606,131', { align: 'center' });
doc.font('Helvetica').fontSize(14).text('Total Contacts in Database', { align: 'center' });

doc.moveDown(3);
doc.font('Helvetica-Bold').fontSize(16).text('EXECUTIVE SUMMARY');
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12);
doc.text('• Identified Professionals: 220,125 contacts (36.3%)');
doc.text('• Personal Emails (Unknown Profession): 386,006 contacts (63.7%)');
doc.text('• Realtors with State Data: 113,177 contacts');
doc.text('• Names Parsed from Email: 110,576 contacts');
doc.text('• Names Potentially Fake/Incorrect: 290,091 contacts');

// ====== PAGE 2: CATEGORY BREAKDOWN ======
doc.addPage();
doc.font('Helvetica-Bold').fontSize(18).text('BREAKDOWN BY CATEGORY');
doc.moveDown();

doc.font('Helvetica').fontSize(11);
doc.text('Category                          Count         Percent');
doc.text('─'.repeat(55));
doc.text('Realtor                          211,691        34.9%');
doc.text('Personal Email (Unknown)         386,006        63.7%');
doc.text('Lender                             5,437         0.9%');
doc.text('Attorney                           1,168         0.2%');
doc.text('Title/Escrow                         557         0.1%');
doc.text('Builder/Developer                    528         0.1%');
doc.text('Insurance                            372         0.1%');
doc.text('Appraiser                            372         0.1%');
doc.text('─'.repeat(55));
doc.text('TOTAL                            606,131       100.0%');

doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(18).text('REALTORS BY STATE');
doc.font('Helvetica').fontSize(10).text('(Total Realtors: 211,691)');
doc.moveDown();

doc.fontSize(11);
doc.text('State                             Count      % of Realtors');
doc.text('─'.repeat(55));
doc.text('California (CA)                  57,840         27.3%');
doc.text('Florida (FL)                     21,822         10.3%');
doc.text('Texas (TX)                       17,831          8.4%');
doc.text('Arizona (AZ)                     10,287          4.9%');
doc.text('Nevada (NV)                       5,397          2.5%');
doc.text('No State Data (AdRoll)           98,514         46.5%');
doc.text('─'.repeat(55));
doc.text('TOTAL REALTORS                  211,691        100.0%');

// ====== PAGE 3: NAME QUALITY ======
doc.addPage();
doc.font('Helvetica-Bold').fontSize(18).text('NAME QUALITY ANALYSIS');
doc.moveDown();

doc.font('Helvetica').fontSize(11);
doc.text('Quality Level                          Count         Percent');
doc.text('─'.repeat(60));
doc.text('High Confidence (firstname.lastname)   64,258         10.6%');
doc.text('Medium Confidence (pattern match)      46,318          7.6%');
doc.text('State Files (real original names)     205,464         33.9%');
doc.text('AdRoll (fake/random names)            290,091         47.9%');
doc.text('─'.repeat(60));
doc.text('TOTAL                                 606,131        100.0%');

doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(14).text('⚠️  WARNING: MISMATCHED NAMES');
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12);
doc.text('290,091 contacts (47.9%) have names that likely DO NOT match');
doc.text('their email addresses. These contacts came from AdRoll ads and');
doc.text('have randomized/fake names in the First Name and Last Name fields.');
doc.moveDown();
doc.text('Example of mismatched data:');
doc.font('Courier').fontSize(10);
doc.text('  Name: "Piper Lewis"  →  Email: lisapatton@aol.com');
doc.text('  Name: "Mika Hart"    →  Email: nelsonzheng@yahoo.com');
doc.font('Helvetica').fontSize(11);
doc.moveDown();
doc.text('110,576 contacts had their names CORRECTED by parsing the email');
doc.text('address (e.g., michael.hunstad@gmail.com → Michael Hunstad).');

doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(18).text('CONTACTS MISSING USABLE NAMES');
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12);
doc.text('AdRoll contacts where name could NOT be parsed from email:');
doc.font('Helvetica-Bold').fontSize(24).text('290,091 contacts');
doc.font('Helvetica').fontSize(11);
doc.text('These contacts have fake names that cannot be corrected because');
doc.text('the email format doesn\'t contain the real name (e.g., xyz123@gmail.com).');

// ====== PAGE 4: DATA SOURCES ======
doc.addPage();
doc.font('Helvetica-Bold').fontSize(18).text('DATA SOURCES');
doc.moveDown();

doc.font('Helvetica').fontSize(11);
doc.text('Source                           Count       Has Real Names?');
doc.text('─'.repeat(60));
doc.text('AdRoll 15-18                    102,260      ❌ No (fake names)');
doc.text('AdRoll 7-10                      99,994      ❌ No (fake names)');
doc.text('AdRoll 3-6                       99,988      ❌ No (fake names)');
doc.text('AdRoll 11-14                     98,425      ❌ No (fake names)');
doc.text('California Realtors              60,865      ✅ Yes (real names)');
doc.text('AZ-NV Realtors                   56,621      ✅ Yes (real names)');
doc.text('Florida Realtors                 52,662      ✅ Yes (real names)');
doc.text('Texas Realtors                   35,316      ✅ Yes (real names)');
doc.text('─'.repeat(60));
doc.text('TOTAL                           606,131');

doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(14).text('SUMMARY OF ISSUES:');
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(11);
doc.text('1. 400,667 contacts from AdRoll have randomized fake names');
doc.text('2. Only 110,576 of those could be corrected via email parsing');
doc.text('3. 290,091 contacts remain with incorrect name data');
doc.text('4. 205,464 contacts from state files have correct original names');
doc.text('5. 386,006 contacts cannot be categorized (personal emails)');

doc.moveDown(2);
doc.font('Helvetica').fontSize(9).text('Report generated by GHL Automation System', { align: 'center' });
doc.text('Contact data from Paul Tropp AdRoll campaigns and state realtor lists', { align: 'center' });

doc.end();
console.log('PDF saved to:', out);
