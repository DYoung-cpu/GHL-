# LendWise Email Signature Template

## Final Working Version: v15
File: `/mnt/c/Users/dyoun/Downloads/signature-for-ghl-v15.html`

## Structure
- Two-column layout: Logo (160px) | Contact Info (260px)
- Footer bar spans full width below both columns
- Compliance disclosures at bottom

## Key Learnings
1. Footer must be in separate row with `colspan="2"` - putting it inside logo cell pushes contact info right
2. Logo is 160x140px, contact info will be taller - footer sits below the taller column
3. Use `nowrap="nowrap"` on footer cells to keep everything on one line
4. All images must use GHL Media Storage URLs (storage.googleapis.com/msgsndr/...)

## Variables to Replace Per Loan Officer

| Field | Location | Example |
|-------|----------|---------|
| Name | Line with font-size:19px | David Young |
| Title | First font-size:11px line | CMO / Partner |
| Role | Second font-size:11px line | Business Development & Strategic Growth |
| NMLS/DRE | font-size:9px line | NMLS: 62043 \| DRE: 01371572 |
| Phone | tel: href and display | 310-954-7772 |
| Email | mailto: href and display | david@lendwisemtg.com |
| Calendar Link | Schedule a call href | https://calendar.app.google/MmCe5UPSeuca7PCKA |
| Apply Now Link | lar= parameter | dyoung |

## GHL Media Storage URLs (Shared)
- Animated Owl Logo: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cabe03e9d2539a75a8f.gif`
- Apply Now Button: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cb5eac0a8ebacca5a60.png`
- Equal Housing Logo: `https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cbfeeed0490f19eaefe.png`

## External Icons (Flaticon CDN)
- Phone: `https://cdn-icons-png.flaticon.com/128/3059/3059502.png`
- Email: `https://cdn-icons-png.flaticon.com/128/561/561127.png`
- Calendar: `https://cdn-icons-png.flaticon.com/128/2693/2693507.png`
- Globe: `https://cdn-icons-png.flaticon.com/128/1006/1006771.png`
- Location: `https://cdn-icons-png.flaticon.com/128/684/684908.png`
- Facebook: `https://cdn-icons-png.flaticon.com/128/733/733547.png`
- Instagram: `https://cdn-icons-png.flaticon.com/128/2111/2111463.png`
- TikTok: `https://cdn-icons-png.flaticon.com/128/3046/3046121.png`
- LinkedIn: `https://cdn-icons-png.flaticon.com/128/174/174857.png`
- Google: `https://cdn-icons-png.flaticon.com/128/2991/2991148.png`

## GHL Settings Location
Settings → My Staff → [User] → Edit → User Info (expand) → Enable signature toggle ON → Paste HTML

