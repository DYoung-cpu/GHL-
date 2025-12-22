# Lendwise Mortgage - GHL Snapshot Setup Guide

## What's Been Completed via Automation

### Already Created in GHL:
1. **Pipeline**: "Mortgage Sales Pipeline" with 11 stages
2. **Custom Fields**: 15 mortgage-specific fields
3. **Tags**: 33+ categorization tags

### Template Files Ready for Import:
All template content has been generated and is ready for manual import into GHL.

---

## Template Files Location

```
/mnt/c/Users/dyoun/ghl-automation/templates/
├── email-templates.json     # 50+ professional email templates
├── sms-templates.json       # 35+ SMS templates
├── forms-templates.json     # 5 lead capture forms
└── workflows-templates.json # 15 automation workflows
```

---

## Manual Setup Required

### 1. Calendars (Settings > Calendars)

Create these 4 calendars:

| Calendar Name | Duration | Description |
|--------------|----------|-------------|
| Discovery Call | 15 min | Initial consultation to understand financing goals |
| Pre-Qualification Review | 30 min | Review documents and discuss loan options |
| Document Review | 45 min | In-depth loan file and documentation review |
| Closing Prep Call | 30 min | Pre-closing walkthrough and document review |

**Settings for each:**
- Calendar Type: Personal Booking
- Availability: Mon-Fri, 9 AM - 6 PM (customize as needed)
- Buffer: 15 minutes between appointments
- Link back to David Young as the team member

---

### 2. Email Templates (Marketing > Email Templates)

The `email-templates.json` file contains 50+ templates organized by category:

**Categories:**
- New Lead/Welcome Sequence (10 templates)
- Pre-Qualification Sequence (5 templates)
- Application Process (8 templates)
- Rate Lock Updates (4 templates)
- Closing Sequence (5 templates)
- Post-Close Nurture (10 templates)
- Referral Partner (6 templates)
- Holiday Templates (5 templates)

**To create each template:**
1. Go to Marketing > Email Templates
2. Click "+ Create Template"
3. Name it using the `id` from the JSON
4. Copy the `subject` and `body` content
5. Replace placeholders: `{{contact.first_name}}`, etc.
6. Save

---

### 3. SMS Templates (Marketing > SMS Templates)

The `sms-templates.json` file contains 35+ SMS templates:

**Categories:**
- New Lead SMS (5)
- Appointment Reminders (5)
- Pre-Qualification (4)
- Application Updates (6)
- Closing Countdown (5)
- Post-Close Nurture (5)
- Rate Alerts (3)
- Realtor Partner Updates (4)
- Quick Responses (3)

**To create:**
1. Go to Settings > Business Settings > SMS Templates
2. Create new template for each
3. Copy message content from JSON
4. Include merge fields: `{{contact.first_name}}`

---

### 4. Forms (Sites > Forms)

Create these 5 forms from `forms-templates.json`:

1. **Quick Contact Form** - Simple 5-field lead capture
2. **Pre-Qualification Application** - Detailed 40+ field application
3. **Realtor Partner Referral Form** - For agent referrals
4. **Refinance Analysis Request** - Refi-specific intake
5. **Request a Callback** - Simple callback request

**Form Builder Tips:**
- Use the field definitions from the JSON
- Set up conditional logic where noted
- Configure form actions to:
  - Add specified tags
  - Update pipeline stage
  - Send notification to David

---

### 5. Workflows (Automation > Workflows)

Create these 15 workflows from `workflows-templates.json`:

**Priority Order:**
1. New Lead Nurture Sequence (critical)
2. Appointment Reminder Sequence (reduces no-shows)
3. Pre-Qualification Process Workflow
4. Post-Close Nurture & Referral Sequence
5. Remaining workflows

**Workflow Structure:**
Each workflow JSON includes:
- `trigger` - What starts the workflow
- `steps` - Actions in order with delays
- `exit_conditions` - What stops the workflow

**Example Workflow Setup:**
```
Trigger: Tag Added = "New Lead"
Step 1: Wait 0 min → Send SMS (sms-lead-1)
Step 2: Wait 5 min → Send Email (email-lead-welcome-1)
Step 3: Wait 1 day → Send SMS (sms-lead-2)
... etc
Exit: If tag "Appointment Scheduled" added → Stop
```

---

## Customization Checklist

Before going live, update these placeholders:

- [ ] Replace `[YOUR_NMLS]` with actual NMLS number
- [ ] Add Google review link to post-close templates
- [ ] Verify calendar booking URLs
- [ ] Update any rate/pricing references
- [ ] Test all form submissions
- [ ] Run test contact through each workflow

---

## Quick Reference - Pipeline Stages

1. New Lead
2. Contacted
3. Appointment Scheduled
4. Pre-Qualification
5. Pre-Approved
6. House Hunting
7. Under Contract
8. Application
9. Underwriting
10. Clear to Close
11. Closed Won
12. Closed Lost (separate)
13. On Hold (separate)

---

## Quick Reference - Key Tags

**Lead Source:** Website, Zillow, Realtor Referral, Past Client Referral, Social Media
**Loan Type:** Conventional, FHA, VA, USDA, Jumbo
**Property:** Primary Residence, Investment, Second Home
**Status:** Hot Lead, Warm Lead, Cold Lead, Do Not Contact

---

## Support

For questions about this setup:
- GHL Documentation: https://help.gohighlevel.com
- Lendwise: David@lendwisemtg.com | (310) 954-7772

---

*Generated for Lendwise Mortgage CRM Migration*
*Value: Equivalent to $1,500-$2,500 premium snapshot*
