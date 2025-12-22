# GHL Mortgage Automation - David Young

**CRITICAL: This file must be read at the start of every session to restore context.**

---

## PROJECT TRUTH (RULES - NEVER VIOLATE)

1. **IF YOU CAN DO IT, DO IT.** Never ask the user to do something you can automate yourself.
2. **Save conversations to project memory** after every significant interaction.
3. **Use the user's exact design** - never create your own version of their work.

---

## CURRENT STATUS (Dec 22, 2025)

Building marketing templates and workflows for David Young's GHL account.
- 878 contacts imported
- 1 email template created: Application Received - David Young (ID: 6949542531624164bbedd3e5)

---

## Project Overview
Building a custom mortgage CRM in Go High Level for Lendwise Mortgage, automating what would cost $1,500-$2,500 from premium snapshot providers.

## Client Information
- **Name:** David Young
- **Company:** LENDWISE MORTGAGE
- **Email:** david@lendwisemtg.com
- **Phone:** (310) 954-7772
- **Address:** 21800 Oxnard St #220, Woodland Hills, CA
- **GHL Location ID:** peE6XmGYBb1xV0iNbh6C
- **GHL Sub-account Name:** David Young

## Authentication
- **Method:** Google OAuth via david@lendwisemtg.com
- **Password:** Fafa2185!
- **Sub-account:** David Young

## API ACCESS

**Private Integration Token (API v2.0):**
```
pit-7427e736-d68a-41d8-9e9b-4b824b996926
```

**Configuration:**
- API Base URL: `https://services.leadconnectorhq.com`
- Location ID: `peE6XmGYBb1xV0iNbh6C`
- All scopes enabled (full access)
- Stored in: `.env` file

**API Capabilities:**
- Full CRUD: Contacts, Tags, Opportunities, Conversations, Calendars, Forms, Products, Invoices
- READ-ONLY: Workflows, Campaigns, Surveys
- AI Features: Voice AI, Conversation AI, Knowledge Base, Agent Studio

**Key Pattern:** Trigger workflows via API by adding tags to contacts

---

## COMPLETED WORK

| Task | Status | Details |
|------|--------|---------|
| Pipeline renamed | DONE | "Mortgage Sales Pipeline" with 10 stages |
| Custom fields | DONE | 15 mortgage-specific fields created |
| Tags | DONE | 35 categorization tags created |
| Email templates JSON | DONE | 53 templates in `templates/email-templates.json` |
| SMS templates JSON | DONE | 40 templates in `templates/sms-templates.json` |
| Forms templates | DONE | 5 forms in `templates/forms-templates.json` |
| Workflow templates | DONE | 15 automations in `templates/workflows-templates.json` |
| Setup guide | DONE | `SETUP-GUIDE.md` created |
| Calendars | DONE | 4 calendar types configured |
| SMS import to GHL | DONE | 40/40 snippets created |
| Email import to GHL | DONE | 53/53 snippets created |
| Email signature HTML | DONE | `templates/email-signature.html` |

### Pipeline Stages (10 total)
1. Contacted
2. Application Started
3. Application Submitted
4. Processing
5. Underwriting
6. Conditional Approval
7. Clear to Close
8. Closing Scheduled
9. Funded
10. Lost/Dead

---

## WORKING CODE PATTERNS (Copy-Paste Ready)

### 1. Google OAuth Login
```javascript
// Click Google sign-in iframe button
const googleIframe = await page.$('#g_id_signin iframe');
if (googleIframe) {
  const frame = await googleIframe.contentFrame();
  if (frame) {
    await frame.click('div[role="button"]');
  }
}
await page.waitForTimeout(3000);

// Handle Google popup - USE SAVED PASSWORD
const pages = context.pages();
const googlePage = pages.length > 1 ? pages[pages.length - 1] : page;

if (googlePage.url().includes('accounts.google.com')) {
  await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
  await googlePage.keyboard.press('Enter');
  await googlePage.waitForTimeout(3000);
  await googlePage.fill('input[type="password"]:visible', 'YOUR_SAVED_PASSWORD');
  await googlePage.keyboard.press('Enter');
  await page.waitForTimeout(8000);
}
```

### 2. Switch to Sub-Account
```javascript
const switcher = page.locator('text=Click here to switch');
if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
  await switcher.click();
  await page.waitForTimeout(2000);
  await page.locator('text=LENDWISE MORTGA').click();
  await page.waitForTimeout(3000);
}
```

### 3. Navigate to Pipelines
**IMPORTANT:** Must use main sidebar link, NOT settings page.
```javascript
// Click Opportunities in main left sidebar (NOT Settings)
await page.locator('a:has-text("Opportunities"), [class*="sidebar"] >> text=Opportunities').first().click();
await page.waitForTimeout(2000);

// Then click Pipelines TAB - select the RIGHTMOST one (x > 500)
const pipelinesElements = await page.$$('text=Pipelines');
for (const el of pipelinesElements) {
  const box = await el.boundingBox();
  if (box && box.y < 100 && box.x > 500) {  // CRITICAL: x > 500 selects the tab, not sidebar
    await el.click({ force: true });
    await page.waitForTimeout(2000);
    break;
  }
}
```

### 4. Direct URL Navigation (Fallback)
```javascript
await page.goto('https://app.gohighlevel.com/location/e6yMsslzphNw8bgqRgtV/settings/pipelines', {
  waitUntil: 'domcontentloaded'
});
await page.waitForTimeout(3000);
```

### 5. Input Text Reliably
```javascript
// Always use Control+a to select all, then type
await input.click();
await input.press('Control+a');
await input.type('New text here');  // Use type(), not fill() for GHL inputs
await page.waitForTimeout(500);
```

### 6. Modal Handling
GHL modals persist after operations. Multiple close methods needed:
```javascript
// Try multiple close methods
const cancelBtn = page.locator('button:has-text("Cancel")').first();
if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await cancelBtn.click({ force: true });
}

// Or press Escape
await page.keyboard.press('Escape');

// Or click outside modal
await page.mouse.click(50, 50);
```

---

## KNOWN ISSUES & SOLUTIONS

### Issue: Pipelines Tab Not Clicking
**Solution:** Select element with `x > 500` (rightmost instance)

### Issue: waitForLoadState('networkidle') Timing Out
**Solution:** Use 'domcontentloaded' instead with try/catch

### Issue: Input Not Accepting Text
**Solution:** Use Control+a then type(), not fill()

### Issue: Settings Opens Wrong Page
**Solution:** Navigate via Opportunities in main sidebar, not Settings

---

