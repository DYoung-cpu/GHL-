#!/bin/bash
# UserPromptSubmit Hook - Fires on EVERY user message
# Injects project truth + rules + patterns

cat << 'EOF'
=== PROJECT TRUTH ===
Building: Automated mortgage CRM in GHL for LENDWISE MORTGAGE
Client: David Young | Target: David Young (peE6XmGYBb1xV0iNbh6C)
Status: Building marketing templates and workflows
Done: 878 contacts, 1 email template (Application Received)
Remaining: More marketing templates, workflow actions, 5 forms, test
====================

=== RULES ===
1. NO guessing - verify in files first
2. Target: David Young (peE6XmGYBb1xV0iNbh6C)
3. CLEANUP: After major tasks, update active-work.md & remove stale content
=============

=== GHL API PATTERNS ===
UPLOAD IMAGE:
  POST /medias/upload-file
  -F "file=@path" -F "name=Name" -F "locationId=peE6XmGYBb1xV0iNbh6C"

CREATE EMAIL TEMPLATE:
  POST /emails/builder
  Body: { locationId, name, subject, type: "html", html }

GET LOCATION:
  GET /locations/peE6XmGYBb1xV0iNbh6C
=============================
EOF

exit 0
