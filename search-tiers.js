const fs = require('fs');

// Search for emails about tier overrides (gold, platinum, silver) between David and Brenda
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

async function searchTierEmails() {
  const stream = fs.createReadStream(mboxPath, { encoding: 'utf8', highWaterMark: 30 * 1024 * 1024 });

  let buffer = '';
  let emailsFound = [];
  const processedPositions = new Set();

  const tierKeywords = ['tier', 'gold', 'platinum', 'silver', 'bronze', 'override', 'overide', 'lock desk', 'lockdesk'];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      buffer += chunk;

      // Search for Brenda in emails
      let searchStart = 0;

      while (true) {
        // Look for brenda in the buffer
        let brendaIdx = buffer.toLowerCase().indexOf('brenda', searchStart);
        if (brendaIdx === -1) break;

        // Skip if already processed nearby
        const posKey = Math.floor(brendaIdx / 5000);
        if (processedPositions.has(posKey)) {
          searchStart = brendaIdx + 100;
          continue;
        }
        processedPositions.add(posKey);

        // Find email boundaries
        let emailStart = buffer.lastIndexOf('\nFrom ', brendaIdx - 3000);
        if (emailStart === -1) emailStart = 0;
        else emailStart += 1;

        let emailEnd = buffer.indexOf('\nFrom ', brendaIdx + 100);
        if (emailEnd === -1) emailEnd = Math.min(brendaIdx + 50000, buffer.length);

        const email = buffer.substring(emailStart, emailEnd);
        const emailLower = email.toLowerCase();

        // Check if this email mentions tier-related keywords
        const hasTierContent = tierKeywords.some(kw => emailLower.includes(kw));

        // Check if it's to/from Brenda and David
        const hasBrend = emailLower.includes('brenda');
        const hasDavid = emailLower.includes('david') || emailLower.includes('davidyoung@');

        if (hasTierContent && hasBrend) {
          // Get email metadata
          const dateMatch = email.match(/^Date: (.+)$/m);
          const subjectMatch = email.match(/^Subject: (.+)$/m);
          const fromMatch = email.match(/^From: (.+)$/m);
          const toMatch = email.match(/^To: (.+)$/m);

          const date = dateMatch ? dateMatch[1].trim() : 'Unknown';
          const subject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';
          const from = fromMatch ? fromMatch[1].trim() : 'Unknown';
          const to = toMatch ? toMatch[1].trim().substring(0, 100) : 'Unknown';

          // Check which tier keywords are present
          const foundKeywords = tierKeywords.filter(kw => emailLower.includes(kw));

          // Create unique ID to avoid duplicates
          const emailId = `${date}-${subject.substring(0, 30)}`;
          if (!emailsFound.some(e => e.id === emailId)) {
            emailsFound.push({
              id: emailId,
              date,
              subject,
              from,
              to,
              keywords: foundKeywords,
              snippet: email.substring(0, 500).replace(/\n/g, ' ').substring(0, 300)
            });

            console.log(`\n${'='.repeat(70)}`);
            console.log(`EMAIL #${emailsFound.length}`);
            console.log(`Date: ${date}`);
            console.log(`Subject: ${subject}`);
            console.log(`From: ${from}`);
            console.log(`To: ${to}`);
            console.log(`Keywords: ${foundKeywords.join(', ')}`);
          }
        }

        searchStart = brendaIdx + 100;
        if (searchStart >= buffer.length - 1000) break;
      }

      // Keep buffer manageable
      if (buffer.length > 80 * 1024 * 1024) {
        buffer = buffer.slice(-50 * 1024 * 1024);
      }
    });

    stream.on('end', () => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`SCAN COMPLETE - Found ${emailsFound.length} emails about tiers/overrides with Brenda`);

      // Save results
      fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/tier-emails-summary.json', JSON.stringify(emailsFound, null, 2));
      console.log('Saved summary to: tier-emails-summary.json');
      resolve(emailsFound);
    });

    stream.on('error', reject);
  });
}

searchTierEmails().catch(console.error);