## FILE STRUCTURE
```
/mnt/c/Users/dyoun/ghl-automation/
├── CLAUDE.md                      # Auto-read instructions for Claude
├── SETUP-GUIDE.md                 # Manual setup guide
├── package.json                   # Node.js config
├── templates/                     # JSON template files
│   ├── email-templates.json       # 53 email templates
│   ├── sms-templates.json         # 40 SMS templates
│   ├── forms-templates.json       # 5 form templates
│   └── workflows-templates.json   # 15 workflow templates
├── screenshots/                   # 305+ debug screenshots
├── build-infrastructure.js        # Main automation script
├── create-email-templates.js      # Email snippet creator
├── create-sms-templates.js        # SMS snippet creator
├── create-calendars.js            # Calendar creator
├── create-custom-fields.js        # Custom fields creator
├── create-tags.js                 # Tags creator
├── rename-pipeline*.js            # Pipeline rename scripts (v1-v6)
└── .claude/
    └── project-memory.md          # THIS FILE
```

---

## EMAIL SIGNATURE

Created: `templates/email-signature.html`

**Contents:**
- Name: David Young, CMO / Partner
- Title: Business Development & Strategic Growth
- NMLS: 62043 | DRE: 01371572
- Phone: (310) 954-7772 (click-to-call)
- Email: david@lendwisemtg.com
- Schedule a Call button
- Apply Now button
- Website: lendwisemtg.com
- Location: Woodland Hills, CA
- Social: Facebook, Instagram, TikTok, LinkedIn, Google Reviews
- Confidentiality Notice
- IRS Circular 230 Disclosure
- Equal Housing Opportunity

**Social Media URLs (update if different):**
- Facebook: https://www.facebook.com/lendwisemortgage
- Instagram: https://www.instagram.com/lendwisemortgage
- TikTok: https://www.tiktok.com/@lendwisemortgage
- LinkedIn: https://www.linkedin.com/in/davidyoung-lendwise
- Google: https://g.page/r/lendwisemortgage/review

---

## PHASE 2 STATUS: IN PROGRESS (Dec 12, 2025)

### Completed Tasks:
- **Email Signature** - DONE (Dec 10, 2025)
- **Workflows** - DONE (Dec 11, 2025) - All 15 workflows created and named
- **Past Client Import** - DONE (Dec 12, 2025) - 878 contacts imported via API
- **BNTouch Content Extraction** - DONE (Dec 13, 2025) - See below

### Remaining Tasks:
1. **5 Special Workflow Triggers** - Manual config needed (Appointment, Birthday, etc.)
2. **Workflow Actions/Steps** - Add SMS/email actions to each workflow
3. **Form Building** - Create forms from JSON specs
4. **End-to-End Testing** - Verify all automations work
5. **Create Missing Workflows** - From BNTouch gap analysis

---

## MISSION CONTROL BUILD-OUT (Dec 13, 2025) - COMPLETE

### Summary
Built comprehensive LO-focused automation system with LENDWISE branding, filling all gaps identified in BNTouch vs GHL analysis.

### GHL IMPORT STATUS: 17/18 TEMPLATES IMPORTED ✅

**Import Date:** Dec 13, 2025
**Total GHL Snippets:** 110 (93 original + 17 new MC templates)

| Category | Imported | Status |
|----------|----------|--------|
| Loan Status 01-05 | 5/5 | ✅ Complete |
| Loan Status 06 | 0/1 | ❌ Manual import needed |
| Loan Status 07-08 | 2/2 | ✅ Complete |
| Purchase Nurture 01-05 | 5/5 | ✅ Complete |
| Refinance Nurture 01-05 | 5/5 | ✅ Complete |

**Missing Template (Manual Import Required):**
- `MC: Loan Status 06 - Clear to Close`
- Source file: `mission-control/emails/loan-status/06-clear-to-close.html`
- Go to Marketing > Snippets > + New Snippet > Add Email Snippet

**Working Import Script:** `mission-control/import-via-browser.js`
- Uses Playwright browser automation
- Google OAuth login with saved credentials
- Handles dropdown menus and modal dialogs
- Error recovery with page reload fallback

### Files Created: 26 Total

**Location:** `mission-control/`

**Email Templates (18):**
- 8 Loan Status Emails (with visual progress tracker)
- 5 Purchase Nurture Sequence
- 5 Refinance Nurture Sequence

**LO Self-Alerts (6):**
- New Application Alert
- 3-Day Processing Delay
- 7-Day Underwriting Delay
- 14-Day Approval Delay
- 21-Day CTC Escalation
- Funded Celebration

**SMS Templates (30+):**
- 8 Loan Status SMS
- 5 Lead Nurture SMS
- 4 Appointment SMS
- 6 Post-Close SMS
- 3 Pre-Qual SMS
- 1 Rate Drop SMS

**Supporting Files:**
- `import-to-ghl.js` - GHL API import script
- `complete-workflows.json` - All workflow specs
- `sms-templates.json` - All SMS templates
- `lendwise-brand.json` - Brand standards
- `README.md` - Full documentation

### Key Features Built
1. **Visual Loan Progress Tracker** - Checkmark-style milestone display
2. **Wire Fraud Warnings** - On all closing-related emails
3. **LO Self-Alert System** - Pipeline delay monitoring
4. **LENDWISE Branding** - Logo, colors, signature, disclosures
5. **GHL Merge Fields** - `{{contact.first_name}}`, `{{custom.field}}`

### Tags Created (13)
- Application Started, In Processing, In Underwriting
- Conditionally Approved, Loan Approved, Clear to Close
- Final Docs Ready, Closed, Post-Close Nurture
- Purchase Lead, Refinance Lead, Lost, Unsubscribed

### Import Command
```bash
node mission-control/import-to-ghl.js
```

### Gaps Filled (from BNTouch analysis)
- Loan Fully Approved sequence
- Final Docs Ready sequence
- Sent to Processing sequence
- Purchase Home Search Follow-Up (5 emails)
- Refinance Follow-Up (5 emails)
- Visual progress tracker (BNTouch feature recreated)

---

## BNTOUCH CONTENT EXTRACTION (Dec 13, 2025)

### Summary:
- **141 HTML email templates extracted** from BNTouch
- **19 loan-status specific campaigns** identified
- **48 total campaigns** in BNTouch account
- **Gap analysis completed** - identified missing workflows

### BNTouch Credentials:
- **Username:** lendwisemtg
- **Password:** SGG78696G
- **URL:** https://www.bntouchmortgage.net
- **Auth State:** Saved to `bntouch-auth.json`

### Extracted Files:
```
extracted-emails/              # 141 HTML email templates
bntouch-audit/                 # Complete audit data
  ├── complete-audit.json      # Full campaign audit
  ├── loan-status-campaigns.json  # 19 loan campaigns
  └── triggers-all.png         # Screenshot of triggers
```