## Template HTML
```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;">
  <tr>
    <td width="160" valign="top" style="padding:0 10px 0 0;">
      <a href="https://www.lendwisemtg.com" target="_blank" style="text-decoration:none;">
        <img src="https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cabe03e9d2539a75a8f.gif" width="160" height="140" alt="LendWise Mortgage" style="display:block;border:0;">
      </a>
    </td>
    <td width="260" valign="top" style="padding:0;">
      <table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;">
        <tr><td style="font-size:19px;color:#576c5b;padding:0;font-family:Arial,sans-serif;font-weight:bold;line-height:24px;">{{NAME}}</td></tr>
        <tr><td style="font-size:11px;color:#576c5b;padding:0;font-family:Arial,sans-serif;line-height:16px;">{{TITLE}}</td></tr>
        <tr><td style="font-size:11px;color:#576c5b;padding:0;font-family:Arial,sans-serif;line-height:16px;">{{ROLE}}</td></tr>
        <tr><td style="font-size:9px;color:#576c5b;padding:0 0 6px 0;font-family:Arial,sans-serif;line-height:13px;">NMLS: {{NMLS}} | DRE: {{DRE}}</td></tr>
        <tr><td style="border-top:1px solid #daa520;font-size:1px;line-height:1px;height:1px;"></td></tr>
        <tr><td style="font-size:11px;color:#576c5b;padding:6px 0 0 0;font-family:Arial,sans-serif;line-height:18px;"><img src="https://cdn-icons-png.flaticon.com/128/3059/3059502.png" width="11" height="11" alt="" style="vertical-align:middle;border:0;margin-right:4px;"><a href="tel:+1{{PHONE_RAW}}" style="color:#576c5b;text-decoration:none;">{{PHONE_DISPLAY}}</a></td></tr>
        <tr><td style="font-size:11px;color:#576c5b;padding:0;font-family:Arial,sans-serif;line-height:18px;"><img src="https://cdn-icons-png.flaticon.com/128/561/561127.png" width="11" height="11" alt="" style="vertical-align:middle;border:0;margin-right:4px;"><a href="mailto:{{EMAIL}}" style="color:#576c5b;text-decoration:none;">{{EMAIL}}</a></td></tr>
        <tr><td style="font-size:11px;color:#576c5b;padding:0;font-family:Arial,sans-serif;line-height:18px;"><img src="https://cdn-icons-png.flaticon.com/128/2693/2693507.png" width="11" height="11" alt="" style="vertical-align:middle;border:0;margin-right:4px;"><a href="{{CALENDAR_URL}}" style="color:#576c5b;text-decoration:none;">Schedule a call</a></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding:3px 0 0 0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border:1px solid #daa520;border-radius:3px;">
        <tr>
          <td style="padding:2px 6px;" nowrap="nowrap">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 4px 0 0;"><a href="https://lendwisemtg.mymortgage-online.com/loan-app/?siteId=1956469515&lar={{LAR_CODE}}&workFlowId=233348" target="_blank"><img src="https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cb5eac0a8ebacca5a60.png" width="50" height="20" alt="Apply Now" style="display:block;border:0;"></a></td>
                <td style="font-size:10px;color:#daa520;padding:0 3px;">|</td>
                <td style="padding:0 2px 0 0;"><img src="https://cdn-icons-png.flaticon.com/128/1006/1006771.png" width="11" height="11" alt="" style="display:block;border:0;"></td>
                <td style="font-size:9px;padding:0 3px 0 0;" nowrap="nowrap"><a href="https://www.lendwisemtg.com" target="_blank" style="color:#576c5b;text-decoration:none;">lendwisemtg.com</a></td>
                <td style="font-size:10px;color:#daa520;padding:0 3px;">|</td>
                <td style="padding:0 2px 0 0;"><img src="https://cdn-icons-png.flaticon.com/128/684/684908.png" width="11" height="11" alt="" style="display:block;border:0;"></td>
                <td style="font-size:9px;padding:0 3px 0 0;" nowrap="nowrap"><a href="https://www.google.com/maps/dir//21800+Oxnard+St+%23220,+Woodland+Hills,+CA+91367" target="_blank" style="color:#576c5b;text-decoration:none;">Woodland Hills, CA</a></td>
                <td style="font-size:10px;color:#daa520;padding:0 3px;">|</td>
                <td style="padding:0 3px;"><a href="https://www.facebook.com/profile.php?id=61584196554458" target="_blank"><img src="https://cdn-icons-png.flaticon.com/128/733/733547.png" width="12" height="12" alt="Facebook" style="display:block;border:0;"></a></td>
                <td style="padding:0 3px;"><a href="https://www.instagram.com/lendwise_mortgage" target="_blank"><img src="https://cdn-icons-png.flaticon.com/128/2111/2111463.png" width="12" height="12" alt="Instagram" style="display:block;border:0;"></a></td>
                <td style="padding:0 3px;"><a href="https://www.tiktok.com/@lendwisemortgage" target="_blank"><img src="https://cdn-icons-png.flaticon.com/128/3046/3046121.png" width="12" height="12" alt="TikTok" style="display:block;border:0;"></a></td>
                <td style="padding:0 3px;"><a href="https://www.linkedin.com/company/lendwisemtg" target="_blank"><img src="https://cdn-icons-png.flaticon.com/128/174/174857.png" width="12" height="12" alt="LinkedIn" style="display:block;border:0;"></a></td>
                <td style="padding:0 3px;"><a href="https://g.page/r/CX6bhPcMcZ0QEBM" target="_blank"><img src="https://cdn-icons-png.flaticon.com/128/2991/2991148.png" width="12" height="12" alt="Google" style="display:block;border:0;"></a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding:15px 0 0 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="450" style="font-family:Arial,sans-serif;">
        <tr><td style="font-size:7px;color:#415543;line-height:1.4;padding:0 0 5px 0;font-family:Arial,sans-serif;"><b>Confidentiality Notice:</b> This message and its contents are confidential and may contain privileged information intended only for the addressee or intended recipient. If you are not the intended recipient, you are hereby notified that any use, copying, distribution, or disclosure of this message or its contents is strictly prohibited. If you have received this message in error, please notify the sender immediately by replying to this email, delete the message and any attachments, and destroy any copies.</td></tr>
        <tr><td style="font-size:7px;color:#415543;line-height:1.4;padding:0 0 5px 0;font-family:Arial,sans-serif;"><b>IRS Circular 230 Disclosure:</b> To ensure compliance with IRS requirements, please be advised that any U.S. federal tax advice contained in this communication (including any attachments) is not intended or written to be used, and cannot be used, for the purpose of (i) avoiding penalties under the Internal Revenue Code or (ii) promoting, marketing, or recommending any transaction or matter to another party.</td></tr>
        <tr><td style="font-size:7px;color:#415543;line-height:1.4;font-family:Arial,sans-serif;">If you have received this email in error or wish to report an issue, please contact us at <a href="mailto:HelpDesk@Lendwisemtg.com" style="color:#415543;">HelpDesk@Lendwisemtg.com</a>. LendWise Mortgage NMLS ID# 2702455 | DRE# 02282825</td></tr>
        <tr><td style="padding:8px 0 0 0;"><img src="https://storage.googleapis.com/msgsndr/e6yMsslzphNw8bgqRgtV/media/69398cbfeeed0490f19eaefe.png" width="28" height="28" alt="Equal Housing Opportunity" style="display:block;border:0;"></td></tr>
      </table>
    </td>
  </tr>
</table>
```

## Placeholders to Replace
- `{{NAME}}` - Full name (e.g., David Young)
- `{{TITLE}}` - Job title (e.g., CMO / Partner)
- `{{ROLE}}` - Role description (e.g., Business Development & Strategic Growth)
- `{{NMLS}}` - NMLS number (e.g., 62043)
- `{{DRE}}` - DRE number (e.g., 01371572)
- `{{PHONE_RAW}}` - Phone without formatting (e.g., 3109547772)
- `{{PHONE_DISPLAY}}` - Phone with formatting (e.g., 310-954-7772)
- `{{EMAIL}}` - Email address (e.g., david@lendwisemtg.com)
- `{{CALENDAR_URL}}` - Google Calendar booking link
- `{{LAR_CODE}}` - Loan officer code for Apply Now URL (e.g., dyoung)
