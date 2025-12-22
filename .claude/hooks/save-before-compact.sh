#!/bin/bash
# PreCompact Hook - Automatically saves state before context compaction
# Has access to $TRANSCRIPT_PATH with full conversation history

MEMORY_DIR="/mnt/c/Users/dyoun/ghl-automation/.claude"
PROJECT_DIR="/mnt/c/Users/dyoun/ghl-automation"
ACTIVE_WORK="$MEMORY_DIR/active-work.md"
CONVERSATION_LOG="$MEMORY_DIR/conversation-log.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Run the Supabase-aware save-session script
cd "$PROJECT_DIR"
node scripts/save-session.js "Auto-snapshot before compaction" 2>/dev/null

# Build active-work.md for post-compaction context
cat > "$ACTIVE_WORK" << 'HEADER'
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

HEADER

echo "## Last Compaction" >> "$ACTIVE_WORK"
echo "$TIMESTAMP" >> "$ACTIVE_WORK"
echo "" >> "$ACTIVE_WORK"

# Extract recent conversation if transcript available
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  echo "## Recent Conversation (before compaction)" >> "$ACTIVE_WORK"
  echo "" >> "$ACTIVE_WORK"

  # Extract last meaningful exchanges
  tail -100 "$TRANSCRIPT_PATH" 2>/dev/null | grep -E "(Human:|Assistant:|user:|assistant:)" | tail -30 >> "$ACTIVE_WORK" 2>/dev/null

  echo "" >> "$ACTIVE_WORK"

  # Save full recent transcript
  echo "# Conversation Log - $TIMESTAMP" > "$CONVERSATION_LOG"
  echo "" >> "$CONVERSATION_LOG"
  tail -200 "$TRANSCRIPT_PATH" >> "$CONVERSATION_LOG" 2>/dev/null
fi

# Append key files list
cat >> "$ACTIVE_WORK" << 'FOOTER'

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
FOOTER

echo "PreCompact: Saved state at $TIMESTAMP"
exit 0
