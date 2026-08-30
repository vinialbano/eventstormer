#!/usr/bin/env bash
# PostToolUse on Edit|Write. The write already happened, so this cannot block —
# exit 2 is *feedback*, which is the point: it collapses the lint/type loop from
# end-of-task to per-edit, while the agent still has the context to fix it.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

file="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

# Machine-specific absolute paths must never land in a committed file — they leak
# the author's layout and resolve wrong for every other reader. Scratchpad files
# live outside the repo, so this only fires on tracked paths.
case "$file" in
  "$PWD"/*|"${CLAUDE_PROJECT_DIR:-.}"/*)
    if grep -nE '(/[U]sers/[A-Za-z0-9]|/[h]ome/[a-z]|[A-Z]:\\[U]sers\\[A-Za-z0-9])' "$file" >/dev/null 2>&1; then
      printf 'Absolute path in %s. Use a repo-relative path (state where to stand) or discover it:\n\n%s\n' \
        "$file" "$(grep -nE '(/[U]sers/[A-Za-z0-9]|/[h]ome/[a-z]|[A-Z]:\\[U]sers\\[A-Za-z0-9])' "$file" | head -c 2000)" >&2
      exit 2
    fi ;;
esac

# .specs/ process ids (spec-task id like S1-05, decision-log id like AD-018,
# milestone tag like M1-15) must not land in source — they point at .specs/ state a
# code reader can't see and rot when the slice closes. Permanent docs/adr/NNN and
# PRD F01 ids are fine. scripts/check-process-ids.sh is the matching CI / pre-push gate.
rel="${file#"$PWD"/}"
rel="${rel#"${CLAUDE_PROJECT_DIR:-.}"/}"
case "$rel" in
  src/*.ts|src/*.tsx|src/*.vue|src/*.js|src/*.cjs|src/*.mjs|e2e/*.ts|e2e/*.vue)
    ids="$(grep -nE '\b(AD-[0-9]+|S[0-9]+-[0-9]+|M[0-9]+-[0-9]+)\b' "$file" 2>/dev/null)"
    if [ -n "$ids" ]; then
      printf 'Process id in %s. AGENTS.md > "Keep process ids out of code": drop the tag, keep the reasoning (not `// synchronous (AD-013)` but `// synchronous — node:sqlite has no async API`). Permanent docs/adr/NNN and PRD F01 ids are allowed.\n\n%s\n' \
        "$rel" "$(printf '%s' "$ids" | head -c 2000)" >&2
      exit 2
    fi ;;
esac

case "$file" in
  *.ts|*.vue|*.js) ;;
  *) exit 0 ;;
esac

out="$(pnpm exec eslint --no-warn-ignored "$file" 2>&1)"
status=$?

if [ $status -ne 0 ]; then
  # Cap well under the 10,000-char output limit.
  printf 'ESLint failed on %s. Fix before continuing:\n\n%s\n' "$file" "$(printf '%s' "$out" | head -c 6000)" >&2
  exit 2
fi
exit 0
