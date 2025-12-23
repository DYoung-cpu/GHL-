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
