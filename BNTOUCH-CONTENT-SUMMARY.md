# BNTouch Content Scrape Summary

**Scraped:** December 13, 2025
**Account:** lendwisemtg (LendWise Mortgage)

---

## Content Exchange Library (402 Pre-Built Campaigns)

BNTouch has a massive library of ready-to-use marketing campaigns in their Content Exchange.

### Categories Available:
| Category | Count | Description |
|----------|-------|-------------|
| New Lead Marketing | 10 | Initial lead nurture sequences |
| Prospect Marketing | 19 | Follow-up for prospects |
| In-Processing Marketing | 18 | Updates during loan processing |
| Post Funded Marketing | 62 | After closing nurture |
| Long Term Marketing | 57 | Long-term drip campaigns |
| Co-Branded Marketing | 3 | Partner co-branded content |
| Partner Marketing | 24 | Realtor/partner communications |
| Recruiting Materials | 1 | Team recruitment |
| Holidays & Special Events | 63 | Holiday email campaigns |
| Current Market Specials | 6 | Rate alerts, market updates |

### Featured Campaigns:
1. **Partner Portal - Introduction to Prospective Partners** (2 steps, 143 downloads)
2. **The Adviser Series (Blue)** (10 steps, 281 downloads)
3. **Thanksgiving Day 2017-2026** (10 steps, 253 downloads)
4. **Happy Holidays 2017-2026** (13 steps, 293 downloads)
5. **BNTouch: Weekly Market Update** (1 step, 774 downloads)
6. **Recruiting: BNTouch CRM Highlights** (5 steps, 48 downloads)

---

## Active Campaign Triggers (50+)

These are the automated triggers currently configured:

### Holiday Campaigns (All run 10+ years):
- Happy 4th of July Email Campaign (2017-2030)
- Happy April Fool's Day Email Campaign (2023-2034)
- Happy Columbus Day Email Campaign (2023-2034)
- Happy Easter Email Campaign (2023-2034)
- Happy Father's Day Email Campaign (2023-2034)
- Happy Halloween Email Campaign (2023-2034)
- Happy Independence Day Email Campaign
- Happy Labor Day Email Campaign (2023-2034)
- Happy Martin Luther King Jr Day Email Campaign (2023-2034)
- Happy Memorial Day Email Campaign (2023-2032)
- Happy Mother's Day Email Campaign (2023-2034)
- Happy New Year Email Campaign (2023-2034)
- Happy President's Day Email Campaign (2023-2034)
- Happy St. Patrick's Day Email Campaign (2023-2034)
- Happy Thanksgiving Day Email Campaign (2023-2032)
- Happy Valentine's Day Email Campaign (2023-2034)
- Happy Veterans Day Email Campaign (2023-2034)
- Happy Winter Holidays Email Campaign (2023-2034)

### Birthday & Anniversary Campaigns:
- Borrower Birthdays (12 Years)
- Co-Borrower Birthdays (12 Years)
- 1st Birthday (Loan Anniversary) (1 Year)

### Utility Campaigns:
- Time Change Reminders - Borrower Email Campaign (2023-2032)
- Time Change Reminders - Co-Borrower Email Campaign (2023-2032)
- BNTouch Newsletter

### Trigger Conditions:
- **Add Campaign when:** Marketing Sequence is greater than (+) Lead
- **Remove from Campaign when:** (+) No Card Collected

---

## Pending Campaigns (Ready to Send)

1. **CE: Happy Thanksgiving Day Email Campaign 2023-2032**
   - Method: E-mail
   - Status: Waiting
   - Content: "Happy Thanksgiving Day!"

2. **CE: Borrower Birthdays (12 Years)**
   - Method: E-mail
   - Status: Waiting
   - Content: "Happy Birthday!"

3. **CE: BNTouch: Newsletter**
   - Method: E-mail
   - Status: Waiting
   - Content: "Your monthly newsletter from ##COMPANY##"

---

## Campaign Groups (Organization)

Campaigns are organized into these groups:
1. **Default** - General campaigns
2. **Leads & Prospects** - Initial contact sequences
3. **In Processing** - Active loan updates
4. **Funded** - Post-closing nurture
5. **Follow Up** - Re-engagement campaigns
6. **Partner Marketing** - Realtor/referral partner content

---

## Scraped Files

| File | Contents |
|------|----------|
| `bntouch-scraped-content.json` | Initial scrape (427 campaigns, 22 templates) |
| `bntouch-deep-content.json` | Deep scrape (26 CE items, 50 triggers, 30 campaign details) |
| `screenshots/bntouch-*.png` | Visual captures of all sections |
| `bntouch-auth.json` | Saved authentication state |

---

## Key Insights for GHL Replication

### Campaign Structure:
- Multi-step sequences (5-20 steps typical)
- Scheduled over years (10+ year campaigns common)
- Bilingual support (English/Spanish)
- Personalization via merge tags

### Trigger Types:
- Stage-based (Lead → Prospect → Processing → Funded)
- Date-based (birthdays, holidays, anniversaries)
- Manual enrollment

### Content Types:
- HTML email templates with images
- SMS text messages
- Co-branded partner content

### To Replicate in GHL:
1. Create workflows matching BNTouch campaign categories
2. Set up Contact Tag triggers for stage-based automation
3. Import email templates to GHL Email Builder
4. Configure birthday/anniversary date triggers
5. Set up holiday-specific scheduled campaigns

---

## Next Steps

1. [ ] Extract actual email HTML content from top campaigns
2. [ ] Map BNTouch merge tags to GHL custom fields
3. [ ] Create GHL workflows matching BNTouch structure
4. [ ] Import email templates to GHL
5. [ ] Test automation sequences

---

## BNTouch URLs Reference

- Login: https://www.bntouchmortgage.net/
- Dashboard: /account5/
- Campaigns: /account5/campaign
- Content Exchange: /account5/marketing/ce/
- Triggers: /account5/marketing/triggers/
- Templates: /account5/marketing/templates/
- Marketing: /account5/marketing
