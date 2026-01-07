/**
 * Test base64 decoding fix for Frank Pita
 */
const fs = require('fs');
const readline = require('readline');

const MBOX_PATH = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';
const targetEmail = 'frank@nationsmortgagebank.com';

async function testExtract() {
  const rl = readline.createInterface({
    input: fs.createReadStream(MBOX_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let currentEmail = {
    from: '',
    body: [],
    textPlainBody: [],
    base64Buffer: [],
    inHeaders: false,
    inBody: false,
    currentMimeType: null,
    inBase64: false,
    textPlainIsBase64: false
  };
  let emailCount = 0;
  let matchCount = 0;

  for await (const line of rl) {
    // New email boundary
    if (line.startsWith('From ') && line.includes('@')) {
      // Decode any remaining base64 buffer
      if (currentEmail.base64Buffer && currentEmail.base64Buffer.length > 0) {
        try {
          const base64Content = currentEmail.base64Buffer.join('');
          const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
          currentEmail.textPlainBody = currentEmail.textPlainBody || [];
          currentEmail.textPlainBody.push(...decoded.split('\n'));
        } catch (e) {}
      }

      // Check if this email is from Frank
      const fromMatch = currentEmail.from.match(/<([^>]+)>/);
      const fromEmail = fromMatch ? fromMatch[1] : (currentEmail.from.match(/[\w.-]+@[\w.-]+\.\w+/) || [])[0];

      if (fromEmail && fromEmail.toLowerCase() === targetEmail) {
        matchCount++;
        console.log('\n=== FOUND EMAIL FROM FRANK ===');
        console.log('From:', currentEmail.from);
        console.log('textPlainBody lines:', currentEmail.textPlainBody?.length || 0);
        console.log('\n--- Text/Plain Body (first 40 lines) ---');
        const body = (currentEmail.textPlainBody || []).slice(0, 40);
        console.log(body.join('\n'));
      }

      emailCount++;
      if (emailCount % 10000 === 0) {
        process.stdout.write(`\rScanned ${emailCount} emails, found ${matchCount} from Frank`);
      }
      currentEmail = {
        from: '',
        body: [],
        textPlainBody: [],
        base64Buffer: [],
        inHeaders: true,
        inBody: false,
        currentMimeType: null,
        inBase64: false,
        textPlainIsBase64: false
      };
      continue;
    }

    // Capture From header
    if (currentEmail.inHeaders && line.toLowerCase().startsWith('from:')) {
      currentEmail.from = line.substring(5).trim();
    }

    // End of headers
    if (line === '' && currentEmail.inHeaders) {
      currentEmail.inHeaders = false;
      currentEmail.inBody = true;
      continue;
    }

    // Capture body
    if (currentEmail.inBody) {
      if (line.toLowerCase().startsWith('content-type:')) {
        currentEmail.currentMimeType = line.toLowerCase();
        currentEmail.textPlainIsBase64 = false;
      }

      if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
        currentEmail.inBase64 = true;
        if (currentEmail.currentMimeType?.includes('text/plain')) {
          currentEmail.textPlainIsBase64 = true;
        }
      }

      if (currentEmail.currentMimeType?.includes('text/plain')) {
        if (!line.startsWith('Content-') && !line.startsWith('--') && line.trim()) {
          if (currentEmail.textPlainIsBase64) {
            if (/^[A-Za-z0-9+\/=]+$/.test(line.trim()) && line.trim().length > 10) {
              currentEmail.base64Buffer.push(line.trim());
            }
          } else {
            currentEmail.textPlainBody = currentEmail.textPlainBody || [];
            currentEmail.textPlainBody.push(line);
          }
        }
      }

      if (line.startsWith('--') && line.length > 20) {
        if (currentEmail.base64Buffer.length > 0) {
          try {
            const base64Content = currentEmail.base64Buffer.join('');
            const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
            currentEmail.textPlainBody = currentEmail.textPlainBody || [];
            currentEmail.textPlainBody.push(...decoded.split('\n'));
          } catch (e) {}
          currentEmail.base64Buffer = [];
        }
        currentEmail.inBase64 = false;
        currentEmail.currentMimeType = null;
        currentEmail.textPlainIsBase64 = false;
      }
    }
  }

  console.log('\n\nTotal emails scanned:', emailCount);
  console.log('Emails from Frank:', matchCount);
}

testExtract().catch(console.error);
