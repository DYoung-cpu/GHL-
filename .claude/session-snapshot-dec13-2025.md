# SESSION SNAPSHOT - December 13, 2025

## ⚠️ CRITICAL: READ THIS FIRST AFTER EVERY COMPACTION

This file contains essential context that MUST be read before any work on this project.

---

## GHL ACCOUNT ARCHITECTURE (CRITICAL UNDERSTANDING)

### The Structure
```
AGENCY ACCOUNT (Parent)
├── LENDWISE MORTGA (Sub-account) - Location ID: e6yMsslzphNw8bgqRgtV
└── Mission Control - David Young (Sub-account) - Location ID: peE6XmGYBb1xV0iNbh6C  ← TARGET
```

### Two Different Locations - DO NOT CONFUSE

| Account | Location ID | API Key | Purpose |
|---------|-------------|---------|---------|
| LENDWISE MORTGA | `e6yMsslzphNw8bgqRgtV` | `pit-90549fdc-375a-45f3-989e-15d48856233c` | Agency sub-account (WRONG TARGET) |
| **Mission Control - David Young** | `peE6XmGYBb1xV0iNbh6C` | `pit-7427e736-d68a-41d8-9e9b-4b824b996926` | **CORRECT TARGET for all builds** |

### How GHL Agency/Sub-Account Works
1. **Agency** = parent container that owns multiple sub-accounts
2. **Sub-accounts** = independent locations with their own:
   - Contacts
   - Workflows
   - Templates/Snippets
   - Pipelines
   - Settings
3. **Snapshots** = GHL's native way to copy content between sub-accounts
4. When logging in as agency owner, you see "Click here to switch" to select sub-accounts

---

## THE MISTAKE MADE (Dec 13, 2025)

### What Happened
All automation scripts were hardcoded with the WRONG location ID:
- Scripts used: `e6yMsslzphNw8bgqRgtV` (LENDWISE MORTGA)
- Should have used: `peE6XmGYBb1xV0iNbh6C` (Mission Control - David Young)

### What Was Built in WRONG Location (LENDWISE MORTGA)
1. **93 original Snippets** (40 SMS + 53 Email)
2. **17 Mission Control email templates** (MC: Loan Status, Purchase, Refinance series)
3. **15 Workflows** (named, with triggers configured)
4. **1 Wait action** added to "New Lead Nurture Sequence" workflow
5. **Tags** - 49 total (16 automation + 33 categorization)
6. **Pipeline** - "Mortgage Sales Pipeline" with 10 stages
7. **Custom Fields** - 15 mortgage-specific fields
8. **Calendars** - 4 calendar types

### The Fix: Use GHL Snapshots
Instead of re-running all scripts, use GHL's native Snapshot feature:

