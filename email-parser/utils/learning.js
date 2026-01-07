/**
 * Learning Module - Learns from user corrections to improve extraction
 *
 * When user edits a field (title, company, phone), this module:
 * 1. Finds where that value appeared in the signature
 * 2. Extracts the pattern that SHOULD have matched
 * 3. Saves it to knowledge-base.json
 * 4. Future extractions check learned patterns FIRST
 */

const fs = require('fs');
const path = require('path');

const KB_PATH = path.join(__dirname, '../knowledge/knowledge-base.json');

/**
 * Load the knowledge base
 */
function loadKnowledgeBase() {
  let kb = {
    learned_patterns: {
      titles: [],      // { pattern: string, value: string, learnedFrom: email, learnedAt: date }
      companies: [],   // Same structure
      phones: []       // Same structure
    },
    stats: {
      totalCorrections: 0,
      titleCorrections: 0,
      companyCorrections: 0,
      phoneCorrections: 0
    },
    updatedAt: new Date().toISOString()
  };

  try {
    if (fs.existsSync(KB_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));

      // Merge with defaults to ensure structure exists
      kb = {
        ...kb,
        ...loaded,
        learned_patterns: {
          titles: loaded.learned_patterns?.titles || [],
          companies: loaded.learned_patterns?.companies || [],
          phones: loaded.learned_patterns?.phones || []
        },
        stats: {
          ...kb.stats,
          ...(loaded.stats || {})
        }
      };
    }
  } catch (e) {
    console.error('Error loading knowledge base:', e.message);
  }

  return kb;
}

/**
 * Save the knowledge base
 */
function saveKnowledgeBase(kb) {
  kb.updatedAt = new Date().toISOString();
  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2));
  console.log(`[LEARNING] Knowledge base saved with ${kb.learned_patterns.titles.length} title patterns, ${kb.learned_patterns.companies.length} company patterns`);
}

/**
 * Find where a value appears in a signature and extract the line as a pattern
 */
function findPatternInSignature(signature, value) {
  if (!signature || !value) return null;

  const lines = signature.split('\n');
  const valueLower = value.toLowerCase().trim();

  for (const line of lines) {
    const lineLower = line.toLowerCase().trim();

    // Exact match
    if (lineLower === valueLower) {
      return {
        type: 'exact',
        pattern: value.trim(),
        lineContext: line.trim()
      };
    }

    // Line contains the value
    if (lineLower.includes(valueLower)) {
      return {
        type: 'contains',
        pattern: value.trim(),
        lineContext: line.trim()
      };
    }
  }

  // Value not found in signature - user manually entered it
  return {
    type: 'manual',
    pattern: value.trim(),
    lineContext: null
  };
}

/**
 * Learn from a user correction
 *
 * @param {Object} contact - The contact being corrected
 * @param {Object} userEdits - { title, company, phone, name, email }
 * @param {Object} originalExtraction - What we extracted (from enrichment cache)
 */
function learnFromCorrection(contact, userEdits, originalExtraction) {
  const kb = loadKnowledgeBase();
  const signature = originalExtraction?.sampleSignatures?.[0] || '';
  let learned = [];

  // Learn title pattern
  if (userEdits.title && userEdits.title.trim()) {
    const originalTitle = originalExtraction?.titles?.[0];

    // Only learn if we missed it or got it wrong
    if (!originalTitle || originalTitle.toLowerCase() !== userEdits.title.toLowerCase()) {
      const patternInfo = findPatternInSignature(signature, userEdits.title);

      // Check if we already have this pattern
      const exists = kb.learned_patterns.titles.some(p =>
        p.pattern.toLowerCase() === userEdits.title.toLowerCase()
      );

      if (!exists) {
        kb.learned_patterns.titles.push({
          pattern: userEdits.title.trim(),
          patternType: patternInfo?.type || 'manual',
          lineContext: patternInfo?.lineContext,
          learnedFrom: contact.email,
          learnedAt: new Date().toISOString(),
          originalMissed: originalTitle || null
        });
        kb.stats.titleCorrections++;
        learned.push(`title: "${userEdits.title}"`);
      }
    }
  }

  // Learn company pattern
  if (userEdits.company && userEdits.company.trim()) {
    const originalCompany = originalExtraction?.companies?.[0];

    if (!originalCompany || originalCompany.toLowerCase() !== userEdits.company.toLowerCase()) {
      const patternInfo = findPatternInSignature(signature, userEdits.company);

      const exists = kb.learned_patterns.companies.some(p =>
        p.pattern.toLowerCase() === userEdits.company.toLowerCase()
      );

      if (!exists) {
        kb.learned_patterns.companies.push({
          pattern: userEdits.company.trim(),
          patternType: patternInfo?.type || 'manual',
          lineContext: patternInfo?.lineContext,
          learnedFrom: contact.email,
          learnedAt: new Date().toISOString(),
          originalMissed: originalCompany || null
        });
        kb.stats.companyCorrections++;
        learned.push(`company: "${userEdits.company}"`);
      }
    }
  }

  // Learn phone pattern (less common but still useful)
  if (userEdits.phone && userEdits.phone.trim()) {
    const originalPhone = originalExtraction?.phones?.[0];
    const cleanPhone = userEdits.phone.replace(/\D/g, '');

    if (cleanPhone.length >= 10 && (!originalPhone || originalPhone !== cleanPhone)) {
      const exists = kb.learned_patterns.phones.some(p =>
        p.pattern.replace(/\D/g, '') === cleanPhone
      );

      if (!exists) {
        kb.learned_patterns.phones.push({
          pattern: cleanPhone,
          formatted: userEdits.phone.trim(),
          learnedFrom: contact.email,
          learnedAt: new Date().toISOString()
        });
        kb.stats.phoneCorrections++;
        learned.push(`phone: "${userEdits.phone}"`);
      }
    }
  }

  if (learned.length > 0) {
    kb.stats.totalCorrections++;
    saveKnowledgeBase(kb);
    console.log(`[LEARNING] Learned from ${contact.email}: ${learned.join(', ')}`);
    return { learned: true, patterns: learned };
  }

  return { learned: false, patterns: [] };
}

