# ACTIVE WORK - READ THIS FIRST AFTER COMPACTION

## MANDATORY FIRST ACTIONS
1. Read `.claude/startup-summary.json` for current feature status
2. Read this file completely
3. Query Supabase if summary is stale

## PROJECT IDENTITY
- **Client:** David Young, LENDWISE MORTGAGE
- **Platform:** Go High Level (GHL)
- **Location ID:** peE6XmGYBb1xV0iNbh6C
- **API Key:** pit-7427e736-d68a-41d8-9e9b-4b824b996926
- **Supabase:** https://izcbxqaemlaabpmnqsmm.supabase.co

## ARCHITECTURE
All workflows trigger via TAGS from Encompass:
  Encompass milestone → API adds tag → GHL workflow triggers → Email + SMS sent

## RULES
1. IF YOU CAN DO IT, DO IT
2. SUPABASE IS SOURCE OF TRUTH
3. UPDATE SUPABASE AFTER COMPLETING WORK
4. NEVER HALLUCINATE - check database if unsure

## Last Compaction
2025-12-23 09:57:54

## PAUL TROPP - RESUME THIS WORK
**Location ID:** 7leHITJukh8Kzfv2Sbp3
**API Key:** pit-a1519c2d-93b3-44e0-ac10-1267f56e5a56

### Contact Fix Progress (PAUSED Dec 24, 2024)
| Metric | Value |
|--------|-------|
| Processed | 21,300 / 435,947 (4.9%) |
| Updated | 19,898 |
| Skipped | 1,351 |
| Remaining | ~414,600 |

### To Resume
```bash
node fix-tropp-contacts.js
```
Script will continue from where GHL pagination left off.

### What's Done
- Enriched CSV files in `/mnt/c/Users/dyoun/Downloads/Enriched/`
- WISR Intel report template saved
- 21k contacts already have correct names + tags

### What's Left
- ~414k contacts still need name/tag updates
- Contacts with extractable names → apply correct name
- All contacts → apply profession + confidence tags


## KEY FILES
| File | Purpose |
|------|---------|
| `.claude/startup-summary.json` | Fresh state from Supabase |
| `.claude/snapshots/` | Session snapshots |
| `CLAUDE.md` | All project rules and architecture |
| `scripts/save-session.js` | Manual snapshot trigger |

## SUPABASE TABLES
- `features` - What's built vs pending
- `workflows` - All GHL workflows
- `activity_log` - Session snapshots logged here

---
Auto-generated at compaction. Read startup-summary.json for current state.
