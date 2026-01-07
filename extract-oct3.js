const fs = require('fs');
const mboxPath = '/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/All mail Including Spam and Trash.mbox';

// Read around byte 21890000 (Oct 3 20:08 reply)
const fd = fs.openSync(mboxPath, 'r');
const buffer = Buffer.alloc(100000);
fs.readSync(fd, buffer, 0, 100000, 21890000);
fs.closeSync(fd);

const content = buffer.toString('utf8');

// Look for text/plain content section
const plainIdx = content.indexOf('Content-Type: text/plain');
if (plainIdx !== -1) {
  let textStart = content.indexOf('\n\n', plainIdx);
  let textEnd = content.indexOf('\n--', textStart + 100);
  if (textEnd === -1) textEnd = textStart + 10000;

  let body = content.substring(textStart, textEnd);
  // Decode quoted-printable
  body = body.replace(/=\r?\n/g, '');
  body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  console.log(body.substring(0, 5000));
} else {
  console.log('No text/plain found, showing raw:');
  console.log(content.substring(0, 3000));
}