1. **Create Snapshot in LENDWISE MORTGA:**
   - Settings → Company → Snapshots
   - Create new snapshot with:
     - ✅ Email Templates/Snippets
     - ✅ Workflows
     - ✅ Tags
     - ✅ Custom Fields
     - ✅ Pipelines
     - ❌ Contacts (don't transfer)
   - Name: "Mission Control Full Build"

2. **Deploy to Mission Control - David Young:**
   - Select the snapshot
   - Click Deploy/Push to Sub-Account
   - Choose "Mission Control - David Young"
   - Select merge mode (add new items)

3. **Verify in Mission Control:**
   - Switch to Mission Control account
   - Check Snippets, Workflows, Tags exist

---

## GHL WORKFLOW AUTOMATION - PROVEN WORKING METHOD

### The Challenge
GHL workflow editor runs inside a nested iframe. Standard Playwright locators don't work on the main page.

### Working Solution

```javascript
// 1. Get the workflow iframe (CRITICAL)
function getWfFrame(page) {
  return page.frames().find(f => f.url().includes('automation-workflows'));
}

// 2. Find add-action buttons using EXACT class selector
const wfFrame = getWfFrame(page);
const addBtns = await wfFrame.locator('.pg-actions__dv--add-action').all();

// 3. Click the last + button (adds before END)
await addBtns[addBtns.length - 1].click();
await page.waitForTimeout(2000);

// 4. Search for action (search box at coordinate 1100, 227)
await page.mouse.click(1100, 227);
await page.waitForTimeout(300);
await page.keyboard.type('Wait');  // or 'Send SMS', 'Send Email', etc.
await page.waitForTimeout(1500);

// 5. Click on action result (Internal category at ~920, 385)
await page.mouse.click(920, 385);
await page.waitForTimeout(2500);

// 6. Configure (e.g., Wait time input at ~570, 434)
await page.mouse.click(570, 434);
await page.keyboard.press('Control+a');
await page.keyboard.type('5');

// 7. Save action (button at 1289, 833)
await page.mouse.click(1289, 833);
await page.waitForTimeout(2000);
```

### Key Coordinates (Viewport 1400x900)

| Element | Coordinates | Method |
|---------|-------------|--------|
| Search input (Actions panel) | (1100, 227) | Mouse click |
| First search result (Internal) | (920, 385) | Mouse click |
| Wait time input | (570, 434) | Mouse click |
| Save Action button | (1289, 833) | Mouse click |
| Add-action buttons | N/A | `.pg-actions__dv--add-action` class selector |

### Search Results Structure
When searching for actions:
- **"Actions" section** (y ≈ 385) = Native GHL actions - USE THESE
- **"More Apps" section** (y > 450) = Third-party integrations - AVOID

### Verified Working Actions
- ✅ Wait (tested, screenshot proof: work-02-after-wait.png)
- ✅ Send SMS (needs template config)
- ✅ Send Email (needs template config)
- ✅ Add Contact Tag (needs tag selection)

---

## LOGIN PATTERN (ALWAYS WORKS)

```javascript
// Google OAuth via One-Tap iframe
const googleIframe = await page.$('#g_id_signin iframe');
if (googleIframe) {
  const frame = await googleIframe.contentFrame();
  if (frame) await frame.click('div[role="button"]');
}
await page.waitForTimeout(3000);

// Handle Google popup
const googlePage = context.pages().find(p => p.url().includes('accounts.google.com'));
if (googlePage) {
  await googlePage.waitForLoadState('domcontentloaded');
  await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
  await googlePage.keyboard.press('Enter');
  await googlePage.waitForTimeout(3000);
  await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 10000 });
  await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
  await googlePage.keyboard.press('Enter');
  await page.waitForTimeout(8000);
}

// IMPORTANT: Switch to correct sub-account
const switcher = page.locator('text=Click here to switch');
if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
  await switcher.click();
  await page.waitForTimeout(2000);
  // For Mission Control:
  await page.locator('text=Mission Control').first().click();
  // OR for LENDWISE:
  // await page.locator('text=LENDWISE MORTGA').click();
  await page.waitForTimeout(3000);
}
```

---

## WORKING SCRIPTS INVENTORY

| Script | Purpose | Location ID Used | Status |
|--------|---------|------------------|--------|
| `test-add-actions-working.js` | Add workflow actions | e6yMsslzphNw8bgqRgtV | ✅ Working |
| `mission-control/import-via-browser.js` | Import MC templates | **UPDATED to peE6XmGYBb1xV0iNbh6C** | Ready |
| `save-workflow.js` | Save workflow state | e6yMsslzphNw8bgqRgtV | Working |
| `add-workflow-actions-final.js` | Full workflow builder | e6yMsslzphNw8bgqRgtV | Needs update |

---

## WHAT'S LEFT TO DO

### Immediate (Before More Building)
1. **Transfer content via Snapshot** from LENDWISE to Mission Control
2. **Update ALL scripts** to use `peE6XmGYBb1xV0iNbh6C`
3. **Verify** content exists in Mission Control after transfer

### Then Continue With
1. Add remaining actions to all 15 workflows (in Mission Control)
2. Configure 5 special triggers (Appointment, Birthday, etc.)
3. Import missing template (Loan Status 06 - Clear to Close)
4. Build 5 forms
5. End-to-end testing

---

## CLIENT INFO (Quick Reference)

- **Client:** David Young
- **Company:** LENDWISE MORTGAGE
- **Email:** david@lendwisemtg.com
- **Password:** Fafa2185!
- **Target Account:** Mission Control - David Young
- **Target Location ID:** `peE6XmGYBb1xV0iNbh6C`

---

## FILES TO READ AT SESSION START

1. `.claude/project-memory.md` - Full project history
2. `.claude/session-snapshot-dec13-2025.md` - THIS FILE (critical fixes)
3. `CLAUDE.md` - Project instructions
4. `templates/workflows-templates.json` - Workflow specifications

---

## RULES (NEVER VIOLATE)

1. **ALWAYS check which location ID** before running any script
2. **Mission Control - David Young** (`peE6XmGYBb1xV0iNbh6C`) is the target
3. **Use Snapshots** to transfer between sub-accounts - it's GHL's native method
4. **Read this file** after every compaction before doing any work
5. **Save important discoveries** to project-memory.md immediately
