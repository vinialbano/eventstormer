#!/usr/bin/env bash
# PreToolUse on Bash. Exit 2 is the only exit code that blocks; exit 1 does not.
# This is a guardrail against habit, not a security boundary — a hook that times
# out does not block, so never rely on it for anything adversarial.
set -uo pipefail

cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() { printf 'Blocked: %s\n' "$1" >&2; exit 2; }

case "$cmd" in
  *--no-verify*)
    deny "--no-verify skips the pre-commit and commit-msg gates. Fix what is failing instead." ;;
  *"push --force"*|*"push -f "*|*"push --delete"*)
    deny "force/delete push. Use --force-with-lease deliberately, by hand, if you truly mean it." ;;
  *"git checkout main"*|*"git switch main"*)
    : ;;
esac

# Never write secrets through the shell; .env is gitignored and hand-edited.
if printf '%s' "$cmd" | grep -qE '(>|>>|tee|sed -i.*)[[:space:]]*\.env([[:space:]]|$)'; then
  deny ".env is edited by hand, never written by a tool. Copy .env.example and fill it in."
fi

# Committing to main is blocked by lefthook too; this catches it a step earlier.
if printf '%s' "$cmd" | grep -qE '^git commit' \
   && [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ]; then
  deny "direct commit to main. Branch first."
fi

exit 0
