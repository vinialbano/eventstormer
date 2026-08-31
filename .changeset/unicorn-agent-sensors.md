---
"eventstormer": patch
---

Enable eight unopinionated unicorn ESLint sensors (bare `eslint-disable`, missing
`node:` protocol, `throw` without `new`, empty `Error`, `forEach`, `reverse().find`,
mutating `sort`, `await` inside `Promise.all`) without adopting `unicorn/recommended`.
