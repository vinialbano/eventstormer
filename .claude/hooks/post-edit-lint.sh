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
