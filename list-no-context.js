const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json', 'utf-8'));

// Find emails with no useful context (no real name, no loan data, no notes)
const noContext = data.filter(c => {
  const hasRealFirstName = c.firstName && c.firstName.length > 2 && c.firstName.indexOf('@') === -1;
  const hasLoanData = c.loanAmount || c.loanProduct;
  const hasNotes = c.notes && c.notes.length > 5;
  const isConfirmed = c.nameConfidence === 'confirmed' || c.nameConfidence === 'high';

  return !hasRealFirstName && !hasLoanData && !hasNotes && !isConfirmed;
});

console.log('EMAILS WITH NO CONTEXT (' + noContext.length + ' total):');
console.log('─'.repeat(50));
noContext.forEach((c, i) => {
  console.log((i+1) + '. ' + c.email);
});
