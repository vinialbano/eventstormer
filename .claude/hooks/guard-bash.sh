#!/usr/bin/env bash
# PreToolUse on Bash. Exit 2 is the only exit code that blocks; exit 1 does not.
# This is a guardrail against habit, not a security boundary — a hook that times
# out does not block, so never rely on it for anything adversarial.
set -uo pipefail

cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() { printf 'Blocked: %s\n' "$1" >&2; exit 2; }

# Strip heredoc BODIES before matching, so a flag mentioned in prose (a commit
# message, a PR body written via `cat <<'EOF' ... EOF`) can't trip a check meant
# for an actual command-line flag. Keeps the heredoc's start/end marker lines
# (still scanned) and drops only the lines strictly between them. Handles
# `<<DELIM`, `<<'DELIM'`, `<<"DELIM"`, and the tab-stripping `<<-DELIM` form.
# Found live: this exact class of bug blocked a real `gh pr create` whose body
# text merely described the flag below, in prose, rather than using it.
cmd_checked="$(printf '%s\n' "$cmd" | awk '
  BEGIN { instr = 0; delim = "" }
  {
    if (!instr) {
      if (match($0, /<<-?[ \t]*"?'"'"'?[A-Za-z_][A-Za-z0-9_]*'"'"'?"?/)) {
        s = substr($0, RSTART, RLENGTH)
        gsub(/<<-?[ \t]*/, "", s)
        gsub(/["'"'"']/, "", s)
        delim = s
        instr = 1
      }
      print $0
      next
    }
    check = $0
    gsub(/^\t+/, "", check)
    if (check == delim) { instr = 0; print $0; next }
    # inside a heredoc body: drop the line
  }
')"

case "$cmd_checked" in
  *--no-verify*)
    deny "the verify-bypass flag skips the pre-commit and commit-msg gates. Fix what is failing instead." ;;
  *"push --force"*|*"push -f "*|*"push --delete"*)
    deny "force/delete push. Use --force-with-lease deliberately, by hand, if you truly mean it." ;;
  *"git checkout main"*|*"git switch main"*)
    : ;;
esac

# Never write secrets through the shell; .env is gitignored and hand-edited.
if printf '%s' "$cmd_checked" | grep -qE '(>|>>|tee|sed -i.*)[[:space:]]*\.env([[:space:]]|$)'; then
  deny ".env is edited by hand, never written by a tool. Copy .env.example and fill it in."
fi

# Committing to main is blocked by lefthook too; this catches it a step earlier.
if printf '%s' "$cmd_checked" | grep -qE '^git commit' \
   && [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ]; then
  deny "direct commit to main. Branch first."
fi

exit 0
