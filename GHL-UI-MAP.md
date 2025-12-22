# GHL UI Map - Verified Coordinates & Methods

**Last Updated:** December 13, 2025
**Source:** Automated verification + frame locator discovery

---

## CRITICAL: GHL Uses Nested Iframes

GHL's workflow UI is inside an iframe from `client-app-automation-workflows.leadconnectorhq.com`.

**Must use Playwright frame locator:**
```javascript
const frame = page.frame({ url: /automation-workflows/ });
await frame.locator('button:has-text("Create Workflow")').click();
```

---

## LOGIN PAGE (VERIFIED)

| Element | Method | Notes |
|---------|--------|-------|
| Google Sign In | Click (960, 564) | Inside Google iframe |
| Email input | `locator('input[type="email"]')` | On Google popup |
| Password input | `locator('input[type="password"]')` | On Google popup |
| Next button | `locator('#identifierNext button')` | On Google popup |

---

## SIDEBAR NAVIGATION (Frame Locator)

| Element | Coordinates | Locator |
|---------|-------------|---------|
| Launchpad | (112, 200) | `text=Launchpad` |
| Dashboard | (112, 236) | `text=Dashboard` |
| Conversations | (112, 272) | `text=Conversations` |
| Calendars | (112, 308) | `text=Calendars` |
| Contacts | (112, 344) | `text=Contacts` |
| Opportunities | (112, 380) | `text=Opportunities` |
| Payments | (112, 416) | `text=Payments` |
| AI Agents | (112, 485) | `text=AI Agents` |
| Marketing | (112, 521) | `text=Marketing` |
| **Automation** | **(112, 557)** | `text=Automation` |
| Sites | (112, 593) | `text=Sites` |
| Settings | (112, 1048) | `text=Settings` |

---

## WORKFLOW LIST PAGE (Inside Frame)

| Element | Method | Notes |
|---------|--------|-------|
| Create Workflow | `frame.locator('button:has-text("Create Workflow")')` | Opens dropdown |
| Create Folder | `frame.locator('text=Create Folder')` | |
| Start from Scratch | `frame.locator('text=Start from Scratch')` | In dropdown |
| Select from Template | `frame.locator('text=Select from Template')` | In dropdown |

**Dropdown appears at approximately (1766, 189) after clicking Create Workflow**

---

## WORKFLOW EDITOR (Inside Frame)

### Top Bar
| Element | Estimated Position | Locator |
|---------|-------------------|---------|
| Back to Workflows | (88, 21) | `text=Back to Workflows` |
| Workflow Name | (726, 21) | Click to edit |
| Saved indicator | (1399, 21) | |

### Tab Navigation
| Element | Estimated Position | Locator |
|---------|-------------------|---------|
| Builder | (579, 59) | `text=Builder` |
| Settings | (645, 59) | `text=Settings` |
| Enrollment History | (740, 59) | `text=Enrollment History` |
| Execution Logs | (853, 59) | `text=Execution Logs` |

### Actions
| Element | Locator |
|---------|---------|
| Test Workflow | `text=Test Workflow` |
| Draft/Publish Toggle | `text=Draft` / `text=Publish` |
| Save Trigger | `button:has-text("Save Trigger")` |

### Canvas Elements (VERIFIED Dec 13, 2025)
| Element | Locator | Notes |
|---------|---------|-------|
| Add New Trigger | `text=Add New Trigger` | Blue dashed box |
| + (Add Action) | Small + button between trigger and END | |
| END node | `text=END` | Bottom of workflow |

### Trigger Configuration Panel
| Element | Locator | Notes |
|---------|---------|-------|
| Search triggers | `input[placeholder*="Search"]` | |
| Contact Tag | `text=Contact Tag` | In Contact category |
| Birthday Reminder | `text=Birthday Reminder` | In Contact category |
| Add filters | `text=Add filters` | To configure specific tag |
| Save Trigger | `button:has-text("Save Trigger")` | Bottom right |
| Cancel | `button:has-text("Cancel")` | |

### Workflow Header (VERIFIED)
| Element | Position | Locator |
|---------|----------|---------|
| Back to Workflows | (112, 28) | `text=Back to Workflows` |
| Saved indicator | (1751, 28) | `text=Saved` |
| Test Workflow | (1751, 80) | `text=Test Workflow` |
| Draft toggle | (1823, 80) | `text=Draft` |
| Publish | (1863, 80) | `text=Publish` |

---

## IFRAME DETAILS

| Property | Value |
|----------|-------|
| Iframe Name | `workflow-builder` |
| Iframe URL Pattern | `/automation-workflows/` |
| Iframe Position | x=224, y=90 |
| Iframe Size | 1696 x 988 |

---

## RECOMMENDED APPROACH

```javascript
const { chromium } = require('playwright');

async function automateGHL() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'ghl-auth.json'  // Reuse saved auth
  });
  const page = await context.newPage();

  // Navigate to workflows
  await page.goto('https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/automation/workflows');
  await new Promise(r => setTimeout(r, 8000));

  // Get the workflow iframe
  const frame = page.frame({ url: /automation-workflows/ });

  // Use frame locators for reliable clicking
  await frame.locator('button:has-text("Create Workflow")').click();
  await new Promise(r => setTimeout(r, 1500));
  await frame.locator('text=Start from Scratch').click();

  // Save auth for next run
  await context.storageState({ path: 'ghl-auth.json' });
  await browser.close();
}
```

---

## LOCATION INFO

| Field | Value |
|-------|-------|
| Location ID | peE6XmGYBb1xV0iNbh6C |
| Direct Workflows URL | https://app.gohighlevel.com/v2/location/peE6XmGYBb1xV0iNbh6C/automation/workflows |
