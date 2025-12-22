#!/bin/bash
# SessionStart Hook - Injects context at ANY session start (startup, resume, compact)

MEMORY_DIR="/mnt/c/Users/dyoun/ghl-automation/.claude"
ACTIVE_WORK="$MEMORY_DIR/active-work.md"

echo "=============================================="
echo "  DAVID YOUNG - GHL AUTOMATION PROJECT"
echo "=============================================="
echo ""
echo "MANDATORY: Read these files before answering ANY project questions:"
echo "1. .claude/active-work.md - Current state"
echo "2. .claude/project-memory.md - Full history"
echo ""
echo "RULES:"
echo "- NO assumptions or guessing"
echo "- Verify ALL facts in files before answering"
echo "- Target: David Young (peE6XmGYBb1xV0iNbh6C)"
echo ""

# Show current active work summary
if [ -f "$ACTIVE_WORK" ]; then
  echo "Current Active Work:"
  head -30 "$ACTIVE_WORK"
fi

echo ""
echo "=============================================="

exit 0
