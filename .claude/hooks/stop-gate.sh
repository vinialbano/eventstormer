#!/usr/bin/env bash
# Stop hook. The mechanical answer to an agent declaring victory on a broken
# tree: "it should work" is not a result, a passing command is.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

input="$(cat)"

# Without this the block re-triggers the stop that re-runs this hook, forever.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  exit 0
fi

# Nothing to gate before the toolchain is installed.
[ -d node_modules ] || exit 0

out="$(pnpm run check 2>&1)"
status=$?

if [ $status -ne 0 ]; then
  printf 'The gate is red — do not stop here. `pnpm check` failed:\n\n%s\n' \
    "$(printf '%s' "$out" | tail -c 6000)" >&2
  exit 2
fi
exit 0
