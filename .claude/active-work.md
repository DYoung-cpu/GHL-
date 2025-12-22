# ACTIVE WORK - READ THIS FIRST

## Last Updated
2025-12-22 (Fixed stale info, uploaded first template)

## CURRENT FOCUS
Building marketing templates and workflows for David Young's GHL account.

## MANDATORY RULES
1. NO ASSUMPTIONS - verify in files before answering
2. CLEANUP - after major tasks, update this file & remove stale content
3. Target: David Young (`peE6XmGYBb1xV0iNbh6C`)

## PROJECT TRUTH
- Building: Automated mortgage CRM in GHL for LENDWISE MORTGAGE
- Client: David Young
- Target Account: David Young (peE6XmGYBb1xV0iNbh6C)
- Email: david@lendwisemtg.com

## COMPLETED TODAY (Dec 22, 2025)
1. Uploaded "Application Received" image to GHL media library
2. Created email template "Application Received - David Young"
3. Fixed all stale project files (removed incorrect "Mission Control" references)

## WHAT'S DONE
- 878 contacts imported
- 1 email template: Application Received - David Young (ID: 6949542531624164bbedd3e5)

## REMAINING WORK
- More marketing templates (as images become available)
- Workflow actions
- 5 forms
- Testing
- Encompass API integration (waiting on API key)

## GHL API PATTERNS (PROVEN)
```
# Upload image
POST /medias/upload-file
-F "file=@path" -F "name=Name" -F "locationId=peE6XmGYBb1xV0iNbh6C"

# Create email template
POST /emails/builder
Body: { locationId, name, subject, type: "html", html }
```

## FILES THAT MATTER
- CLAUDE.md - Project truth + rules (auto-loaded)
- .claude/active-work.md - This file
- .claude/hooks/before-every-response.sh - Hook that fires every prompt
