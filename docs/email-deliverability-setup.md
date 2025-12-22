# Email Deliverability Setup Guide

## Problem
Emails show "via app.lendwisesocial.com" instead of coming directly from the LO's domain.

## Root Cause
GHL's LeadConnector Email System sends through a shared/default domain. When FROM address uses a different domain than the sending domain, recipients see "via [sending-domain]".

## Solution: Dedicated Sending Domain

### Option A: Subdomain of Main Domain (Recommended)
Use `mail.lendwisemtg.com` for sending. This:
- Protects main domain reputation (if email issues occur, only subdomain affected)
- Removes "via" display completely
- Looks professional

### Option B: Main Domain
Use `lendwisemtg.com` directly. Higher risk but simpler.

---

## Setup Steps

### Step 1: Access GHL Email Services
1. Login to GHL
2. Go to **Settings** (gear icon)
3. Click **Email Services** in left sidebar
4. Find **Dedicated Domain And IP** section

### Step 2: Add Dedicated Domain
1. Click **Add Dedicated Domain**
2. Enter domain: `mail.lendwisemtg.com` (or chosen subdomain)
3. GHL will generate required DNS records

### Step 3: Add DNS Records
Add these records at your domain registrar (GoDaddy, Namecheap, etc.):

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| CNAME | mail | (provided by GHL) | 3600 |
| TXT | mail | (SPF record from GHL) | 3600 |
| CNAME | mailo._domainkey.mail | (DKIM from GHL) | 3600 |

### Step 4: Verify Domain
1. Return to GHL Email Services
2. Click **Verify** next to your domain
3. Wait for green checkmark (can take 5-60 minutes)

### Step 5: Set as Default
1. Once verified, click **Set as Default**
2. All future emails will send through this domain

---

## Verification Checklist
- [ ] Dedicated domain added in GHL
- [ ] DNS records added at registrar
- [ ] Domain verified (green checkmark)
- [ ] Set as default sending domain
- [ ] Test email received without "via" showing

---

## For New LO Onboarding

Each LO needs their own sending domain setup:

1. **Get LO's domain** (e.g., `loansbyJohn.com`)
2. **Recommend subdomain:** `mail.loansbyJohn.com`
3. **LO must have DNS access** to their domain registrar
4. **Follow steps above** with their domain
5. **Verify before launching campaigns**

---

## Troubleshooting

### "Domain verification failed"
- Wait 30 minutes and retry (DNS propagation)
- Verify records match exactly (no typos)
- Check for conflicting records

### Still seeing "via"
- Ensure FROM address uses the verified domain
- Check that dedicated domain is set as default
- Clear email client cache and resend test

### SPF/DKIM errors
- Ensure no conflicting SPF records
- Only one SPF record per domain allowed
- Combine SPF includes if needed:
  ```
  v=spf1 include:_spf.google.com include:mailgun.org ~all
  ```
