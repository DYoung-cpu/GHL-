const fs = require('fs');

// Extract MLO System Access emails with tier info
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

async function extractTierEmails() {
  const stream = fs.createReadStream(mboxPath, { encoding: 'utf8', highWaterMark: 30 * 1024 * 1024 });

  let buffer = '';
  let emailsFound = [];
  const processedIds = new Set();

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      buffer += chunk;

      // Search for tier-related keywords
      const searchTerms = [
        'silver tier',
        'bronze tier',
        'gold tier',
        'platinum tier',
        'bronze-silver-gold',
        'tier adjuster',
        'Plan Code A'
      ];

      for (const term of searchTerms) {
        let searchStart = 0;
        while (true) {
          const idx = buffer.toLowerCase().indexOf(term.toLowerCase(), searchStart);
          if (idx === -1) break;

          // Find email boundaries
          let emailStart = buffer.lastIndexOf('\nFrom ', idx - 10000);
          if (emailStart === -1) emailStart = Math.max(0, idx - 10000);
          else emailStart += 1;

          let emailEnd = buffer.indexOf('\nFrom ', idx + 100);
          if (emailEnd === -1) emailEnd = Math.min(idx + 30000, buffer.length);

          const email = buffer.substring(emailStart, emailEnd);

          // Get metadata
          const dateMatch = email.match(/^Date: (.+)$/m);
          const subjectMatch = email.match(/^Subject: (.+)$/m);
          const fromMatch = email.match(/^From: (.+)$/m);
          const toMatch = email.match(/^To: (.+)$/m);

          const date = dateMatch ? dateMatch[1].trim() : 'Unknown';
          const subject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';

          // Create unique ID
          const emailId = `${date.substring(0, 20)}-${subject.substring(0, 40)}`;
          if (processedIds.has(emailId)) {
            searchStart = idx + 100;
            continue;
          }
          processedIds.add(emailId);

          // Only process relevant emails (skip spam)
          if (subject.includes('MLO') || subject.includes('Access Request') ||
              subject.includes('override') || subject.includes('Overrides') ||
              email.toLowerCase().includes('tier adjuster') ||
              email.toLowerCase().includes('bronze-silver-gold')) {

            // Extract readable body
            let body = email;
            // Decode quoted-printable
            body = body.replace(/=\r?\n/g, '');
            body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            body = body.replace(/<[^>]+>/g, ' ');
            body = body.replace(/&nbsp;/g, ' ');
            body = body.replace(/\s+/g, ' ').trim();

            // Find the relevant content around tier mentions
            const tierIdx = body.toLowerCase().indexOf(term.toLowerCase());
            const snippet = body.substring(Math.max(0, tierIdx - 500), Math.min(body.length, tierIdx + 1000));

            console.log(`\n${'='.repeat(70)}`);
            console.log(`Term: "${term}"`);
            console.log(`Date: ${date}`);
            console.log(`Subject: ${subject}`);
            console.log(`From: ${fromMatch ? fromMatch[1].trim() : 'Unknown'}`);
            console.log(`---`);
            console.log(snippet.substring(0, 1500));

            emailsFound.push({
              term,
              date,
              subject,
              from: fromMatch ? fromMatch[1].trim() : 'Unknown',
              snippet
            });
          }

          searchStart = idx + 100;
          if (searchStart >= buffer.length - 1000) break;
        }
      }

      if (buffer.length > 60 * 1024 * 1024) {
        buffer = buffer.slice(-40 * 1024 * 1024);
      }
    });

    stream.on('end', () => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`COMPLETE - Found ${emailsFound.length} tier-related emails`);
      fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/tier-override-details.json', JSON.stringify(emailsFound, null, 2));
      console.log('Saved to: tier-override-details.json');
      resolve();
    });

    stream.on('error', reject);
  });
}

extractTierEmails().catch(console.error);
