#!/usr/bin/env node
/**
 * Scan Google Drive export for agreement-related documents
 */

const fs = require('fs');
const path = require('path');

const DRIVE_DIR = '/mnt/c/Users/dyoun/Downloads/drive-download-20251212T054029Z-3-001';
const OUTPUT_DIR = '/mnt/c/Users/dyoun/Downloads/PFN-Legal-Discovery';

// Agreement keywords to search in filenames
const FILENAME_PATTERNS = [
  /agreement/i,
  /contract/i,
  /compensation/i,
  /addendum/i,
  /amendment/i,
  /override/i,
  /commission/i,
  /hybrid/i,
  /modern/i,
  /solar/i,
  /affinity/i,
  /ILO/i,
  /DRE/i,
  /recruit/i,
  /margin/i,
  /tier/i,
  /bonus/i,
  /payout/i
];

// Track found files
const foundFiles = [];

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      // Check if filename matches any pattern
      for (const pattern of FILENAME_PATTERNS) {
        if (pattern.test(item)) {
          foundFiles.push({
            filename: item,
            path: fullPath,
            size: stat.size,
            matchedPattern: pattern.toString()
          });
          break;
        }
      }
    }
  }
}

/**
 * Copy matched files to discovery folder
 */
function copyMatchedFiles() {
  const destDir = path.join(OUTPUT_DIR, 'Attachments', 'Drive-Export');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const file of foundFiles) {
    const destPath = path.join(destDir, file.filename);
    fs.copyFileSync(file.path, destPath);
    console.log(`Copied: ${file.filename}`);
  }
}

// Main
console.log('='.repeat(60));
console.log('SCANNING GOOGLE DRIVE EXPORT');
console.log('='.repeat(60));

if (fs.existsSync(DRIVE_DIR)) {
  scanDirectory(DRIVE_DIR);

  console.log(`\nFound ${foundFiles.length} potential agreement files:\n`);

  for (const file of foundFiles) {
    console.log(`  ${file.filename}`);
    console.log(`    Size: ${(file.size / 1024).toFixed(1)} KB`);
    console.log(`    Pattern: ${file.matchedPattern}`);
  }

  if (foundFiles.length > 0) {
    console.log('\nCopying files to discovery folder...');
    copyMatchedFiles();
  }

  // Save index
  const indexPath = path.join(OUTPUT_DIR, 'DRIVE_FILES_INDEX.json');
  fs.writeFileSync(indexPath, JSON.stringify(foundFiles, null, 2));
  console.log(`\nIndex saved to: ${indexPath}`);
} else {
  console.log(`Drive directory not found: ${DRIVE_DIR}`);
}

console.log('\nDrive scan complete.');
