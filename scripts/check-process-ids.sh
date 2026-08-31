#!/usr/bin/env bash
# Fails if a .specs/ process id has leaked into source: a spec-task id (`S1-05`), a
# decision-log id (`AD-018`), or a milestone tag (`M1-15`). They point at `.specs/`
# state a code reader cannot see and rot the moment the slice closes. Permanent
# `docs/adr/NNN` and PRD `F01` ids are allowed and not matched here.
#
# `pnpm check`, leftover pre-push, the Stop hook, and the first CI `check` job
# step all run this. `.claude/hooks/post-edit-lint.sh` runs the same check per
# edit; the two must agree.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 1

pattern='\b(AD-[0-9]+|S[0-9]+-[0-9]+|M[0-9]+-[0-9]+)\b'

files="$(git ls-files src e2e | grep -E '\.(ts|tsx|vue|js|cjs|mjs)$' || true)"
[ -z "$files" ] && exit 0

hits="$(printf '%s\n' "$files" | xargs grep -nE "$pattern" 2>/dev/null || true)"

if [ -n "$hits" ]; then
  printf 'Process id in source — AGENTS.md > "Keep process ids out of code".\n'
  printf 'Drop the tag, keep the reasoning: not `// synchronous (AD-013)` but\n'
  printf '`// synchronous — node:sqlite has no async API`. Permanent docs/adr/NNN\n'
  printf 'and PRD F01 ids are fine.\n\n%s\n' "$hits"
  exit 1
fi