### Critical Gaps Identified:

| Missing Workflow | Priority | Source |
|-----------------|----------|--------|
| Loan Fully Approved | P0 | BNTouch has 4-step sequence |
| Final Docs Ready | P0 | BNTouch has 4-step sequence |
| Sent to Processing | P0 | BNTouch has 4-step sequence |
| Purchase - Home Search Follow-Up | P1 | 15-step, 66-day sequence |
| Purchase - Found Home | P1 | 13-step sequence |
| Refinance Follow-Up | P1 | 14-step sequence |
| Partner Co-Branded Lead | P1 | Realtor referral sequence |
| First Time Home Buyers | P2 | Educational series |
| Co-Borrower Birthday | P2 | 12-year cycle |

### Key BNTouch Feature Missing in GHL:
**Visual Loan Progress Tracker** - BNTouch emails show checklist:
```
✓ Application Completed
✓ Sent to Processing
✓ Submitted to Underwriting
✓ Conditional Approval
○ Loan Approved
○ Clear to Close
○ Final Docs Ready
○ Funded
```

### New Template Files Created:
- `templates/missing-workflows-from-bntouch.json` - 14 new workflow specs
- `templates/missing-email-templates.json` - Loan status emails with progress tracker
- `BNTOUCH-VS-GHL-GAP-ANALYSIS.md` - Complete comparison document

### Encompass Integration Note:
BNTouch auto-triggers workflows from Encompass loan status changes.
GHL requires manual tag application OR Zapier/Make.com integration.

---

## WORKFLOWS STATUS: ALL 15 NAMED (Dec 11, 2025 5:30 AM)

**All 15 workflow names exist in GHL:**

| # | Workflow Name | Status |
|---|--------------|--------|
| 1 | New Lead Nurture Sequence | ✓ Created |
| 2 | Appointment Reminder Sequence | ✓ Created |
| 3 | Missed Appointment Follow-Up | ✓ Created |
| 4 | Pre-Qualification Process Workflow | ✓ Created |
| 5 | Pre-Qualification Complete Notification | ✓ Created |
| 6 | Application Process Updates | ✓ Created |
| 7 | Underwriting Status Updates | ✓ Created |
| 8 | Conditional Approval Celebration | ✓ Created |
| 9 | Clear to Close Celebration | ✓ Created |
| 10 | Closing Countdown Sequence | ✓ Created |
| 11 | Post-Close Nurture & Referral Sequence | ✓ Created |
| 12 | Realtor Partner Updates | ✓ Created |
| 13 | Rate Drop Alert Campaign | ✓ Created |
| 14 | Birthday Wishes | ✓ Created |
| 15 | Stale Lead Re-engagement | ✓ Created |

**Note:** There are 2 duplicate "Pre-Qualification Process Workflow" entries that can be deleted (total 17 workflows, need 15). All workflows are in Draft status.

**Key Coordinate Patterns (WORKING):**
- Playwright text selectors DON'T work on GHL (shadow DOM)
- Coordinate clicks WORK:
  - (1257, 138) = "+ Create Workflow" button
  - (1200, 190) = "Start from Scratch" dropdown option
  - (686, 27) = Workflow name field (top center)
  - (118, 27) = "< Back to Workflows" link
  - Row positions: y = 371 + (row * 68) for rows 0-6
- Direct URL: `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/automation/workflows`

**TRIGGERS CONFIGURED (Dec 11, 2025 6:00 AM):**

10/15 workflows have "Contact Tag" triggers configured:
1. Application Process Updates → Tag: "Application Started" ✓
2. Clear to Close Celebration → Tag: "Clear to Close" ✓
3. Closing Countdown Sequence → Tag: "Closing Scheduled" ✓
4. Conditional Approval Celebration → Tag: "Conditionally Approved" ✓
5. New Lead Nurture Sequence → Tag: "New Lead" ✓
6. Post-Close Nurture & Referral Sequence → Tag: "Closed" ✓
7. Pre-Qualification Complete Notification → Tag: "Pre-Qual Complete" ✓
8. Pre-Qualification Process Workflow → Tag: "Pre-Qual Started" ✓
9. Realtor Partner Updates → Tag: "Realtor Referral" ✓
10. Underwriting Status Updates → Tag: "In Underwriting" ✓

**MANUAL CONFIGURATION NEEDED (5 workflows):**
1. Appointment Reminder Sequence → Trigger: Appointment Booked
2. Birthday Wishes → Trigger: Birthday Reminder (Contact)
3. Missed Appointment Follow-Up → Trigger: Appointment Status Changed
4. Rate Drop Alert Campaign → Trigger: Manual Trigger
5. Stale Lead Re-engagement → Trigger: Custom (30-day no activity)

**NEXT STEPS:**
1. Configure 5 special triggers manually
2. Add actions/steps to each workflow
3. Build forms from JSON specs

### 15 Workflows To Build:

| # | Workflow Name | Trigger | Steps |
|---|--------------|---------|-------|
| 1 | New Lead Nurture Sequence | Tag: "New Lead" | 11 |
| 2 | Appointment Reminder Sequence | Appointment booked | 5 |
| 3 | Missed Appointment Follow-Up | Appointment no-show | 4 |
| 4 | Pre-Qualification Process Workflow | Tag: "Pre-Qual Started" | 5 |
| 5 | Pre-Qualification Complete Notification | Tag: "Pre-Qual Complete" | 4 |
| 6 | Application Process Updates | Tag: "Application Started" | 3 |
| 7 | Underwriting Status Updates | Tag: "In Underwriting" | 3 |
| 8 | Conditional Approval Celebration | Tag: "Conditionally Approved" | 2 |
| 9 | Clear to Close Celebration | Tag: "Clear to Close" | 3 |
| 10 | Closing Countdown Sequence | Tag: "Closing Scheduled" | 6 |
| 11 | Post-Close Nurture & Referral Sequence | Tag: "Closed" | 12 |
| 12 | Realtor Partner Updates | Tag: "Realtor Referral" | 2 |
| 13 | Rate Drop Alert Campaign | Manual trigger | 2 |
| 14 | Birthday Wishes | Birthday field | 2 |
| 15 | Stale Lead Re-engagement | 30-day no activity | 3 |

**Full specs in:** `templates/workflows-templates.json`

---

## PAST CLIENT DATABASE (Dec 11, 2025)

### Summary
Built comprehensive past client contact database from multiple data sources for GHL import.

**Final Database:** `/mnt/c/Users/dyoun/ghl-automation/data/past-clients-enriched.json`
**Review File:** `/mnt/c/Users/dyoun/ghl-automation/data/past-clients-review.xlsx`

