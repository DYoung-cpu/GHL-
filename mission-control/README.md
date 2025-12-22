# LENDWISE Mission Control
## Complete Mortgage Loan Status Automation System

---

## Quick Start

```bash
# Install dependencies (if not already)
npm install

# Import templates to GHL
node mission-control/import-to-ghl.js
```

---

## What's Included

### Template Summary

| Category | Count | Description |
|----------|-------|-------------|
| Loan Status Emails | 8 | Full loan journey updates with progress tracker |
| Purchase Nurture | 5 | Home buyer lead follow-up sequence |
| Refinance Nurture | 5 | Refinance lead follow-up sequence |
| LO Self-Alerts | 6 | Internal pipeline monitoring |
| SMS Templates | 30+ | All workflow text messages |
| **Total Templates** | **54+** | Complete automation system |

---

### Loan Status Email Templates (8)

| # | File | Description | Progress |
|---|------|-------------|----------|
| 01 | `01-application-completed.html` | Application submitted confirmation | 12% |
| 02 | `02-sent-to-processing.html` | Loan sent to processor | 25% |
| 03 | `03-submitted-to-underwriting.html` | Submitted to UW | 37% |
| 04 | `04-conditional-approval.html` | Conditional approval celebration | 50% |
| 05 | `05-loan-approved.html` | **FULL APPROVAL** celebration | 62% |
| 06 | `06-clear-to-close.html` | CTC notification + wire warning | 75% |
| 07 | `07-final-docs-ready.html` | Final docs sent to title | 87% |
| 08 | `08-funded-congratulations.html` | **FUNDED** celebration | 100% |

### Purchase Nurture Sequence (5)

| # | File | Description | Timing |
|---|------|-------------|--------|
| 01 | `purchase-01-welcome.html` | Welcome to home buying journey | Day 0 |
| 02 | `purchase-02-preapproval.html` | Get pre-approved CTA | Day 3 |
| 03 | `purchase-03-market-tips.html` | 5 smart home buying tips | Day 7 |
| 04 | `purchase-04-checkin.html` | How's your home search going? | Day 14 |
| 05 | `purchase-05-still-here.html` | Still here when you're ready | Day 30 |

### Refinance Nurture Sequence (5)

| # | File | Description | Timing |
|---|------|-------------|--------|
| 01 | `refi-01-welcome.html` | Explore refinance options | Day 0 |
| 02 | `refi-02-rate-analysis.html` | Personalized rate analysis | Day 3 |
| 03 | `refi-03-cashout.html` | Unlock your home equity | Day 7 |
| 04 | `refi-04-checkin.html` | Questions about refinancing? | Day 14 |
| 05 | `refi-05-still-here.html` | I'm watching rates for you | Day 30 |

### SMS Templates (30+)

- **Loan Status SMS** - 8 templates matching email milestones
- **Lead Nurture SMS** - 5-step new lead sequence
- **Appointment SMS** - Confirmations, reminders, missed
- **Post-Close SMS** - Thank you, review request, anniversaries
- **Pre-Qual SMS** - Started, complete, doc reminders
- **Rate Drop SMS** - Alert for refinance opportunities

### LO Self-Alert System

Internal notifications to keep David informed:
- New application alerts
- 3-day processing delay warning
- 7-day underwriting delay warning
- 14-day approval delay alert
- 21-day CTC escalation
- Funded celebration notification

---

## Email Features

### Visual Progress Tracker
Every loan status email includes a visual checklist showing loan progress:

```
✓ Application Completed    [Date]
✓ Sent to Processing       [Date]
✓ Submitted to Underwriting [Date]
✓ Conditional Approval     TODAY!
○ Loan Approved           Upcoming
○ Clear to Close
○ Final Docs Ready
○ Funded
```

### LENDWISE Branding
- Full-color logo and owl icon
- David Young's signature with NMLS/DRE
- Click-to-call phone number
- Social media links
- Equal Housing Lender disclosure
- Wire fraud warnings (on closing emails)

---

## File Structure

