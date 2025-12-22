# GHL Automation - David Young

## FIRST ACTION ON EVERY SESSION

1. **Read startup summary**: `.claude/startup-summary.json` (auto-generated on `ghl` startup)
2. **Check Supabase** for current feature status if summary is stale

The startup script queries Supabase and writes a fresh summary with:
- Features: COMPLETED vs IN PROGRESS vs NOT STARTED
- Workflow count and status
- Encompass mappings
- Client/API details

---

## PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Project** | Go High Level CRM Automation |
| **Client** | David Young |
| **Company** | LENDWISE MORTGAGE |
| **Platform** | Go High Level (GHL) |
| **Location ID** | peE6XmGYBb1xV0iNbh6C |
| **Supabase** | https://izcbxqaemlaabpmnqsmm.supabase.co |

---

## RULES - NEVER VIOLATE

1. **IF YOU CAN DO IT, DO IT** - Never ask user to do automatable tasks
2. **SUPABASE IS SOURCE OF TRUTH** - Query current state before making changes
3. **UPDATE SUPABASE AFTER** - Mark features complete when done
4. **WORKFLOWS USE TAGS** - All GHL workflows trigger via tag_added from Encompass
5. **NO HALLUCINATING** - If unsure, check the database or ask
6. **NO STALE CONTENT** - Clean up old files when things change
7. **SAVE BEFORE ENDING** - Run `node scripts/save-session.js "description"` before long sessions end

---

## SYSTEM ARCHITECTURE

### Trigger Pattern (Encompass → GHL)
```
Encompass Milestone Change
    ↓
API Call adds TAG to GHL Contact
    ↓
GHL Workflow triggers on tag_added
    ↓
Email + SMS sent to borrower
```

### Loan Status Workflows (8 published)
| Encompass Event | GHL Tag | Workflow |
|-----------------|---------|----------|
| Application Received | Application Started | loan-status-workflow-1-application-completed |
| Sent to Processing | In Processing | loan-status-workflow-2-sent-to-processing |
| Submitted to UW | In Underwriting | loan-status-workflow-3-submitted-to-underwriting |
| Conditional Approval | Conditionally Approved | loan-status-workflow-4-conditional-approval |
| Loan Approved | Loan Approved | loan-status-workflow-5-loan-approved |
| Clear to Close | Clear to Close | loan-status-workflow-6-clear-to-close |
| Docs Out | Final Docs Ready | loan-status-workflow-7-final-docs-ready |
| Funded | Closed | loan-status-workflow-8-funded |

### Engagement Tracking Workflows (4 published)
| Email Event | Tag Added | Workflow |
|-------------|-----------|----------|
| Opened | email.engaged | workflow-1-email-opened |
| Clicked | email.clicked | workflow-2-link-clicked |
| Replied | email.replied | workflow-3-email-reply |
| Bounced | email.bounced | workflow-4-email-bounce |

---

## SUPABASE DATABASE

### Tables
| Table | Purpose |
|-------|---------|
| `features` | Roadmap - what's built vs pending |
| `workflows` | All GHL workflows with triggers |
| `tags` | All tags and what they trigger |
| `encompass_ghl_mapping` | Loan status → tag mapping |
| `activity_log` | Audit trail of changes |
| `locations` | LO sub-accounts |
| `contact_sync` | Encompass loan ↔ GHL contact |

### Key Queries
```javascript
const SUPABASE_URL = 'https://izcbxqaemlaabpmnqsmm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PzYJhp2dizwuu6pShEhJng_z6FsVdeJ';

// Check what's not built yet
GET /rest/v1/features?status=eq.not_started

// Mark feature complete
PATCH /rest/v1/features?name=eq.Feature%20Name
Body: { "status": "completed" }

// Get all workflows
GET /rest/v1/workflows?select=name,status,trigger_value
```

---

## API KEYS (in .env)

```
GHL_API_KEY=pit-7427e736-d68a-41d8-9e9b-4b824b996926
GHL_LOCATION_ID=peE6XmGYBb1xV0iNbh6C
SUPABASE_URL=https://izcbxqaemlaabpmnqsmm.supabase.co
SUPABASE_ANON_KEY=sb_publishable_PzYJhp2dizwuu6pShEhJng_z6FsVdeJ
```

---

## KEY FILES

| File | Purpose |
|------|---------|
| `.claude/startup-summary.json` | Fresh state on each startup |
| `.claude/project-memory.md` | Detailed project history |
| `.claude/snapshots/` | Session snapshots (auto-created) |
| `ghl-config.json` | GHL field/tag/pipeline IDs |
| `analytics-dashboard.js` | Reporting script |
| `scripts/startup-check.js` | Startup health checks |
| `scripts/save-session.js` | Save snapshot before session ends |
| `supabase/schema.sql` | Database structure |

---

## FEATURE STATUS (check Supabase for live data)

### COMPLETED
- Loan Status Workflows (8)
- Engagement Tracking (4)
- Analytics Dashboard
- Email Templates Import (110 snippets)
- Past Client Import (878 contacts)
- Marketing Template: Application Received - David Young (Dec 22, 2025)

### IN PROGRESS
- Email Deliverability (mail.lendwisemtg.com - waiting on Anthony for DNS)

### NOT STARTED
- Encompass API Integration
- Social Media Automation
- LO Recruitment Campaigns
- Product Alerts (Rate drops, HELOC)
- Partner/Realtor Marketing
- Appointment Reminders
- Birthday/Anniversary Automation

---

## GHL BROWSER AUTOMATION (if needed)

GHL uses nested iframes. Must use frame locators:

```javascript
// Get workflow iframe
const frame = page.frame({ url: /automation-workflows/ });

// Use frame.locator() for all interactions
await frame.locator('button:has-text("Create Workflow")').click();
```

Key coordinates and patterns documented in: `GHL-UI-MAP.md`

---

## CLIENT CONTACT

- **Name:** David Young
- **Email:** david@lendwisemtg.com
- **Phone:** 310-954-7772
- **IT Contact:** Anthony (handles DNS)