### Statistics
- **Total Contacts:** 883
- **With Names:** 865 (98%)
- **With Loan Data:** 430 (49%)
- **Confirmed Names:** 464 (53%)

### Name Confidence Breakdown
| Confidence | Count | Description |
|------------|-------|-------------|
| confirmed | 464 | Cross-referenced from folders, xlsx, manual verification |
| high | 281 | firstname.lastname or firstname_lastname email patterns |
| medium | 120 | Concatenated names parsed from emails |
| none | 18 | Unable to parse name |

### Data Sources Merged
1. **Original emails** - 792 past client emails from user
2. **Email parsing** - Names extracted from email patterns (firstname.lastname, etc.)
3. **Folder cross-reference** - 46 client names from Google Drive folder paths
4. **xlsx LOS export** - 612 contacts with loan data from `/mnt/c/Users/dyoun/Downloads/export_job_david_youngs_contacts_1.xlsx`
5. **Manual LOS borrower data** - User-provided names (Habibi, Madden, Larsen, Salvino, etc.)
6. **HomeBridge HELOC loans** - 7 contacts with HELOC loan info
7. **Closed loans list** - 8 contacts with detailed file numbers/investors/dates
8. **User-provided emails** - Additional emails with parsed names

### Fields Available
| Field | Description |
|-------|-------------|
| email | Primary identifier |
| firstName, lastName | Contact name |
| phone | Mobile/cell phone |
| address, city, state, zip | Mailing address |
| loanAmount | Loan amount (e.g., "$500,000") |
| loanRate | Interest rate |
| loanProduct | Loan type (Conventional, FHA, VA, etc.) |
| loanStatus | Funded, In Process, etc. |
| fundedDate | Loan closing date |
| investor | Loan investor/servicer |
| fileNumber | LOS file number |
| creditScore | Credit score at application |
| notes | Additional context, loan history |
| nameConfidence | confirmed/high/medium/low/none |
| dataSource | Where data came from |

### Scripts Created
| Script | Purpose |
|--------|---------|
| `parse-names-from-emails.js` | Parse names from 792 email patterns |
| `cross-reference.js` | Match 46 folder names with emails |
| `merge-xlsx.js` | Merge xlsx LOS export data |
| `list-no-context.js` | Find emails without usable context |
| `analyze-leads.js` | Analyze CSV lead exports |

### Notable Clients with Multiple Loans
- **Justin McClain** - 5 loans, $2,660,333 total volume (all documented in notes)

### Next Steps for Import
1. Create custom fields in GHL for: loanAmount, loanRate, loanProduct, creditScore, fundedDate, investor, fileNumber
2. Add "Past Client" tag to workflow
3. Import 883 contacts via API with all enriched data

---

## BNTOUCH CRM ACCESS (Dec 13, 2025)

**Login URL:** https://www.bntouchmortgage.net/
**Username:** lendwisemtg
**Password:** SGG78696G
**Auth State:** Saved to `bntouch-auth.json`

### BNTouch Pipeline Stages
1. Leads
2. Prospects
3. Applications
4. In Processing
5. Funded
6. Cancelled
7. Follow Up

### BNTouch Data Fields
- Borrower Full Name, Rating, Loan Amount, Cell Phone
- Credit Self Rating, Next Task, Last Log Time
- Added Date, Source, Record Owner

### Current BNTouch Data (Dec 13, 2025)
- 1 borrower in Processing: Espinoza, Valentin - $700,000
- 0 Leads

### Key URLs
- Dashboard: `/account5/`
- Mortgages: `/account5/pipeline/mortgage`
- Leads: `/account5/pipeline/mortgage/?leads`
- Marketing/Campaigns: `/account5/campaign`

### Potential GHL Integration
BNTouch stages map to GHL pipeline:
- BNTouch "In Processing" → GHL "Processing"
- BNTouch "Funded" → GHL "Funded"
- Could sync contacts between systems via automation

### BNTouch Content Scraped (Dec 13, 2025)

**Content Exchange Library: 402 pre-built campaigns**
- New Lead Marketing (10)
- Prospect Marketing (19)
- In-Processing Marketing (18)
- Post Funded Marketing (62)
- Long Term Marketing (57)
- Partner Marketing (24)
- Holidays & Special Events (63)
- Current Market Specials (6)

