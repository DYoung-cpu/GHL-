const fs = require('fs');

// Search for ANY Excel spreadsheet related to production, recruiting, LO, or loans in the mbox
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

async function findProductionSpreadsheets() {
  const stream = fs.createReadStream(mboxPath, { encoding: 'utf8', highWaterMark: 50 * 1024 * 1024 });

  let buffer = '';
  let emailsFound = 0;
  let attachmentsExtracted = 0;
  const seenFiles = new Set();

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      buffer += chunk;

      // Search for xlsx files with relevant names
      const patterns = [
        /filename="?([^"\r\n;]*(?:production|recruit|LO|loan|volume|funded|hired)[^"\r\n;]*\.xlsx?)"?/gi,
        /name="?([^"\r\n;]*(?:production|recruit|LO|loan|volume|funded|hired)[^"\r\n;]*\.xlsx?)"?/gi
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(buffer)) !== null) {
          const filename = match[1];
          if (seenFiles.has(filename)) continue;
          seenFiles.add(filename);

          console.log(`\nFound file: ${filename}`);

          // Find context around this match
          const matchPos = match.index;
          const contextStart = Math.max(0, matchPos - 5000);
          const contextEnd = Math.min(buffer.length, matchPos + 50000);
          const context = buffer.substring(contextStart, contextEnd);

          // Get email headers
          const dateMatch = context.match(/^Date: (.+)$/m);
          const subjectMatch = context.match(/^Subject: (.+)$/m);
          const fromMatch = context.match(/^From: (.+)$/m);

          console.log(`  Date: ${dateMatch ? dateMatch[1] : 'Unknown'}`);
          console.log(`  Subject: ${subjectMatch ? subjectMatch[1] : 'Unknown'}`);
          console.log(`  From: ${fromMatch ? fromMatch[1] : 'Unknown'}`);

          emailsFound++;

          // Try to extract the attachment
          const filenameIdx = context.indexOf(filename);
          if (filenameIdx !== -1) {
            const searchRegion = context.substring(filenameIdx, filenameIdx + 1000);
            if (searchRegion.toLowerCase().includes('base64')) {
              const encodingIdx = context.toLowerCase().indexOf('base64', filenameIdx);
              let contentStart = context.indexOf('\n\n', encodingIdx);
              if (contentStart === -1) contentStart = context.indexOf('\r\n\r\n', encodingIdx);

              if (contentStart !== -1) {
                let contentEnd = context.indexOf('\n--', contentStart + 2);
                if (contentEnd === -1) contentEnd = Math.min(contentStart + 200000, context.length);

                const base64Content = context.substring(contentStart + 2, contentEnd)
                  .replace(/[\r\n\s]/g, '');

                if (base64Content.length > 1000) {
                  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                  const outputPath = `/mnt/c/Users/dyoun/ghl-automation/production-${emailsFound}-${safeName}`;

                  try {
                    const decoded = Buffer.from(base64Content, 'base64');
                    const magic = decoded.slice(0, 4).toString('hex');

                    if (magic.startsWith('504b') || magic.startsWith('d0cf11e0')) {
                      fs.writeFileSync(outputPath, decoded);
                      console.log(`  EXTRACTED: ${outputPath} (${decoded.length} bytes)`);
                      attachmentsExtracted++;
                    } else {
                      console.log(`  Skipped - invalid file format`);
                    }
                  } catch (e) {
                    console.log(`  Error: ${e.message}`);
                  }
                }
              }
            }
          }
        }
      }

      // Keep buffer manageable
      if (buffer.length > 150 * 1024 * 1024) {
        buffer = buffer.slice(-100 * 1024 * 1024);
      }
    });

    stream.on('end', () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`SCAN COMPLETE`);
      console.log(`Production-related Excel files found: ${emailsFound}`);
      console.log(`Attachments extracted: ${attachmentsExtracted}`);
      resolve();
    });

    stream.on('error', reject);
  });
}

findProductionSpreadsheets().catch(console.error);
