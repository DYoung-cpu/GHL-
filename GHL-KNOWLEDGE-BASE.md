# GoHighLevel (GHL) Expert Knowledge Base

**Last Updated:** December 9, 2025
**Purpose:** Comprehensive reference for GHL automation and configuration

---

## Table of Contents
1. [Navigation Structure](#navigation-structure)
2. [Email Signatures](#email-signatures)
3. [Business Profile Settings](#business-profile-settings)
4. [Contacts Module](#contacts-module)
5. [Conversations Module](#conversations-module)
6. [Email Configuration](#email-configuration)
7. [API Reference](#api-reference)
8. [Automation Selectors](#automation-selectors)
9. [Common Workflows](#common-workflows)

---

## Navigation Structure

### Main Sidebar Menu (Left)
```
├── Search (ctrl K)
├── Launchpad
├── Dashboard
├── Conversations
├── Calendars
├── Contacts ← Contact management
├── Opportunities ← Sales pipeline
├── Payments
├── AI Agents
├── Marketing
├── Automation
├── Sites
├── Memberships
├── Media Storage
├── Reputation
├── Reporting
├── App Marketplace
└── Settings ← Configuration hub
```

### Settings Navigation
```
Settings/
├── Business Profile (default page)
│   ├── General Information
│   ├── Business Physical Address
│   ├── Business Information
│   ├── Authorized Representative
│   ├── General (toggles)
│   ├── Contact Deduplication Preferences
│   └── Enable/Disable Deprecated Features
├── My Staff ← USER EMAIL SIGNATURES HERE
├── Custom Fields
├── Custom Values
├── Tags
├── Pipelines
├── Calendars
├── Email Services
└── Integrations
```

---

## Email Signatures

### CORRECT PATH TO SET UP EMAIL SIGNATURES
```
Settings → My Staff → [Click User] → Edit → User Info (expand) → Email Signature
```

### Key Points:
1. **Signatures are PER-USER** - Each user has their own signature
2. **Must be logged in as the user** - Agency-level sends don't include user signatures
3. **Supports HTML** - Can paste HTML code for rich signatures
4. **Custom Value Available** - Use `{{user.signature}}` in templates/emails

### Setting Up Signature in GHL:
1. Navigate to **Settings** in left sidebar
2. Click **My Staff**
3. Find user (e.g., David Young) and click **Edit**
4. Expand **User Info** section
5. Scroll to **Email Signature** field
6. Paste HTML signature code
7. Click **Save**

### Using Signature in Templates:
1. Go to **Marketing** → **Email Marketing**
2. Edit template
3. In text block, click **Custom Values**
4. Search for and select `user/signature`
5. Position at bottom of email

### Signature in Workflows:
1. In workflow email action
2. Add custom value `{{user.signature}}`
3. Signature auto-populates based on assigned user

---

## Business Profile Settings

### Access Path
```
Settings → Business Profile (first option, default page)
```

### 7 Sections:
| Section | Purpose |
|---------|---------|
| General Information | Logo, business name, email, phone, website, API key |
| Business Physical Address | Address, timezone, language settings |
| Business Information | Legal entity type, industry, registration ID |
| Authorized Representative | Contact person for compliance verification |
| General | Behavior toggles (duplicates, timezone, verification) |
| Contact Deduplication | Duplicate handling rules |
| Deprecated Features | Legacy module toggles |

---

## Contacts Module

### Access
```
Sidebar → Contacts
URL: https://app.gohighlevel.com/v2/location/{LOCATION_ID}/contacts
```

### Page Structure
- **Top Navigation:** Contacts | Smart Lists | Bulk Actions | Restore | Tasks | Companies | Manage Smart Lists
- **Tabs:** All (default)
- **Toolbar Icons (left to right):**
  - `+` Add Contact
  - Filter icon
  - Search icon
  - Comment icon
  - Envelope (Email bulk action)
  - Tag icons
  - Trash
  - Star
  - Upload
  - Download
  - More actions

### Add Contact Drawer
- Opens as **right-side drawer** (not modal)
- Fields: First Name, Last Name, Email, Phone, Contact Type, Time Zone
- **Buttons at bottom:** "Save and Add Another" | "Cancel" | "Save" (blue)

### Bulk Actions Available:
- Add Contact
- Export Contacts
- Pipeline Change
- Add to Campaign/Workflow
- Send SMS
- Send Email
- Add/Remove Tag
- Delete Contacts
- Send Review Requests
- Merge Duplicates

### Contact Detail Page
- **Left Panel:** Contact fields (First Name, Last Name, Email, Phone, etc.)
- **Middle Panel:** Conversation history, Email composer
- **Right Panel:** Activity, Tasks, Appointments

---

## Conversations Module

### Access
```
Sidebar → Conversations
URL: https://app.gohighlevel.com/v2/location/{LOCATION_ID}/conversations
```

### New UI (4-Panel Layout)
1. **Left Panel:** Conversation list with search/filters
2. **Middle-Left:** Conversation thread
3. **Middle-Right:** Compose area (SMS/Email tabs at bottom)
4. **Right Panel:** Contact context (details, files, payments)

### Key UI Elements:
- **Search box** at top of conversation list
- **Filter icon** (funnel) for Quick Filters
- **Compose icon** (pen-to-square) for new message
- **Tabs:** Unread | Recents | Starred | All

### Sending Email from Conversations:
1. Select contact from list (or search)
2. Click **Email** tab at bottom of compose area
3. Fill Subject line
4. Compose message in editor
5. Click **Send** button

### Email Composer Features:
- Full-screen mode for long drafts
- Inline reply for quick responses
- Rich text editor
- File attachments
- Template insertion
- Custom values support

---

## Email Configuration

### Email Services Location
```
Settings → Email Services
```

### Dedicated Sending Domain Setup
1. Go to Settings → Email Services
2. Add dedicated domain
3. Configure DNS records (SPF, DKIM, DMARC)
4. Verify domain

### Email Sending Best Practices
- Warm up new domains gradually
- Use dedicated domains for bulk sends
- Monitor bounce rates
- Keep complaint rates below 0.1%

---

## API Reference

### Base URL
```
https://services.leadconnectorhq.com/
```

### Authentication
- **OAuth 2.0** for marketplace apps
- **Bearer Token** for direct API calls
- **Private Integration Token** for internal tools

### Key Endpoints

#### Contacts
```
GET    /contacts/                    # List contacts
POST   /contacts/                    # Create contact
GET    /contacts/{contactId}         # Get contact
PUT    /contacts/{contactId}         # Update contact
DELETE /contacts/{contactId}         # Delete contact
```

#### Conversations
```
GET    /conversations/               # List conversations
POST   /conversations/messages       # Send message
GET    /conversations/{id}/messages  # Get messages
```

### Rate Limits
- **Burst:** 100 requests per 10 seconds
- **Daily:** 200,000 requests per day per app per resource

### Headers Required
```
Authorization: Bearer {YOUR_TOKEN}
Version: 2021-07-28
Content-Type: application/json
```

---

## Automation Selectors

### Contacts Page Selectors
```javascript
// Add Contact button (+ icon)
'button:has(svg[data-icon="plus"])'
// Coordinate fallback: (254, 194)

// Quick Search input
'input[placeholder*="Quick search" i]'

// Contact row
'tr, [role="row"]'

// Save button in drawer
'button:has-text("Save"):not(:has-text("Another"))'
// Coordinate fallback: (1340, 853)

// Email icon in toolbar
'svg[data-icon="envelope"]'
// Coordinate fallback: (462, 194)
```

### Conversations Page Selectors
```javascript
// Search input
'input[placeholder*="Search" i]'

// Compose icon (new message)
'svg[data-icon="pen-to-square"]'
// Coordinate fallback: (524, 160)

// Filter icon
'svg[data-icon="filter"]'
// Coordinate fallback: (490, 160)

// Email tab
'[role="tab"]:has-text("Email"), button:has-text("Email")'

// Subject input
'input[placeholder*="Subject" i]'

// Body editor
'[contenteditable="true"], .ql-editor'

// Send button
'button:has-text("Send")'
```

### Contact Detail Page Selectors
```javascript
// Email composer in detail view
'[class*="email-composer"]'

// Contact info fields
'input[name="firstName"]'
'input[name="lastName"]'
'input[name="email"]'
'input[name="phone"]'
```

### Drawer/Modal Handling
```javascript
// Drawer container
'.hr-drawer-container, [class*="drawer"]'

// Drawer mask (blocks clicks when open)
'.hr-drawer-mask'

// Close drawer: Click Save or press Escape
```

---

## Common Workflows

### Create Contact → Send Email
```
1. Contacts → Click + button
2. Fill form in drawer
3. Click Save (blue button)
4. Wait for drawer to close
5. Search for contact in Quick Search
6. Select contact row
7. Click envelope icon OR navigate to Conversations
8. Select Email tab
9. Fill Subject + Body
10. Click Send
```

### Set Up Email Signature
```
1. Settings → My Staff
2. Find user → Edit
3. Expand User Info
4. Paste HTML in Email Signature field
5. Save
```

### Bulk Email to Contacts
```
1. Contacts → Select contacts (checkboxes)
2. Click envelope icon in toolbar
3. Compose email in modal
4. Send
```

### Import Signature to Template
```
1. Marketing → Email Marketing
2. Create/Edit template
3. Add text block
4. Custom Values → user/signature
5. Save template
```

---

## Location IDs & URLs

### URL Pattern
```
https://app.gohighlevel.com/v2/location/{LOCATION_ID}/{module}
```

### Module URLs
```
/contacts          - Contacts page
/conversations     - Conversations page
/opportunities     - Pipeline/Opportunities
/settings          - Settings page
/calendars         - Calendar management
/automation/workflows - Workflows
```

### Current Project Location ID
```
e6yMsslzphNw8bgqRgtV  (LENDWISE MORTGAGE)
```

---

## Sources & References

- [HighLevel Support Portal](https://help.gohighlevel.com/)
- [Email Signatures Guide](https://help.gohighlevel.com/support/solutions/articles/48000982598-email-signatures)
- [Business Profile Settings](https://help.gohighlevel.com/support/solutions/articles/155000006223-business-profile-settings)
- [Bulk Actions Guide](https://help.gohighlevel.com/support/solutions/articles/48001167703-upgraded-bulk-actions-interface-for-contacts-smartlists)
- [New Conversations UI](https://help.gohighlevel.com/support/solutions/articles/155000006610-getting-started-with-the-new-conversations-experience)
- [API Documentation](https://marketplace.gohighlevel.com/docs/)
- [Developer Portal](https://developers.gohighlevel.com/)

---

## Troubleshooting

### Email Signature Not Appearing
- **Cause:** Logged in as agency, not user
- **Fix:** Log in as the specific user with signature set

### Drawer Blocking Clicks
- **Cause:** Modal/drawer overlay intercepts events
- **Fix:** Save/close drawer before interacting with background

### Contact Not Showing After Create
- **Cause:** Search needs refresh
- **Fix:** Clear search, wait for list refresh, search again

### Email Not Sending
- **Cause:** Missing required fields (To, From)
- **Fix:** Ensure contact has email, sender configured