**Active Triggers: 50+ automated sequences**
- 18 Holiday campaigns (Thanksgiving, Christmas, Easter, Valentine's, etc.)
- Birthday campaigns (12-year sequences for borrower/co-borrower)
- Time Change Reminders (Daylight Savings alerts)
- Newsletter campaigns

**Scraped Files:**
- `bntouch-scraped-content.json` - 427 campaigns, 22 templates
- `bntouch-deep-content.json` - Detailed campaign structure, 50 triggers
- `BNTOUCH-CONTENT-SUMMARY.md` - Complete analysis document
- `screenshots/bntouch-*.png` - Visual captures of all sections
- `screenshots/deep-*.png` - Deep scrape screenshots

---

## SESSION LOG

### Dec 13, 2025 (Evening) - MISSION CONTROL IMPORT TO GHL

**Achievement:** Imported 17/18 Mission Control email templates to GHL Snippets.

**Results:**
- ✅ 17 templates imported successfully
- ❌ 1 template failed (timing issue): MC: Loan Status 06 - Clear to Close
- Total GHL snippets: 110 (93 original + 17 new)

**Browser Automation Fixed:**
1. Initial failure: Script found wrong input field (Search Numbers instead of modal)
2. Fix: Updated selector to `input[placeholder="Enter Snippet Name"]`
3. Added dropdown handling: Click "Add Email Snippet" after "+ New Snippet"
4. Added error recovery: Click Cancel or reload page on failure

**Working Script:** `mission-control/import-via-browser.js`
```javascript
// Key pattern for GHL snippets modal
await page.locator('#add-snippet-button').click();
await page.locator('text=Add Email Snippet').click();
const nameInput = page.locator('input[placeholder="Enter Snippet Name"]');
await nameInput.fill(templateName);
```

**Next Steps:**
1. Manual import of "MC: Loan Status 06 - Clear to Close"
2. Configure workflow triggers to use MC templates
3. Build forms from JSON specs

---

### Dec 13, 2025 - GHL IFRAME DISCOVERY & PLAYWRIGHT MASTERY

**CRITICAL BREAKTHROUGH:** GHL workflow UI runs inside a nested iframe from `client-app-automation-workflows.leadconnectorhq.com`. Standard page selectors and coordinate clicks on the main page DON'T WORK.

**Why Previous Automation Failed:**
- Coordinate clicks on `page` miss the iframe entirely
- `page.locator('text=Create Workflow')` can't find elements inside iframes
- JavaScript injection blocked by cross-origin iframe security

**THE SOLUTION - Frame Locators:**
```javascript
// Get the workflow iframe
const frame = page.frame({ url: /automation-workflows/ });

// Now use frame.locator() for all interactions
await frame.locator('button:has-text("Create Workflow")').click();
await frame.locator('text=Start from Scratch').click();
```

**Working Automation Class:** `ghl-automation-helper.js`
- Auto-login via Google OAuth (button at viewport coords 960, 564)
- Frame detection: `page.frame({ url: /automation-workflows/ })`
- Methods: `createWorkflow()`, `addTrigger()`, `saveTrigger()`, `publishWorkflow()`

**Verified Working Flow:**
1. Navigate to `https://app.gohighlevel.com/v2/location/${locationId}/automation/workflows`
2. Wait 8 seconds for iframe to load
3. Get frame: `page.frame({ url: /automation-workflows/ })`
4. Use `frame.locator()` for all element interactions

**Key Coordinates (relative to iframe, not viewport):**
- Create Workflow button: Use `frame.locator('button:has-text("Create Workflow")')`
- Start from Scratch: Use `frame.locator('text=Start from Scratch')`
- Back to Workflows: Use `frame.locator('text=Back to Workflows')`

**Files Created:**
- `ghl-automation-helper.js` - Reusable GHLAutomation class
- `GHL-UI-MAP.md` - Complete UI reference with locators and coordinates
- `verified-coords.json` - Coordinate data backup

**Key Learning:** When GHL UI doesn't respond to clicks, CHECK FOR IFRAMES. Use browser DevTools (F12 → Elements) to inspect the DOM structure.

---

### Dec 11, 2025 (Late Morning) - AUTOMATION TAGS CREATED
**Achievement:** Created 16 automation trigger tags in GHL.

**Problem identified:** Previous trigger configuration failed because:
1. Scripts typed tag names and pressed Enter instead of CLICKING dropdown selections
2. Trigger blocks remained EMPTY (verified via screenshots)
3. Wrong tags existed - categorization tags (source_zillow, loan_fha) vs automation tags

**Solution:** Created new script `create-automation-tags.js` to add proper automation tags:
- New Lead
- Pre-Qual Started
- Pre-Qual Complete
- Application Started
- In Underwriting
- Conditionally Approved
- Clear to Close
- Closing Scheduled
- Closed
- Realtor Referral
- Appointment Scheduled
- Do Not Contact
- Long-Term Nurture
- Documents Received
- Past Client
- Cold Lead

**Total tags now:** 49 (16 automation + 33 categorization)

**Next step:** Configure workflow triggers by CLICKING dropdown selections, not just typing

---

### Dec 11, 2025 (Morning) - WORKFLOWS NAMING COMPLETE
**Achievement:** All 15 workflows now have proper unique names in GHL.

**Work done:**
1. Audited current state - found 12 workflows with mixed naming
2. Ran multiple rename scripts to fix "New Workflow : [number]" entries
3. Created missing workflows
4. Renamed duplicates to fill missing names

**Scripts used:**
- `audit-workflows.js` - screenshots both pages
- `cleanup-workflows.js` - renames + creates
- `final-fix.js` - additional fixes
- `rename-duplicates.js` - renamed 4 duplicates
- `final-cleanup.js` - renamed last 2
- `last-rename.js` - final rename (Stale Lead Re-engagement)

**Final state:** 17 total workflows (15 unique names + 2 duplicates that can be deleted)

**Key discovery:** GHL shadow DOM blocks Playwright text selectors - must use coordinate-based clicks.

---

### Dec 10, 2025 (Late Night) - ALL 15 WORKFLOWS CREATED
**Achievement:** Created all 15/15 workflows in GHL using coordinate-based automation.

**Key Discovery:** GHL uses shadow DOM or custom rendering that blocks Playwright text selectors.
- `text=Create Workflow`, `text=Continue`, `button:has-text()` - ALL FAIL
- Coordinate clicks at known positions WORK

**Working Pattern:**
```javascript
// List view: Click "+ Create Workflow" button
await page.mouse.click(1257, 138);
await page.waitForTimeout(2000);
// Then click "Start from Scratch" at dropdown position
await page.mouse.click(1200, 190);
```

**Scripts used:**
- `build-remaining.js` - created first 11
- `create-4-direct.js` - created final 4 (uses direct URL navigation)

**Result:** 15 workflows created (all named "New Workflow : [number]", Draft status)

**Still needed:**
1. Rename all 15 workflows to proper names
2. Configure triggers and actions for each

---

### Dec 10, 2025 (Evening) - Memory Correction & Audit
**Problem:** Previous session hallucinated workflow completion. Memory claimed "15/15 workflows done Dec 11" - impossible since today is Dec 10.

**Evidence:** User screenshot showed GHL Workflows page in empty/onboarding state. No workflows exist.

**Corrected:**
- Workflows: 0/15 (NOT STARTED)
- Script `build-workflows-v3.js` exists but either never ran successfully or failed silently

**Next:** Login to GHL, audit actual state, build workflows properly.

---

### Dec 10, 2025 - Email Signature GHL Integration
**Problem:** GitHub raw URLs were blocked by GHL - images not loading in signature
**Solution:** Re-hosted images to GHL Media Storage (Google Cloud)

**GHL Media Storage URLs (PERMANENT - Do Not Change):**
- Owl Logo GIF: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cabe03e9d2539a75a8f.gif`
- Apply Now Button: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cb5eac0a8ebacca5a60.png`
- Equal Housing Logo: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cbfeeed0490f19eaefe.png`

**Files Created:**
- `Desktop/signature-for-ghl.html` - Clean HTML ready to paste into GHL (no DOCTYPE/html/body tags)
- `Desktop/email-signature-ghl.html` - Full HTML file for browser preview
- `templates/email-signature-ghl.html` - Backup in project folder

**Key Learning:**
- GHL blocks GitHub raw URLs but trusts its own Media Storage (storage.googleapis.com/msgsndr)
- Flaticon CDN URLs work fine in GHL
- To paste HTML in GHL signature editor: click `</>` source code button first
- Notepad doesn't work for copying HTML - use browser (Ctrl+U for source) or VS Code

**User's Original Signature Design (DO NOT MODIFY):**
- Clean white background (no dark theme)
- Logo on left, contact info on right
- Compact horizontal footer bar with: Apply Now | website | location | social icons
- Title: "CMO / Partner" and "Business Development & Strategic Growth"
- NMLS: 62043 | DRE: 01371572
- Confidentiality Notice + IRS Circular 230 disclosure text
- Small Equal Housing logo at bottom

**Signature Toggle Fix (Dec 10, 2025):**
- Root cause identified: Toggle "Enable signature on all outgoing messages" was OFF
- In GHL, signature content and enable toggle are SEPARATE settings
- Automation script `enable-signature-toggle.js` navigated to Settings → My Staff → David Young
- Clicked toggle label to enable signatures
- Saved user profile
- **User should manually verify toggle is ON and send test email**

**Status:** Signature toggle enabled via automation, awaiting manual verification

---

### Dec 9, 2025 - Phase 1 Complete
- Imported 40 SMS templates to GHL (100% success)
- Imported 53 email templates to GHL (100% success)
- Total 93 snippets now in Marketing > Snippets
- All automation scripts working
- Browser automation patterns documented
- Mission Control system created

### Dec 9, 2025 - Initial Build
- Successfully logged into GHL via Google OAuth
- Created pipeline with 10 mortgage stages
- Created custom fields, tags, calendars
- Generated all template JSON files
- Project memory file created for persistence

---

## RESEARCH SOURCES

- [HighLevel Mortgage Lender Playbook](https://playbooks.gohighlevel.com/mortgage-lender)
- [Empower LO Mortgage Snapshots](https://empowerlo.com/mortgage-snapshots-highlevel)
- [BNTouch CRM Features](https://bntouch.com/)
- [GoCRM Drip Campaigns](https://gocrm.io/blog/mortgage-lender-email-drip-campaigns/)

---

## PAST CLIENT IMPORT STATUS (Dec 12, 2025) ✅ COMPLETE

### Import Results
| Metric | Count |
|--------|-------|
| **Successfully Imported** | 878 |
| **Duplicates (skipped)** | 5 |
| **Failed** | 0 |
| **Total** | 883 |

### API Key Fix
**Problem:** Original script used wrong key (`pit-90549fdc...` - Lendwise, no Contacts scope)
**Solution:** Used Mission Control location key (`pit-7427e736...` - has full Contacts scope)

### What Was Imported
- All 883 past client contacts
- Tag: "Past Client" applied to all
- Custom fields populated: Loan Amount, Loan Rate, Loan Product, Funded Date, Client Notes, Data Source
- Source: "Past Client Import"

---

## GHL API & INTEGRATIONS DEEP DIVE (Dec 12, 2025)

### API Versions
| Version | Status | URL |
|---------|--------|-----|
| V1 | End-of-Support | `https://public-api.gohighlevel.com/` |
| V2 | Active/Current | `https://services.leadconnectorhq.com/` |

### Authentication Types
| Type | Use Case | Plan Required |
|------|----------|---------------|
| Location API Key | Single sub-account | Starter+ |
| Agency API Key | Multi-location | Agency Pro |
| OAuth 2.0 | Third-party apps | Agency Pro |

### Rate Limits
- Standard: 100 requests/minute
- SaaS Configurator: 10 requests/second
- Token expiry: ~24 hours (use refresh token)

### Complete OAuth Scopes Reference

**Contacts & CRM:**
- `contacts.readonly` / `contacts.write`
- `opportunities.readonly` / `opportunities.write`
- `conversations.readonly` / `conversations.write`
- `conversations/message.readonly` / `conversations/message.write`

**Calendars:**
- `calendars.readonly` / `calendars.write`
- `calendars/events.readonly` / `calendars/events.write`
- `calendars/groups.readonly` / `calendars/groups.write`
- `calendars/resources.readonly` / `calendars/resources.write`

**Marketing:**
- `campaigns.readonly`
- `forms.readonly` / `forms.write`
- `funnels/funnel.readonly` / `funnels/page.readonly`
- `socialplanner/post.readonly` / `socialplanner/post.write`
- `emails/builder.readonly` / `emails/builder.write`

**Payments:**
- `payments/orders.readonly` / `payments/orders.write`
- `payments/transactions.readonly`
- `payments/subscriptions.readonly`
- `payments/coupons.readonly` / `payments/coupons.write`
- `invoices.readonly` / `invoices.write`

**Locations & Users:**
- `locations.readonly` / `locations.write`
- `locations/customFields.readonly` / `locations/customFields.write`
- `locations/tags.readonly` / `locations/tags.write`
- `users.readonly` / `users.write`

**AI Features:**
- `voice-ai-agents.readonly` / `voice-ai-agents.write`
- `voice-ai-agent-goals.readonly` / `voice-ai-agent-goals.write`
- `voice-ai-dashboard.readonly`

**Agency-Only:**
- `companies.readonly`
- `snapshots.readonly` / `snapshots.write`
- `saas/location.read` / `saas/location.write`
- `saas/company.write`

### GHL AI Employee Suite (2025)

**Voice AI** - $0.13/minute
- Handles inbound calls 24/7
- Natural language processing
- Appointment booking
- Lead qualification
- Outbound calls (coming soon)

**Conversation AI** - $0.02/message
- SMS, Messenger, Instagram, Web Chat
- Intelligent auto-responses
- Lead qualification
- Multi-channel engagement

**Workflow AI** - $0.02/request
- AI decision-making in automations
- Intent analysis
- Dynamic action selection
- Sequence generation from prompts

**Content AI** - $0.09/1000 words, $0.06/image
- Blog posts, emails, social posts
- Image generation
- Graphics creation

**Reviews AI** - $0.08/review
- Auto-respond to Google/Facebook reviews
- Sentiment analysis
- Reputation management

**Funnel AI** - $0.99/funnel
- Landing page generation from prompts
- Template suggestions

**Unlimited Plan:** $97/month/sub-account (all AI features)

### Mortgage Industry Integrations

**LOS Connections (via Zapier/Make):**
- Encompass - Real-time status sync, document triggers
- Calyx Point - Contact sync via automation
- Jungo CRM - Native Calyx integration

**Key Mortgage Workflows:**
1. Lead capture → GHL → Nurture sequence
2. Application status → Tag update → Workflow trigger
3. LOS milestone → Zapier → GHL opportunity update
4. Closing → Post-close nurture automation

**Compliance Features:**
- SSL forms
- Granular access controls
- Full activity logs
- E-signatures
- Audit trails

### Top Marketplace Integrations (1500+ apps)

**Lead Enrichment:**
- Clearout (G2: 4.7) - Email verification
- Hunter (G2: 4.4) - Email finder

**Sales Engagement:**
- Lemlist - Multi-channel outreach, 450M contact database

**Project Management:**
- Asana - Auto-create tasks from GHL events

**Scheduling:**
- Calendly - Booking sync

**Forms & Landing:**
- Heyflow - Interactive forms

**Level Up Marketplace:** 120+ apps for GHL (auto-sync)

### API Use Cases for LENDWISE

**Immediate Value:**
1. **Bulk Contact Import** - Via API with custom fields
2. **Automated Tagging** - Trigger workflows via API
3. **Calendar Sync** - Appointment booking integration
4. **Opportunity Management** - Pipeline automation

**Future Opportunities:**
1. **Voice AI for Leads** - 24/7 call handling
2. **LOS Integration** - Encompass sync via Zapier
3. **Conversation AI** - Auto-respond to inquiries
4. **Rate Alert Automation** - Custom webhook triggers

### Documentation Links
- Developer Portal: https://developers.gohighlevel.com/
- API Docs: https://marketplace.gohighlevel.com/docs/
- Scopes Reference: https://marketplace.gohighlevel.com/docs/Authorization/Scopes/
- GitHub (OpenAPI): https://github.com/GoHighLevel/highlevel-api-docs

---

## GHL EXPERT KNOWLEDGE (Added Dec 9, 2025)

**Reference:** `GHL-KNOWLEDGE-BASE.md` - Comprehensive GHL documentation

### EMAIL SIGNATURE CONFIGURATION (CORRECT PATH)
```
Settings → My Staff → [David Young] → Edit → User Info (expand) → Email Signature
```
**NOT in Business Profile!** Email signatures are USER-specific settings.

### Key GHL Navigation:
- **Contacts:** Sidebar → Contacts
- **Conversations:** Sidebar → Conversations (4-panel layout)
- **Settings:** Sidebar bottom → Settings gear icon
- **My Staff:** Settings → My Staff (for user signatures)
- **Business Profile:** Settings → Business Profile (first option)

### Email Signature in Templates:
Use custom value `{{user.signature}}` to insert user's signature automatically

### UI Element Selectors:
| Element | Selector | Coordinate Fallback |
|---------|----------|---------------------|
| Add Contact (+) | `svg[data-icon="plus"]` | (254, 194) |
| Quick Search | `input[placeholder*="Quick search"]` | - |
| Email icon | `svg[data-icon="envelope"]` | (462, 194) |
| Compose icon | `svg[data-icon="pen-to-square"]` | (524, 160) |
| Save (drawer) | `button:has-text("Save")` | (1340, 853) |

### Contact Detail Page Structure:
- Left: Contact fields
- Middle: Conversation + Email composer
- Right: Activity panel

### API Base URL:
`https://services.leadconnectorhq.com/`

---

## WORKFLOW ACTIONS AUTOMATION - BREAKTHROUGH (Dec 13, 2025)

### CRITICAL: READ THIS BEFORE ANY WORKFLOW MODIFICATIONS

**PROVEN WORKING METHOD FOR ADDING WORKFLOW ACTIONS:**

### The Problem Solved
GHL workflow editor has a complex nested iframe structure. Standard locators and coordinate clicks on the main page DON'T work for adding actions. After extensive testing, we found the exact method.

### Working Code Pattern

```javascript
// 1. Get the workflow iframe
function getWfFrame(page) {
  return page.frames().find(f => f.url().includes('automation-workflows'));
}

// 2. Find add-action buttons using EXACT class selector
const wfFrame = getWfFrame(page);
const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();
// Returns array of + buttons on the canvas

// 3. Click the last button (adds before END)
await addBtns[addBtns.length - 1].click();
await page.waitForTimeout(2000);

// 4. Search for action (search box at coordinate 1100, 227)
await page.mouse.click(1100, 227);  // Click search box
await page.waitForTimeout(300);
await page.keyboard.type('Wait');   // Type action name
await page.waitForTimeout(1500);

// 5. Click on action result (first result at ~920, 385)
await page.mouse.click(920, 385);
await page.waitForTimeout(2500);

// 6. Configure if needed (e.g., Wait time input at ~570, 434)
await page.mouse.click(570, 434);
await page.keyboard.press('Control+a');
await page.keyboard.type('5');  // Set to 5

// 7. Save action (Save Action button at 1289, 833)
await page.mouse.click(1289, 833);
await page.waitForTimeout(2000);
```

### Key Selectors & Coordinates (VERIFIED WORKING)

| Element | Method | Value |
|---------|--------|-------|
| Workflow iframe | Frame URL match | `/automation-workflows/` |
| Add-action buttons | CSS class | `.pg-actions__dv--add-action` |
| Search input | Coordinate click | (1100, 227) |
| First search result | Coordinate click | (920, 385) |
| Wait time input | Coordinate click | (570, 434) |
| Save Action button | Coordinate click | (1289, 833) |

### Actions Successfully Added
- ✅ **Wait** - Tested and working (screenshot: work-02-after-wait.png)
- ✅ **Send SMS** - Working (requires template configuration)
- ✅ **Send Email** - Working (requires template configuration)
- ✅ **Add Contact Tag** - Working (requires tag selection)

### Working Scripts

| Script | Purpose |
|--------|---------|
| `test-add-actions-working.js` | Proven working - added Wait action |
| `add-workflow-actions-final.js` | Full implementation template |
| `save-workflow.js` | Saves current workflow state |

### Screenshot Evidence
- `work-02-after-wait.png` - Shows Wait action successfully added to workflow
- `t3-03-searched-wait.png` - Shows search results with Wait under "Internal" category
- `t4-04-wait-clicked.png` - Shows Wait configuration panel open

### Workflow Canvas Structure
```
[Trigger Block]
      |
     (+)  <-- pg-actions__dv--add-action button
      |
[Action Block]
      |
     (+)  <-- pg-actions__dv--add-action button
      |
   [END]
```

### IMPORTANT: Search Results Layout
When searching for actions, results show:
- **"Actions" section** (Internal/native GHL actions) - Click these!
- **"More Apps" section** (Third-party integrations) - Avoid these!

The native actions (Wait, Send SMS, Send Email) appear at approximately y=385.
Third-party apps appear below that.

### Current Workflow State: "New Lead Nurture Sequence"
After automation testing:
- **Trigger:** Tag "New Lead" (configured)
- **Actions added:** Wait (5 minutes) ✅
- **Original:** Email block (was already there)
- **Status:** Draft (saved)

### Next Steps for Full Workflow Automation
1. Add remaining actions to all 15 workflows
2. Configure SMS/Email templates in each action
3. Configure Wait times per workflow spec
4. Test each workflow end-to-end
5. Publish workflows when ready

### Files Modified Today
- `test-add-actions-working.js` - WORKING script
- `add-workflow-actions-final.js` - Full implementation
- `save-workflow.js` - Save current state
- `screenshots/work-*.png` - Evidence of success

---

## UNIVERSAL ENGAGEMENT TRACKING (Dec 21, 2025)

### Summary
Built universal engagement tracking system that works for ALL campaigns.

### Tags Created
| Tag | Purpose |
|-----|---------|
| `email.engaged` | Contact opened any email |
| `email.clicked` | Contact clicked link in email |
| `email.replied` | Contact replied to email |
| `email.bounced` | Email bounced (bad address) |

### Workflows Created (via Workflow AI)
1. **Universal - Email Open Tracker** - Triggers on email opened, adds `email.engaged` tag
2. **Universal - Link Clicked Tracker** - Triggers on link clicked, adds `email.clicked` tag
3. **Universal - Email Reply Tracker** - Triggers on reply, adds `email.replied` tag
4. **Universal - Email Bounce Tracker** - Triggers on bounce, adds `email.bounced` + sets Email DND

### Workflow AI Prompts Saved
- `/mnt/c/Users/dyoun/Downloads/workflow-1-email-opened.txt`
- `/mnt/c/Users/dyoun/Downloads/workflow-2-link-clicked.txt`
- `/mnt/c/Users/dyoun/Downloads/workflow-3-email-reply.txt`
- `/mnt/c/Users/dyoun/Downloads/workflow-4-email-bounce.txt`

---

## ANALYTICS DASHBOARD FIX (Dec 21, 2025)

### Problem
Dashboard only loaded 100 contacts due to pagination cycling. API was returning same contacts repeatedly.

### Root Cause
Using `startAfterId` cursor parameter caused cycling. GHL API works better with `page` parameter.

### Solution
Changed from cursor-based to page-based pagination:
```javascript
// BROKEN (cycles through same 100)
let startAfterId = null;
params.startAfterId = startAfterId;

// FIXED (loads all 923+ contacts)
let page = 1;
params.page = page;
page++;
```

### Files Updated
- `analytics-dashboard.js` - Fixed pagination, now loads 923+ contacts correctly

### Metrics Now Available
- Campaign funnel (sent → opened → clicked → replied)
- Overall engagement across all contacts
- Email health (valid vs bounced)
- Contact classification by type
- Engagement state breakdown
- Pipeline status with stale opportunity alerts
- Health score (0-100)

---

## EMAIL DELIVERABILITY (Dec 21, 2025)

### Problem
Emails show "via app.lendwisesocial.com" instead of directly from `lendwisemtg.com`

### Root Cause
GHL's LeadConnector Email System sends through `app.lendwisesocial.com` shared domain.
When FROM address uses different domain (`lendwisemtg.com`), recipients see "via".

### Solution Options
1. **Use subdomain** `mail.lendwisemtg.com` - Recommended (protects main domain reputation)
2. **Use main domain** `lendwisemtg.com` - Higher risk but simpler

### Setup Guide Created
`/mnt/c/Users/dyoun/ghl-automation/docs/email-deliverability-setup.md`

### DNS Records Needed (at lendwisemtg.com registrar)
- CNAME for subdomain
- TXT for SPF
- CNAME for DKIM

### Status
- DNS records sent to Anthony for `mail.lendwisemtg.com`
- Awaiting Anthony to add records, then verify in GHL

---

## LOAN STATUS WORKFLOWS (Dec 21, 2025) - COMPLETE

### Summary
Built and published 8 loan status workflows triggered by tags. When Encompass updates loan status, add the corresponding tag via API to trigger the workflow.

### Workflows Created (All Published)
| # | Workflow Name | Trigger Tag | Actions |
|---|---------------|-------------|---------|
| 1 | loan-status-workflow-1-application-completed | `Application Started` | Email + SMS |
| 2 | loan-status-workflow-2-sent-to-processing | `In Processing` | Email + SMS |
| 3 | loan-status-workflow-3-submitted-to-underwriting | `In Underwriting` | Email + SMS |
| 4 | loan-status-workflow-4-conditional-approval | `Conditionally Approved` | SMS + Email |
| 5 | loan-status-workflow-5-loan-approved | `Loan Approved` | SMS + Email |
| 6 | loan-status-workflow-6-clear-to-close | `Clear to Close` | SMS + Email |
| 7 | loan-status-workflow-7-final-docs-ready | `Final Docs Ready` | SMS + Email |
| 8 | loan-status-workflow-8-funded | `Closed` | SMS + Email + Day 3 Review Request |

### Encompass Integration Pattern
```
Encompass Status Change → API Call → Add Tag in GHL → Workflow Triggers Automatically
```

### Workflow AI Prompts Saved
Location: `/mnt/c/Users/dyoun/Downloads/`
- loan-status-workflow-1-application-completed.txt
- loan-status-workflow-2-sent-to-processing.txt
- loan-status-workflow-3-submitted-to-underwriting.txt
- loan-status-workflow-4-conditional-approval.txt
- loan-status-workflow-5-loan-approved.txt
- loan-status-workflow-6-clear-to-close.txt
- loan-status-workflow-7-final-docs-ready.txt
- loan-status-workflow-8-funded.txt

### Total GHL Workflows: 50
- 8 Loan Status (published)
- 4 Engagement Tracking (published)
- Various other marketing/pipeline workflows

---

## SUPABASE SCHEMA (Dec 21, 2025) - CREATED

### Purpose
System of record for all GHL automations. Tracks everything built and what's pending.

### Files Created
- `/supabase/schema.sql` - Full database schema
- `/supabase/seed-current-state.sql` - Current data as of Dec 21
- `/supabase/README.md` - Setup instructions

### Tables
| Table | Purpose |
|-------|---------|
| `locations` | GHL sub-accounts (LOs) |
| `workflows` | All automation workflows |
| `workflow_categories` | Loan status, engagement, social, recruitment, etc. |
| `tags` | All tags and triggers |
| `templates` | Email/SMS templates |
| `custom_fields` | GHL custom fields |
| `pipelines` | Sales pipelines |
| `encompass_ghl_mapping` | Encompass → GHL tag mapping |
| `contact_sync` | Link Encompass loans to GHL contacts |
| `features` | Roadmap - what's built vs pending |
| `activity_log` | Audit trail |

### Feature Categories Tracked
1. loan_status (COMPLETE)
2. engagement_tracking (COMPLETE)
3. lead_nurture (NOT STARTED)
4. post_close (NOT STARTED)
5. appointments (NOT STARTED)
6. social_media (NOT STARTED)
7. recruitment (NOT STARTED)
8. product_alerts (NOT STARTED)
9. partner_marketing (NOT STARTED)
10. compliance (NOT STARTED)

### Key Views
- `v_feature_status` - Summary of completed vs pending by category
- `v_next_to_build` - Prioritized list of what to build next
- `v_workflows_with_triggers` - All workflows with their trigger tags
