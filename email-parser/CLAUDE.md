# Email Parser - Project Rules

## Pipeline Component Checklist

**For ANY data pipeline change, verify impact on ALL layers:**

1. [ ] **Pre-Filter** (`comprehensive-extractor.js:preFilterNonHuman()`)
   - Regex patterns that skip emails before LLM
2. [ ] **Exchange Gate** (`comprehensive-extractor.js` + `email-index.json`)
   - Bi-directional requirement: davidSent > 0 AND davidReceived > 0
3. [ ] **LLM Extraction** (`utils/llm-extractor.js`)
   - Prompt rules, isHuman detection, confidence scoring
4. [ ] **Save Logic** (`comprehensive-extractor.js:main()`)
   - What gets written to comprehensive-contacts.json
5. [ ] **Cleanup Scripts** (`clean-before-extraction.js`)
   - Rules that run before/after extraction

---

## Permanent Contact Rules

1. **Bi-directional exchange REQUIRED** - Only save contacts where:
   - `davidSent > 0` (David emailed them)
   - `davidReceived > 0` (They emailed David)
   - One-way contacts are NOT real relationships

2. **Notification emails are NOT contacts:**
   - DocuSign (@docusign.net, dse_*@docusign)
   - Google Drive (drive-shares-*@google.com)
   - Vendor notifications (@followupboss.com, etc.)
   - Generic notification subdomains (@email.*, @mail.*, @notifications.*)

3. **LLM is the LAST line of defense** - Pre-filter and exchange gate
   should catch 90%+ of garbage before LLM is called

---

## Processing Rules

1. **DO NOT process spam or trash emails** - Skip any emails with X-Gmail-Labels containing "Spam" or "Trash"

2. **Filter David Young's data** - Never attribute David's NMLS (62043), phone numbers (818-223-9999, 310-954-7772, 818-936-3800), or company names (Lendwise, Priority Financial, One Nation) to other contacts

3. **Extract names from From header first** - Use display name from From header before falling back to signature extraction

4. **Direction-aware extraction** - Only extract signature data from emails SENT BY the contact, not from David's replies

---

## Data Sources

- Primary mbox: `/mnt/c/Users/dyoun/Downloads/takeout-Priority-Takout/Takeout/Mail/`
- Secondary mbox: `/mnt/c/Users/dyoun/Downloads/takeout-20251221T055337Z-3-001/Takeout/Mail/`

---

## Key Files

- `comprehensive-extractor.js` - Main extraction pipeline with pre-filter + exchange gate
- `utils/llm-extractor.js` - LLM prompt and extraction logic
- `clean-before-extraction.js` - Cleanup script with bi-directional enforcement
- `enforce-bidirectional.js` - One-time cleanup for bi-directional enforcement
- `utils/extractor.js` - Shared extraction utilities (phone, NMLS, DRE, signature detection)
- `auto-classifier.js` - 100% accuracy classification rules
- `data/comprehensive-contacts.json` - Final contact database
- `data/email-index.json` - Contact email exchange index
