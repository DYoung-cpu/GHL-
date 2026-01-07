const cache = require('./data/enrichment-cache.json');
const contacts = Object.values(cache);

function assessSignatureQuality(sig) {
  if (!sig) return 'none';

  // Check for garbage patterns
  const hasBase64 = /[A-Za-z0-9+\/=]{40,}/.test(sig);
  const hasHTML = /<[a-z]/i.test(sig) || /style=|font-family|color:/i.test(sig);
  const hasMIME = /=[A-F0-9]{2}/i.test(sig) || /=\r?\n/.test(sig);
  const hasURLGarbage = /https?:\/\/[^\s]{100,}/.test(sig);

  // Check for good patterns
  const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(sig);
  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(sig);
  const hasName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(sig);
  const hasTitle = /officer|director|manager|president|agent|broker|specialist/i.test(sig);

  // Calculate quality
  const badSignals = (hasBase64 ? 1 : 0) + (hasHTML ? 1 : 0) + (hasMIME ? 1 : 0) + (hasURLGarbage ? 1 : 0);
  const goodSignals = (hasPhone ? 1 : 0) + (hasEmail ? 1 : 0) + (hasName ? 1 : 0) + (hasTitle ? 1 : 0);

  if (badSignals >= 2) return 'garbage';
  if (badSignals >= 1 && goodSignals === 0) return 'poor';
  if (goodSignals >= 2) return 'good';
  if (goodSignals >= 1) return 'partial';
  return 'unclear';
}

// Analyze all signatures
const quality = { good: 0, partial: 0, poor: 0, garbage: 0, unclear: 0, none: 0 };

for (const c of contacts) {
  const sig = c.sampleSignatures?.[0] || '';
  const q = assessSignatureQuality(sig);
  quality[q]++;
}

console.log('=== SIGNATURE QUALITY ANALYSIS ===');
console.log('Total contacts:', contacts.length);
console.log('');
console.log('Quality breakdown:');
console.log('  GOOD (has phone/email/name/title):', quality.good, '(' + Math.round(quality.good/contacts.length*100) + '%)');
console.log('  PARTIAL (some good signals):', quality.partial, '(' + Math.round(quality.partial/contacts.length*100) + '%)');
console.log('  UNCLEAR (no clear signals):', quality.unclear, '(' + Math.round(quality.unclear/contacts.length*100) + '%)');
console.log('  POOR (has garbage, no good):', quality.poor, '(' + Math.round(quality.poor/contacts.length*100) + '%)');
console.log('  GARBAGE (base64/HTML/MIME):', quality.garbage, '(' + Math.round(quality.garbage/contacts.length*100) + '%)');
console.log('  NONE:', quality.none);

// Show some garbage examples
const garbageExamples = contacts.filter(c => {
  const sig = c.sampleSignatures?.[0] || '';
  return assessSignatureQuality(sig) === 'garbage';
}).slice(0, 2);

console.log('');
console.log('=== GARBAGE SIGNATURE EXAMPLES ===');
for (const c of garbageExamples) {
  console.log('Email:', c.email);
  console.log('First 150 chars:', c.sampleSignatures[0].substring(0, 150));
  console.log('---');
}

// Show some good examples
const goodExamples = contacts.filter(c => {
  const sig = c.sampleSignatures?.[0] || '';
  return assessSignatureQuality(sig) === 'good';
}).slice(0, 2);

console.log('');
console.log('=== GOOD SIGNATURE EXAMPLES ===');
for (const c of goodExamples) {
  console.log('Email:', c.email);
  console.log('First 200 chars:', c.sampleSignatures[0].substring(0, 200));
  console.log('Extracted: Phone:', c.phones, 'Title:', c.titles, 'Company:', c.companies);
  console.log('---');
}
