#!/usr/bin/env bash
# PostToolUse on Write|Edit. Blocks a test file where EVERY assertion only
# verifies a mock was called — a test that proves nothing about behaviour.
# Crude by design: `total == mocks` means a single real assertion satisfies
# it, so false positives are near-zero while the pathological case (a test
# that only checks its own mocks) is caught.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

file="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[[ "$file" =~ \.(test|spec)\.(ts|tsx)$ ]] || exit 0
[ -f "$file" ] || exit 0

total=$(grep -c 'expect(' "$file" 2>/dev/null || echo 0)
mocks=$(grep -cE '\.toHaveBeenCalled|\.toBeCalled' "$file" 2>/dev/null || echo 0)

if [ "$total" -gt 0 ] && [ "$total" -eq "$mocks" ]; then
  printf 'test-quality-gate: every assertion in %s verifies a mock call only — add at least one assertion on a real outcome (return value, thrown error, state change)\n' "$(basename "$file")" >&2
  exit 2
fi
exit 0
