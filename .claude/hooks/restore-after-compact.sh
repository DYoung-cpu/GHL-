#!/bin/bash
# SessionStart Hook (compact matcher) - Restores full context after compaction

MEMORY_DIR="/mnt/c/Users/dyoun/ghl-automation/.claude"
ACTIVE_WORK="$MEMORY_DIR/active-work.md"
CONVERSATION_LOG="$MEMORY_DIR/conversation-log.md"

echo "=============================================="
echo "  POST-COMPACTION CONTEXT RESTORATION"
echo "=============================================="
echo ""

# Output the active work file
if [ -f "$ACTIVE_WORK" ]; then
  cat "$ACTIVE_WORK"
  echo ""
fi

# Output recent conversation if available
if [ -f "$CONVERSATION_LOG" ]; then
  echo "=============================================="
  echo "  RECENT CONVERSATION (before compaction)"
  echo "=============================================="
  tail -50 "$CONVERSATION_LOG"
  echo ""
fi

echo "=============================================="
echo "  REQUIRED ACTIONS"
echo "=============================================="
echo ""
echo "You just experienced CONTEXT COMPACTION."
echo ""
echo "BEFORE doing anything else, you MUST:"
echo "1. Read .claude/active-work.md (shown above)"
echo "2. Read .claude/session-snapshot-dec13-2025.md"
echo "3. Read .claude/project-memory.md"
echo ""
echo "DO NOT answer questions until you have read these files."
echo "DO NOT assume or guess - verify in files first."
echo ""
echo "=============================================="

exit 0
