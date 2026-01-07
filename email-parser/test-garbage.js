function isGarbageLine(line) {
  const trimmed = line.trim();
  if (!trimmed) { console.log('  => Empty'); return false; }
  if (/^[A-Za-z0-9+\/=]{40,}$/.test(trimmed)) { console.log('  => Base64'); return true; }
  if (/^--[A-Za-z0-9_=-]+/.test(trimmed)) { console.log('  => MIME boundary'); return true; }
  if (/^(Content-Type:|Content-Transfer-Encoding:|Content-Disposition:|MIME-Version:)/i.test(trimmed)) { console.log('  => MIME header'); return true; }
  if (/^(%PDF|obj|endobj|stream|endstream|xref|trailer)/i.test(trimmed)) { console.log('  => PDF'); return true; }
  if (/^<[!?\\/]?[a-z]/i.test(trimmed)) { console.log('  => HTML tag start'); return true; }
  if (/<\/?(html|head|body|div|span|table|tr|td|p|br|font|style|script|meta|title|img|a\s)/i.test(trimmed)) { console.log('  => HTML tag'); return true; }
  if (/=3D|=\r?\n$|charset=|style=|class=/i.test(trimmed)) { console.log('  => MIME encoded'); return true; }
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(trimmed)) { console.log('  => Non-printable'); return true; }
  if (/([^\s])\1{4,}/.test(trimmed)) { console.log('  => Repeated chars'); return true; }
  return false;
}

const lines = [
  "Direct/Cell:          661-510-4468",
  "Office:                     949-537-3000",
  "Nation's Mortgage Bank",
  "Frank Pita",
  "President Granda Hills Branch"
];

for (const line of lines) {
  console.log(`"${line}" => ${isGarbageLine(line) ? 'GARBAGE' : 'OK'}`);
}