```
mission-control/
├── README.md                    # This file
├── import-to-ghl.js            # Import script for GHL
│
├── assets/
│   └── lendwise-brand.json     # Brand colors, fonts, contact info
│
├── emails/
│   ├── base-template.html      # Master template
│   ├── components/
│   │   └── progress-tracker.html
│   ├── loan-status/
│   │   ├── 01-application-completed.html
│   │   ├── 02-sent-to-processing.html
│   │   ├── 03-submitted-to-underwriting.html
│   │   ├── 04-conditional-approval.html
│   │   ├── 05-loan-approved.html
│   │   ├── 06-clear-to-close.html
│   │   ├── 07-final-docs-ready.html
│   │   └── 08-funded-congratulations.html
│   └── nurture-sequences/
│       ├── purchase-01-welcome.html
│       ├── purchase-02-preapproval.html
│       ├── purchase-03-market-tips.html
│       ├── purchase-04-checkin.html
│       ├── purchase-05-still-here.html
│       ├── refi-01-welcome.html
│       ├── refi-02-rate-analysis.html
│       ├── refi-03-cashout.html
│       ├── refi-04-checkin.html
│       └── refi-05-still-here.html
│
├── lo-alerts/
│   └── lo-self-alerts.html     # Internal LO notification templates
│
└── workflows/
    ├── sms-templates.json      # All SMS templates
    └── complete-workflows.json # Full workflow specifications
```

---

## GHL Workflow Setup

### Required Tags (created automatically by import script)

**Loan Status Tags:**
1. `Application Started`
2. `In Processing`
3. `In Underwriting`
4. `Conditionally Approved`
5. `Loan Approved`
6. `Clear to Close`
7. `Final Docs Ready`
8. `Closed`
9. `Post-Close Nurture`

**Lead Type Tags:**
10. `Purchase Lead`
11. `Refinance Lead`

**Status Tags:**
12. `Lost`
13. `Unsubscribed`

### Loan Status Workflow Triggers

| Workflow | Trigger Tag | Email Sent |
|----------|-------------|------------|
| Application Completed | `Application Started` | 01 |
| Sent to Processing | `In Processing` | 02 |
| Submitted to UW | `In Underwriting` | 03 |
| Conditional Approval | `Conditionally Approved` | 04 |
| Loan Approved | `Loan Approved` | 05 |
| Clear to Close | `Clear to Close` | 06 |
| Final Docs Ready | `Final Docs Ready` | 07 |
| Funded | `Closed` | 08 |

### Nurture Workflow Triggers

| Workflow | Trigger Tag | Sequence |
|----------|-------------|----------|
| Purchase Nurture | `Purchase Lead` | 5 emails over 30 days |
| Refinance Nurture | `Refinance Lead` | 5 emails over 30 days |

### How Tags Are Applied

**Option A: Manual**
LO adds tag when loan status changes in Encompass

**Option B: Zapier Integration**
Connect Encompass webhooks to automatically add GHL tags

**Option C: API Integration**
Use GHL API to add tags programmatically

---

## Custom Fields for Progress Tracker

To show dates in the progress tracker, create these custom fields:

- `application_date` - Date
- `processing_date` - Date
- `underwriting_date` - Date
- `conditional_date` - Date
- `approval_date` - Date
- `ctc_date` - Date
- `final_docs_date` - Date
- `funded_date` - Date

---

## Testing

### Loan Status Sequence
1. Create a test contact in GHL
2. Add tag `Application Started`
3. Verify email sends with progress tracker
4. Continue adding tags to test full sequence
5. Check internal notifications are received

### Purchase Nurture
1. Create a test contact
2. Add tag `Purchase Lead`
3. Verify welcome email sends immediately
4. Wait or manually trigger subsequent emails

### Refinance Nurture
1. Create a test contact
2. Add tag `Refinance Lead`
3. Verify welcome email sends immediately
4. Wait or manually trigger subsequent emails

---

## Support

**David Young**
LENDWISE Mortgage
310-954-7772
david@lendwisemtg.com

NMLS# 2702455 | DRE# 02282825