/**
 * Get learned title patterns for use in extraction
 */
function getLearnedTitlePatterns() {
  const kb = loadKnowledgeBase();
  return kb.learned_patterns.titles.map(p => p.pattern);
}

/**
 * Get learned company patterns for use in extraction
 */
function getLearnedCompanyPatterns() {
  const kb = loadKnowledgeBase();
  return kb.learned_patterns.companies.map(p => p.pattern);
}

/**
 * Check if a signature contains any learned title patterns
 * Returns the first match found
 */
function matchLearnedTitle(signatureBlock) {
  const kb = loadKnowledgeBase();
  const sigLower = signatureBlock.toLowerCase();

  for (const learned of kb.learned_patterns.titles) {
    // Check if the learned pattern appears in this signature
    if (sigLower.includes(learned.pattern.toLowerCase())) {
      // Find the exact line to get proper casing
      const lines = signatureBlock.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes(learned.pattern.toLowerCase())) {
          // Extract the value with original casing
          const idx = line.toLowerCase().indexOf(learned.pattern.toLowerCase());
          const extracted = line.substring(idx, idx + learned.pattern.length);
          return {
            value: extracted.trim() || learned.pattern,
            source: 'learned',
            learnedFrom: learned.learnedFrom,
            confidence: 0.95
          };
        }
      }

      // Fallback to stored pattern
      return {
        value: learned.pattern,
        source: 'learned',
        learnedFrom: learned.learnedFrom,
        confidence: 0.9
      };
    }
  }

  return null;
}

/**
 * Check if a signature contains any learned company patterns
 */
function matchLearnedCompany(signatureBlock) {
  const kb = loadKnowledgeBase();
  const sigLower = signatureBlock.toLowerCase();

  for (const learned of kb.learned_patterns.companies) {
    if (sigLower.includes(learned.pattern.toLowerCase())) {
      const lines = signatureBlock.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes(learned.pattern.toLowerCase())) {
          const idx = line.toLowerCase().indexOf(learned.pattern.toLowerCase());
          const extracted = line.substring(idx, idx + learned.pattern.length);
          return {
            value: extracted.trim() || learned.pattern,
            source: 'learned',
            learnedFrom: learned.learnedFrom,
            confidence: 0.95
          };
        }
      }

      return {
        value: learned.pattern,
        source: 'learned',
        learnedFrom: learned.learnedFrom,
        confidence: 0.9
      };
    }
  }

  return null;
}

/**
 * Get learning statistics
 */
function getLearningStats() {
  const kb = loadKnowledgeBase();
  const lp = kb.learned_patterns || { titles: [], companies: [], phones: [] };
  return {
    totalPatterns: (lp.titles?.length || 0) + (lp.companies?.length || 0) + (lp.phones?.length || 0),
    titlePatterns: lp.titles?.length || 0,
    companyPatterns: lp.companies?.length || 0,
    phonePatterns: lp.phones?.length || 0,
    totalCorrections: kb.stats?.totalCorrections || 0,
    lastUpdated: kb.updatedAt
  };
}

module.exports = {
  loadKnowledgeBase,
  saveKnowledgeBase,
  learnFromCorrection,
  getLearnedTitlePatterns,
  getLearnedCompanyPatterns,
  matchLearnedTitle,
  matchLearnedCompany,
  getLearningStats
};
