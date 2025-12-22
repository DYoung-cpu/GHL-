# LENDWISE MORTGAGE - GHL Automation Project Plan

## Executive Summary
Complete automation setup for email marketing, SMS campaigns, and social media for LENDWISE MORTGAGE using GoHighLevel (GHL).

---

## Current State

### What We Have
| Item | Count | Status |
|------|-------|--------|
| Contacts (Past Clients) | 912 | Imported, tagged "past client" |
| Email Snippets | 53 | Content created, not templated |
| SMS Snippets | 40 | Content created |
| Workflow Shells | ~34 | Names only, NO logic inside |
| Pipeline | 1 | 10 stages configured |
| Custom Fields | 33 | Created |
| Tags | 61 | Created |

### What's Missing
- Email HTML templates (designed, branded)
- Workflow logic (triggers, actions, waits)
- Social media account connections
- End-to-end testing

---

## Division of Labor

### Claude Will Do (Automated/Generated)
1. Generate HTML email templates (you paste into GHL)
2. Write all email/SMS copy
3. Automate contact tagging via API
4. Create/schedule social media posts via API
5. Trigger workflows via API
6. Provide step-by-step workflow building instructions

### David Must Do (Manual in GHL UI)
1. Upload images to GHL Media Storage
2. Paste HTML templates or recreate in drag-and-drop
3. Build workflow logic (triggers, actions, waits)
4. Connect social media accounts
5. Publish workflows
6. Final testing

---

## Phase 1: Email Templates (Priority)

### Template 1: Lendwise Announcement (FIRST EMAIL)
**Purpose:** Introduce Lendwise Mortgage to past clients
**Content:**
- New company announcement
- New email address notification
- Personal touch (family photo option)
- Call to action

**Deliverable:** Full HTML email template

### Template 2: Value/Check-in Email
**Purpose:** Ongoing nurture touchpoint
**Content:**
- Market updates
- Home tips
- Soft call to action

### Template 3: Rate Alert Email
**Purpose:** Notify of rate drops
**Content:**
- Current rate info
- Refinance opportunity
- Clear CTA

### Template 4: Referral Ask Email
**Purpose:** Generate referrals from happy clients
**Content:**
- Thank you message
- Referral request
- Simple process explanation

### Template 5: Birthday/Anniversary Email
**Purpose:** Personal milestone touchpoints
**Content:**
- Warm wishes
- Subtle branding
- No hard sell

---

## Phase 2: Workflow Building

### Priority 1: Past Client Nurture (Master List)
**Trigger:** Tag "Master List" added (or Add to Automation)
**Sequence:**
1. Email 1: Lendwise Announcement (Day 0)
2. Wait 7 days
3. Email 2: Value/Check-in (Day 7)
4. Wait 14 days
5. SMS: Quick touchpoint (Day 21)
6. Wait 14 days
7. Email 3: Market Update (Day 35)
8. Continue monthly...

### Priority 2: New Lead Fast Response
**Trigger:** Tag "New Lead" added
**Sequence:**
1. SMS: Immediate response (0 min)
2. Email: Welcome (5 min)
3. Wait for reply or 2 min
4. Branch based on response

### Priority 3: Appointment Reminders
**Trigger:** Appointment booked
**Sequence:**
1. Confirmation SMS + Email (immediate)
2. 24-hour reminder
3. 1-hour reminder

### Priority 4-15: Remaining Workflows
(See workflows-templates.json for full list)

---

## Phase 3: Social Media Integration

### Step 1: Connect Accounts (David does in UI)
- [ ] Facebook
- [ ] Instagram
- [ ] LinkedIn
- [ ] Google Business Profile
- [ ] TikTok (optional)

### Step 2: Content Strategy
- Weekly market updates
- Monthly tips posts
- Celebration posts (closings, milestones)
- Personal/brand building content

### Step 3: Automation (Claude via API)
- Schedule posts in bulk
- Cross-post to multiple platforms
- Track engagement

---

## Execution Timeline

### Session 1 (Today): Foundation
- [ ] Create Lendwise Announcement email template
- [ ] David uploads to GHL
- [ ] Build Past Client Nurture workflow (Master List)
- [ ] Test with 1 contact

### Session 2: Core Workflows
- [ ] Build New Lead Fast Response workflow
- [ ] Build Appointment Reminder workflow
- [ ] Create remaining email templates

### Session 3: Complete Automation
- [ ] Build remaining workflows
- [ ] Connect social media accounts
- [ ] Set up social posting automation
- [ ] Full end-to-end testing

---

## Files Reference

| File | Purpose |
|------|---------|
| `/templates/email-templates.json` | 53 email content templates |
| `/templates/sms-templates.json` | 40 SMS content templates |
| `/templates/workflows-templates.json` | 15 workflow specifications |
| `/templates/forms-templates.json` | 5 form specifications |

---

## Next Immediate Action

**Create the Lendwise Announcement Email Template**

David to provide:
1. Lendwise logo (if available)
2. Photo of your boys (optional)
3. Any specific messaging preferences
4. Color preferences (brand colors)

Claude will generate:
- Complete HTML email template
- Mobile-responsive design
- Personalization variables included
- Ready to paste into GHL

---

## Success Metrics

- [ ] 912 past clients receive Lendwise announcement
- [ ] Automated nurture running for all contacts
- [ ] New leads get instant response
- [ ] Social media posting on schedule
- [ ] Email open/click tracking active
