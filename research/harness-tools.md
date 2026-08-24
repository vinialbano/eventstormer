# Harness tooling for an agent-built Nuxt 4 + TypeScript prototype

> ## ⛔ CORRECTIONS — read before acting on anything below
>
> Two claims in this report were later disproved by `research-nuxt.md`, which checked the
> `nuxt/eslint` source and git log directly rather than reading the issue thread.
>
> **1. "`@nuxt/eslint` does not enable type-aware rules" — FALSE.**
> Issue #499 was closed **by a feature**, not abandoned:
> `70d23716 feat: support type-aware rules, fix #499`, shipped in `@nuxt/eslint` v1.4.0
> (2025-05-16). The official path is `eslint.config.typescript.tsconfigPath` in `nuxt.config`,
> then `.override('nuxt/typescript/rules', { rules: ... })`. There is no need to hand-append onto
> the `withNuxt()` composer. Affects §2 throughout and the Consolidated recommendation, where this
> is wrongly promoted to "the one non-obvious finding to act on."
> *Real residual risk:* Nuxt 4's root tsconfig is solution-style and typed linting does not always
> cope — keep a `project: [...]` fallback ready. That is a smaller problem than the one claimed here.
>
> **2. The domain-layer path `^app/domain` is wrong for Nuxt 4.**
> Nuxt 4 ships a `shared/` directory whose *documented* contract is "code in the `shared/`
> directory cannot import any Vue or Nitro code." Domain code belongs in `shared/domain/**`,
> imported via `#shared/domain/...`, and the dependency-cruiser rule should police `^shared/`.
> That makes the rule enforce a framework contract rather than an invented convention.
> Caveat: no published example of dependency-cruiser resolving Nuxt's generated aliases
> (`#shared`, `#app`, `#imports`) — expect to debug it.
>
> **Everything else in this report still stands**, including its source-quality warning, which is
> the reason it was worth trusting on the rest.

Research date: 2026-08-23. Target: solo dev, greenfield Nuxt 4 / TS / Pinia / Vercel AI SDK + Anthropic / Zod / SQLite / Vitest. Most code written by Claude Code. Goal: mistakes caught mechanically, not by review.

## Source quality warning (read this first)

Search for any of these topics in 2026 and the top ten results are SEO content farms (`pkgpulse.com`, `tech-insider.org`, `codersera.com`, `botmonster.com`, `trybuildpilot.com`, `thepromptshelf.dev`, ...) publishing near-identical "X vs Y vs Z 2026" articles with confident benchmark numbers and no methodology. I have **quarantined every claim sourced only from those** into a clearly-marked section per topic. Everything else is from official docs or project repos.

Specifically **unverified against a primary source** and therefore not to be relied on:
- "ESLint 10.0.0 shipped Feb 6 2026, flat config only" — I did not fetch eslint.org to confirm. Treat as plausible-unverified.
- All linter speed multipliers (25–35x, 50–100x, 56x). Content-farm numbers.
- "Oxlint added type-aware linting via tsgo in 2026" — plausible (tsgo is real), unverified.
- "Vercel sponsors Biome 2.0" — unverified.
- "Husky ~5M weekly downloads", "Lefthook 3-5x faster" — unverified.
- Any specific version number of dependency-cruiser, knip, sheriff, lefthook, madge. I saw star counts and commit counts, not versions. **I have written no version numbers below.**

---

## 1. Architecture verification / fitness functions

### The tools

**dependency-cruiser** — validates and visualises the dependency graph of JS/TS projects against rules you write; also emits graphs. `npx depcruise --init` generates a config tailored to the project, and the generated config already includes rules for circular dependencies, missing package.json entries, and orphaned modules. Rules are `{name, severity, from: {path/pathNot}, to: {path/pathNot, circular: true}}` — path-regex based, so a "domain must not import framework" rule is one rule object. Standalone CLI, no ESLint dependency. Repo is mature and active (7.1k stars, ~2,400 commits).
https://github.com/sverweij/dependency-cruiser

Config burden: `--init` gives you a working file for free; the layer rule you actually want is roughly one added rule (~8 lines) per constraint. This is the lowest-effort path to both goals you named (no-framework-in-domain, cycle detection).

**eslint-plugin-boundaries** — ESLint plugin. You declare `settings["boundaries/elements"]` as `{type, pattern}` entries, then rules declaring which element types may import which, plus a default allow/deny. Supports classifying a file along three independent dimensions (element, file category, origin). Flat-config compatible (docs show `export default []`), actively maintained (Renovate, ~937 commits). Docs claim a 5-minute quick start.
https://github.com/javierbrea/eslint-plugin-boundaries

Config burden: higher than dependency-cruiser for the same rule, because you must first define the element taxonomy, then the policy. Payoff is that violations appear inline in the editor, which matters a lot when an *agent* is writing the code — it sees the error in the same lint output it already runs.

**Sheriff** (`@softarc/eslint-plugin-sheriff`) — enforces module boundaries via public APIs (`index.ts` barrel per module) plus a tag-and-dependency-rule model. `npx sheriff init`. Zero dependencies, TypeScript as only peer; works standalone via CLI or through ESLint; explicitly framework-agnostic despite Angular-community origins. Smaller project (313 stars).
https://github.com/softarc-consulting/sheriff · https://www.npmjs.com/package/@softarc/eslint-plugin-sheriff

Its model is opinionated: modules are folders with an `index.ts`, and everything outside that barrel is private. That's a genuinely good discipline for agent-written code (it makes "what may I import" mechanically obvious), but it's a structural commitment made on day one. **I could not confirm from the repo page whether Sheriff detects import cycles** — the README section I fetched did not say. Verify before choosing it if cycles matter to you.

**madge** — dependency graph visualiser that also returns an array of modules with circular dependencies; `madge --circular src` is the usual CI invocation. 10.2k stars, but the maintainer describes it as free-time volunteer work, and 117 issues are open. It only detects cycles — no layer rules.
https://github.com/pahen/madge

**knip** — finds unused files, unused exports, and unused dependencies. 150+ framework plugins and auto-detects the environment; users report near-zero config for standard setups.
https://knip.dev/

This is not architecture verification, but it *is* an agent-specific sensor: agents routinely leave orphaned helper files and dead exports behind after a refactor, and nothing else in the toolchain notices.

**ts-arch / ArchUnitTS** — architecture rules expressed as unit tests. Two separate things share the name space: `ts-arch/ts-arch` (checks dependencies between files/folders/slices and cyclic dependencies, framework-agnostic test runner) and `ArchUnitTS` (npm `archunit`, actively maintained with auto-publish on merge to main). A third, `ts-arch-unit`, is flagged **inactive** by Snyk — no npm release in 12 months. Don't grab the wrong one.
https://github.com/ts-arch/ts-arch · https://github.com/LukasNiessen/ArchUnitTS · https://security.snyk.io/package/npm/ts-arch-unit

The appeal is that rules live in Vitest and fail like any other test. The cost is that you're depending on a small library to parse your graph, and rule expressiveness is lower than dependency-cruiser's.

### Verdict for this project

- **First hour:** dependency-cruiser. `depcruise --init`, then add two rules: `no-circular` (severity error, not warn — the init default may be warn) and a `domain-no-framework` rule forbidding ~~`^app/domain`~~ ⛔ **`^shared/`** (see banner) → `(nuxt|vue|pinia|@pinia/|#app|#imports|h3|nitropack)`. Wire `depcruise src --config` into `package.json` scripts and CI. This is ~15 minutes and directly buys both things you asked for.
- **First hour, second pick:** knip, because config is close to zero and the failure mode it catches (agent leaves dead code) is one you will otherwise never notice.
- **Worth it at scale:** eslint-plugin-boundaries, once the layer taxonomy has actually stabilised and you want violations surfaced in-editor rather than in a separate command. Adopting it on day one means encoding a taxonomy you haven't discovered yet.
- **Overkill here:** Sheriff (structural commitment to barrel modules before you know your modules), ts-arch/ArchUnitTS (dependency-cruiser covers the same ground with a bigger maintenance base), madge (dependency-cruiser already detects cycles; running both is redundant).
- **Contested:** whether ESLint-native (boundaries/Sheriff) beats standalone (dependency-cruiser). Sources genuinely disagree — the ESLint camp values inline feedback, the standalone camp values richer rules and graph output. For an *agent*-written codebase I lean ESLint-native eventually, because agents read lint output continuously and CLI output only when told to; but dependency-cruiser first, because it's cheaper today.

---

## 2. Linting and formatting

### Primary-source facts

**typescript-eslint typed linting**: enable by (a) using a `*TypeChecked` preset (`recommendedTypeChecked`, `strictTypeChecked`) and (b) setting `parserOptions.projectService: true`, which asks TypeScript's type-checking service for each file's type information. The docs state typed linting requires TypeScript to build the project before ESLint lints, that this "takes only seconds" on small projects and longer on large ones, and that most users accept the cost because IDE caching mitigates it. The getting-started page I fetched does **not** enumerate which rules need type info.
https://typescript-eslint.io/getting-started/typed-linting/

**@nuxt/eslint**: all-in-one ESLint integration for Nuxt; generates a project-aware `eslint.config.mjs` at the root via `withNuxt()`; installed with `npx nuxi module add eslint`. Options include `stylistic`, `standalone`, `autoInit`, `checker` (run ESLint alongside the dev server), `configType`. It exposes a chainable `FlatConfigComposer`.
https://eslint.nuxt.com/packages/module

> ⛔ **SUPERSEDED — this paragraph is false.** See the corrections banner at the top of this file.
> #499 was closed by a feature in `@nuxt/eslint` v1.4.0; use `eslint.config.typescript.tsconfigPath`.

**@nuxt/eslint does not enable type-aware rules.** Issue #499 ("Enabling typescript-eslint typed linting") asked for `recommended-type-checked`/`strict-type-checked`; it is closed without resolution, the stated blocker is the performance hit, and there is no maintainer-endorsed workaround. `@nuxt/eslint-config`'s documented `features` are `tooling` (unicorn/regexp/jsdoc, marked experimental) and `stylistic` — nothing type-aware.
https://github.com/nuxt/eslint/issues/499 · https://eslint.nuxt.com/packages/config

> ⛔ **SUPERSEDED.** An official mechanism exists; no hand-append is needed.

This is the single most important finding in this section: **if you want `no-floating-promises` in a Nuxt project, you have to append a typed-linting config block onto the `withNuxt()` composer yourself.** `withNuxt()` returns a composer, so appending is supported in principle; I did not find an official documented recipe for the exact append, so treat the mechanism as "supported, undocumented for this case" and expect to iterate.

Nuxt's own code-style guide says the recommended approach is to enable ESLint via the `@nuxt/eslint` module.
https://nuxt.com/docs/4.x/guide/concepts/code-style

### Content-farm claims (unverified, flagged)

ESLint 10 flat-config-only as of Feb 2026; Biome 2.x added type-aware rules; Oxlint added type-aware linting via tsgo and multi-file analysis; speed multipliers. Sources: tech-insider.org, jsmanifest.com, pkgpulse.com, trybuildpilot.com — all low-trust, all making near-identical claims, which is a sign of copying rather than corroboration.

### Rules that actually catch agent-authored bugs

Ranked by my judgement of what agents get wrong, not by a source:

1. `@typescript-eslint/no-floating-promises` — **type-aware**. Agents drop `await` constantly, especially around Pinia actions and AI SDK calls. This is the highest-value rule in the entire list and it is the one Nuxt's default config cannot give you.
2. `@typescript-eslint/switch-exhaustiveness-check` — **type-aware**. Pairs directly with your Zod discriminated unions; catches the case where an agent adds a variant to the union and forgets a branch.
3. `@typescript-eslint/no-misused-promises` — **type-aware**. Passing an async fn where a void-returning one is expected.
4. `@typescript-eslint/consistent-type-imports` — not type-aware; cheap; keeps `import type` clean, which matters for Nuxt's build and for avoiding accidental runtime imports of server-only modules into the client bundle.
5. `@typescript-eslint/no-explicit-any` and `no-unsafe-*` (type-aware) — agents reach for `any` to make an error go away. `strictTypeChecked` includes these.

Note the pattern: **the rules worth having are exactly the type-aware ones**. ~~and type-aware is exactly what the Nuxt integration doesn't ship~~ — ⛔ the second half is false; the integration does ship it (see banner). The rule list itself stands, and `switch-exhaustiveness-check` still has to be added by hand.

### Verdict

- **First hour:** `npx nuxi module add eslint`. It generates the config, wires the dev-server checker, and understands Nuxt's auto-imports (a real problem for generic linters — undeclared globals everywhere).
- ⛔ **SUPERSEDED — First hour, +30 min:** enable typed linting via `eslint.config.typescript.tsconfigPath` in `nuxt.config`, then `.override('nuxt/typescript/rules', { rules: ... })`. Add `switch-exhaustiveness-check` yourself; `no-floating-promises` and `no-misused-promises` come with the type-checked preset. On a prototype the type-aware cost is seconds, per typescript-eslint's own guidance. Do it now, while fixing the initial violations is trivial. *(Original text claimed a hand-append onto the `withNuxt()` composer was required — it is not.)*
- **Overkill here:** switching to Biome or Oxlint. You lose `@nuxt/eslint`'s Nuxt-awareness and `vue-eslint-parser` handling of SFCs, and you'd be trading a documented integration for unverified speed claims on a codebase that is currently zero files. Speed is not your bottleneck; correctness is. Revisit if lint ever exceeds ~10s.
- **Formatting:** enable `@nuxt/eslint`'s `stylistic` option rather than adding Prettier. One tool, one config, no ESLint/Prettier conflict layer. (This is a judgement call, not a sourced claim.)

---

## 3. Git hooks and pre-commit

I found **no primary-source comparison**. Everything on husky vs lefthook in 2026 is blog content. `simple-git-hooks` did not appear in 2026 results at all — I searched for it explicitly and got nothing, which is weak evidence of low mindshare but is not evidence of abandonment.

The consistently-repeated blog claims (treat as directional, not fact): lefthook is a single Go binary configured by one YAML file, runs hooks in parallel by default, and subsumes lint-staged's staged-file filtering via glob patterns, so it replaces husky + lint-staged with one file; husky puts logic in shell scripts under `.husky/` while lint-staged config lives elsewhere, so understanding a commit requires reading two places. Husky remains far more widely installed.
https://www.pkgpulse.com/guides/husky-vs-lefthook-vs-lint-staged-git-hooks-nodejs-2026 · https://www.andymadge.com/2026/03/10/git-hooks-comparison/ · https://zenn.dev/kimuson/articles/husky_to_lefthook?locale=en

### Verdict

- **First hour:** lefthook, one `lefthook.yml`, pre-commit runs lint + format on staged files only. The "one file describes what happens on commit" property matters more than usual here, because an agent reading your repo can understand the gate from a single file. Two files with cross-references is exactly the kind of thing agents half-read.
- **Important design point regardless of tool:** put *fast* checks in pre-commit (lint, format) and *slow* checks in pre-push (`tsc --noEmit`, `vitest run`, `depcruise`). A pre-commit hook that takes 40 seconds gets bypassed with `--no-verify`, and an agent will bypass it, and then you have a gate that exists only on paper.
- **Overkill here:** nothing much; hooks are cheap. But do not treat hooks as the *primary* gate — they're local-only and skippable. CI is the real gate; hooks are a fast-feedback convenience.

---

## 4. Claude Code hooks

Primary source: https://code.claude.com/docs/en/hooks (and https://code.claude.com/docs/en/memory for the memory-vs-hooks distinction).

### Events

The docs list 27 events. Grouped:

- **Session:** `SessionStart`, `SessionEnd`, `Setup`
- **Per-turn:** `UserPromptSubmit` (can block), `UserPromptExpansion` (can block), `Stop` (can block), `StopFailure`
- **Tool loop:** `PreToolUse` (can block), `PermissionRequest`, `PermissionDenied`, `PostToolUse` (cannot block), `PostToolUseFailure`, `PostToolBatch` (can block)
- **Files/dirs:** `FileChanged`, `CwdChanged`, `DirectoryAdded`, `WorktreeCreate` (can block), `WorktreeRemove`
- **Agents/tasks:** `SubagentStart`, `SubagentStop` (can block), `TeammateIdle` (can block), `TaskCreated` (can block), `TaskCompleted` (can block)
- **Config/context:** `ConfigChange` (can block), `InstructionsLoaded`
- **Display/MCP:** `MessageDisplay`, `Notification`, `Elicitation` (can block), `ElicitationResult` (can block), `PreCompact` (can block), `PostCompact`

### Contract

Exit 0 = success; stdout parsed as JSON if it starts with `{`, else plain text. For most events stdout goes to the debug log, but for `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart` stdout is shown to Claude. Exit 2 = blocking error; blocks on events that can block, and a JSON `permissionDecision: "allow"` **cannot** override exit 2. Other non-zero exit codes are non-blocking errors — the action proceeds (exception: `WorktreeCreate` fails on any non-zero exit).

JSON on stdout supports `continue`, `systemMessage`, `additionalContext`, `terminalSequence`, and `hookSpecificOutput` (with `hookEventName` plus event-specific decision fields — for tool events, `permissionDecision` of `"allow" | "deny" | "ask"` and `permissionDecisionReason`).

Hook types include `command`, `http`, `mcp_tool`, `prompt`, and `agent`. Default timeouts: 600s for command/http/mcp_tool, 30s for `UserPromptSubmit` context and `prompt` hooks, 10s for `MessageDisplay`, 60s for `agent` hooks, and a 1.5s shared budget for `SessionEnd`. Hooks merge across scopes (managed policy → user → project `.claude/settings.json` → `.claude/settings.local.json` → plugin → skill/subagent frontmatter) rather than replacing.

### Documented pitfalls

- **A timed-out hook does not block.** The docs say explicitly: don't rely on stalled hooks to enforce policy. A hook is not a security boundary if it can hang.
- Assuming exit 1 blocks. Only exit 2 does.
- Mixing exit codes and JSON decisions — pick one.
- `PermissionRequest` ignores exit 2; use the `decision` object.
- Shell profile output can corrupt the JSON on stdout.
- Output strings are capped at 10,000 characters.
- Invalid JSON on exit 0 = non-blocking error, action proceeds.
- Project-settings hooks run only after workspace trust is accepted; user-settings hooks always run.

### What they're genuinely good for here

The memory docs draw the line precisely: CLAUDE.md is *context*, not enforced configuration — "To block an action regardless of what Claude decides, use a PreToolUse hook instead," and "If the instruction is something that must run at a specific point, such as before every commit or after each file edit, write it as a hook."
https://code.claude.com/docs/en/memory

Concretely, for this project:
1. **`PostToolUse` on `Edit|Write`** → run ESLint `--fix` and `tsc --noEmit` on the touched file, exit 2 with the errors on stderr so Claude sees and fixes them immediately rather than at commit time. This is the highest-leverage hook for agent-written code: it collapses the feedback loop from "end of task" to "per edit."
2. **`Stop`** → run the full gate (typecheck, tests, depcruise) and block if red. Stops the "I'm done!" claim on a broken tree.
3. **`PreToolUse` on `Bash`** → deny the specific things you never want (e.g. `--no-verify`, `git push --force`, writes to `.env`).

Note `PostToolUse` **cannot block** — the edit already happened. Exit 2 there shows stderr to Claude as feedback, which is what you want; it doesn't prevent the write.

### Verdict

- **First hour:** the `PostToolUse` lint/typecheck-on-edit hook. Single highest-value item in this whole report for your stated goal. ~20 lines of shell.
- **First hour:** a `Stop` hook running the full check. Cheap, and it's the mechanical answer to agents declaring victory early.
- **Worth it at scale:** `PreToolUse` deny-lists, `SubagentStop` gates, `PostToolBatch`.
- **Overkill here:** `http`/`mcp_tool` hook types, `SessionStart` context injection, anything touching the 27-event long tail.

---

## 5. Agent instruction files

### Primary-source facts

**AGENTS.md** is "a simple, open format for guiding coding agents," described as "a README for agents," and is **stewarded by the Agentic AI Foundation under the Linux Foundation**. It claims use by "over 60k open-source projects" and lists 25+ supporting tools. The spec is deliberately thin: "AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide." There are **no required fields**. Recommended (not mandated) sections: project overview, build and test commands, code style guidelines, testing instructions, security considerations. For monorepos, nest one per package — "agents automatically read the nearest file in the directory tree, so the closest one takes precedence."
https://agents.md/

**Claude Code reads `CLAUDE.md`, not `AGENTS.md`.** The official recommendation, verbatim from the docs, is to create a `CLAUDE.md` that imports it:

```markdown
@AGENTS.md

## Claude Code
Use plan mode for changes under `src/billing/`.
```

A symlink (`ln -s AGENTS.md CLAUDE.md`) also works if you don't need Claude-specific content. On Windows use the import, since symlinks need Administrator or Developer Mode. `/init` reads Cursor and Copilot rules; with `CLAUDE_CODE_NEW_INIT=1` it also reads `AGENTS.md`, `.devin/rules/`, `.windsurf/rules/`, `.clinerules`. `/import` brings another agent's config over wholesale (needs v2.1.213+).
https://code.claude.com/docs/en/memory

**What makes them followed vs ignored** — the docs are unusually direct about this:
- CLAUDE.md "content is delivered as a user message after the system prompt, not as part of the system prompt itself... there's no guarantee of strict compliance, especially for vague or conflicting instructions."
- **Target under 200 lines.** "Longer files consume more context and reduce adherence."
- Be specific enough to verify: "Use 2-space indentation" beats "Format code properly"; "Run `npm test` before committing" beats "Test your changes"; "API handlers live in `src/api/handlers/`" beats "Keep files organized."
- Contradictions are fatal: "If two rules contradict each other, Claude may pick one arbitrarily."
- `/doctor` proposes trims: it cuts what Claude can derive from the codebase (directory layouts, dependency lists, architecture overviews) and keeps pitfalls, rationale, and conventions that differ from tool defaults. Requires v2.1.206+.
- HTML comments are stripped before injection — free space for human-maintainer notes.

**What belongs where** (from the docs' own routing):
- **CLAUDE.md**: facts needed every session — build commands, conventions, project layout, "always do X".
- **`.claude/rules/*.md`**: topic files; with `paths:` frontmatter they load only when Claude touches matching files. Rules without `paths` load at launch with the same priority as `.claude/CLAUDE.md`.
- **Skill**: "a multi-step procedure" or something that "only matters for one part of the codebase" — loads on demand, not every session.
- **Hook**: anything that "must run at a specific point," or must hold regardless of what Claude decides.

Note the subtlety: `@import` helps *organisation* but not context budget — "imported files still load and enter the context window at launch." Only path-scoped rules and skills actually defer loading.

### Verdict

- **First hour:** write `AGENTS.md` (~60–100 lines: stack, commands, layout, the three or four conventions that differ from defaults), then a two-line `CLAUDE.md` that does `@AGENTS.md` plus any Claude-specific note. This is the convergent pattern and it costs nothing. Do **not** duplicate content across the two files — that's the contradiction failure mode.
- **First hour:** put your architecture constraint ("domain layer imports no framework code") in AGENTS.md *and* enforce it in dependency-cruiser. The file explains the rule; the verifier enforces it. Neither substitutes for the other.
- **Worth it at scale:** `.claude/rules/` with `paths:` frontmatter, once you have distinct conventions per area (server routes vs Pinia stores vs domain).
- **Overkill here:** a large CLAUDE.md. Everything you'd write about directory layout and dependencies is derivable from the code and will be cut by `/doctor` anyway. Write the non-obvious things only.

---

## 6. Type-level and schema enforcement

### Primary-source facts

**Zod 4 is stable.** Zero external dependencies, 2kb core bundle gzipped (site headline) / core bundle down from 12.47kb to 5.36kb (announcement), immutable API. Reported gains: 14.7x faster string parsing, 7.4x array, 6.5x object, and — most relevant to you — **"100x reduction in `tsc` instantiations"** when chaining `.extend()`/`.omit()`. `zod/mini` is a tree-shakable functional variant at ~1.88kb gzipped.
https://zod.dev/ · https://zod.dev/v4

**`z.discriminatedUnion`**: uses a discriminator key to narrow directly, versus regular unions which "are *naive* — they check the input against each option in order and return the first one that passes." In v4, discriminated unions accept unions and pipes as discriminators, and **they compose** (nested discriminated unions work).
https://zod.dev/api?id=branded-types · https://zod.dev/v4

Note: `discriminatedUnion` gives you a runtime-narrowing schema and an inferred TS discriminated union. It does **not** by itself give you exhaustiveness checking at call sites — that comes from `switch` + a `never` assertion in the default branch, or from `@typescript-eslint/switch-exhaustiveness-check` (see §2). This is the pairing that matters: Zod defines the union once, the lint rule catches every place you forgot a branch when you add a variant. That combination is the concrete mechanism behind "illegal states unrepresentable" for an agent-written codebase.

**`.brand()`**: "attaches a 'brand' to the schema's inferred type" so that "plain (unbranded) data structures are not assignable to the inferred type. You have to parse some data with the schema to get branded data." Explicitly documented as **static-only**: "branded types do not affect the runtime result of `.parse`."
https://zod.dev/api?id=branded-types

This is exactly what you want for ids. `UserId` and `OrderId` both being `string` is the single most common silent bug an agent introduces, because it's structurally valid and reads fine. Branding makes it a compile error. Cost: one `.brand<"UserId">()` per id schema, plus friction at boundaries where you must parse rather than cast.

**Other v4 items relevant here**: unified `error` param replacing `message`/`invalid_type_error`/`errorMap`; `z.toJSONSchema()` (useful if you feed schemas to Anthropic tool definitions); recursive object types via getters without casting; template literal types; a metadata registry.

**`satisfies`**: no source fetched — it's a standard TS operator, not a library. Worth a line in AGENTS.md ("prefer `satisfies` over type annotation for config objects, to keep literal inference") but there is nothing to install.

**ts-reset** (`@total-typescript/ts-reset`): a "CSS reset for TypeScript" improving built-in typings (`.filter(Boolean)` narrowing, `JSON.parse` returning `unknown`, `.includes()` on readonly arrays). npm shows 108 dependent projects; issues opened as recently as May 2026, so not abandoned, but I found **no maintainer statement about 2026 maintenance commitment** and the dependent count is modest.
https://github.com/total-typescript/ts-reset · https://www.totaltypescript.com/ts-reset

Honest read: it's low-risk (types only, no runtime) but it also globally changes the meaning of standard-library signatures, which is a *surprising* thing for an agent to encounter. An agent that has read your `tsconfig` won't necessarily connect "why does `JSON.parse` return `unknown` here" to a reset package.

### Verdict

- **First hour:** `tsconfig` strictness first — `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Zero install cost, and `noUncheckedIndexedAccess` in particular catches a class of agent bug (assuming `arr[0]` exists) that nothing else will. (This is my recommendation, not a fetched claim.)
- **First hour:** Zod 4 with `z.discriminatedUnion` for your domain states, *paired with* `switch-exhaustiveness-check`. The pairing is the point.
- **First hour, if ids are load-bearing:** `.brand()` on id schemas. Cheap, static-only, and directly serves your core claim.
- **Worth it at scale:** `z.toJSONSchema()` for Anthropic tool definitions, so schema and tool contract cannot drift.
- **Overkill here:** `zod/mini` (bundle size is not your problem on a prototype), a hand-rolled nominal-type utility (Zod's `.brand()` already does it).
- **Judgement call:** ts-reset. Real value, small maintenance base, and it adds a layer of "why does the standard library behave oddly" that agents must be told about. If you adopt it, say so explicitly in AGENTS.md.

---

## 7. Testing and CI gates

### Primary-source facts

**Vitest coverage thresholds**: `thresholds` supports `lines`, `functions`, `branches`, `statements`; plus `perFile` (default `false`), `autoUpdate` (boolean or a formatting function — rewrites thresholds upward as coverage improves), a `100` shortcut that sets all global thresholds to 100, and glob-based thresholds with per-pattern inheritance rules. Providers: `v8` (**default**), `istanbul`, `custom`. Thresholds are unavailable on `custom`.
https://vitest.dev/config/coverage

The `autoUpdate` option is the interesting one for your situation and is underused: it turns coverage from a fixed bar (which agents game, and which you set arbitrarily) into a ratchet that can only go up. That sidesteps most of the "coverage thresholds are theatre" objection.

**Is a coverage threshold theatre?** Honestly: mostly yes as a *number*, no as a *ratchet*. A global `80` gate tells you nothing about whether the right things are tested and is trivially satisfied by an agent writing assertion-free tests that merely execute code. `thresholds: { autoUpdate: true }` plus `perFile: true` is meaningfully harder to game and costs one config line. I found no primary source arguing either side; this is my assessment, flagged as such.

**LLM evals in CI** — all sources here are blogs, flagged accordingly. The recurring advice: run evals on PRs only, with a paths filter and `concurrency.cancel-in-progress`, not on every commit, because every-commit runs blow the judge token budget and train the team to ignore red builds. Use a tiered structure — layer 1 deterministic (JSON schema validation, regex assertions, format checks, zero token cost), layer 2 heuristic, layer 3 LLM-as-judge for subjective dimensions. Run a small fast smoke eval on PRs. One source claims 100 eval cases for under £0.10 in an optimised setup. For flakiness: establish a rolling baseline (e.g. 7-day JSON committed to git) so you can distinguish noise from regression, rather than treating each run standalone. Braintrust ships a `braintrustdata/eval-action` GitHub Action that runs evals per PR and posts results as comments.
https://futureagi.com/blog/ci-cd-llm-eval-github-actions-2026/ · https://www.braintrust.dev/articles/best-ai-evals-tools-cicd-2025 · https://dev.to/hadleyworks/llm-evaluation-in-ci-stop-manual-testing-before-it-costs-you-59i7

The layer-1 advice is the durable part and it doesn't need a vendor: **validate every LLM response against a Zod schema at runtime and assert on that in tests.** That's deterministic, free, and catches the majority of "the model returned something structurally wrong" failures. It is also the thing your Zod-centric design already gives you.

### Verdict

- **First hour:** a single GitHub Actions workflow on push + PR running, in order: `tsc --noEmit` → `eslint` → `vitest run` → `depcruise` → `knip`. One file, ~30 lines. Fail fast; the typecheck is the cheapest and catches the most.
- **First hour:** coverage on, `provider: 'v8'` (the default, no install of istanbul needed), **but do not set a number yet**. Set `thresholds: { autoUpdate: true }` once you have a handful of real tests, so it ratchets.
- **Worth it at scale:** `perFile: true`; glob thresholds that hold the domain layer to a high bar and leave UI glue loose. That's the version of coverage gating that isn't theatre — it says "the part where correctness lives must be tested" rather than "the average must be 80."
- **Overkill here:** LLM evals as a *blocking* CI gate on a prototype. Cost and flakiness are real and the value is low until you have prompts stable enough to regress against. Instead: assert Zod-schema conformance on model output in ordinary Vitest tests with recorded fixtures, and keep any judge-based eval as a manually-triggered workflow.
- **Also overkill:** a matrix build, multiple Node versions, or a separate lint job. One job, one Node version, cached pnpm store.

---

## 8. Observability for agent-built code

### Primary-source facts

**Vercel AI SDK has first-class OpenTelemetry support.** Setup: install and register `@ai-sdk/otel` at application startup; telemetry is then **on by default** for all AI SDK calls, opt-out per call via `telemetry: { isEnabled: false }`. Spans follow the OpenTelemetry GenAI semantic conventions, with three span types for text generation: `invoke_agent` (root, covers the whole operation including all steps and tool calls), `chat` (one per LLM provider call), `execute_tool` (one per tool execution). Recorded attributes include model id, provider name, temperature, token limits, input/output messages, finish reasons, and token usage — explicitly `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens` plus cache-related token counts. **Cost is not calculated** — token counts only. Per-call metadata can be attached.
https://ai-sdk.dev/docs/ai-sdk-core/telemetry

This is a genuinely low-burden win: one package, one registration, and you get structured traces of every model call including tool executions.

**OpenTelemetry GenAI semantic conventions have moved** out of the main semantic-conventions repo into a dedicated repo, covering "spans, metrics, and events for GenAI clients, MCP (Model Context Protocol), and provider-specific conventions (OpenAI, etc.)", built with Weaver. The repo is clearly **still in flux** — the Schema URL section is marked TODO, and there are 137 open issues / 49 open PRs. I could **not** establish a formal stability level (experimental vs stable) for the conventions as of August 2026; the old docs URL is now just a redirect notice.
https://opentelemetry.io/docs/specs/semconv/gen-ai/ · https://github.com/open-telemetry/semantic-conventions-genai

Practical implication: the *attribute names* may still shift under you. Don't build dashboards or alerts that hard-code `gen_ai.*` attribute names and expect them to survive a year. The AI SDK's own span structure is the more stable interface.

**Cost tracking**: I found no primary source giving a current approach. The AI SDK records tokens but not cost, so cost = tokens × your own price table, maintained by you. **Unverified / not researched**: Langfuse, Helicone, Braintrust as cost-tracking layers — I did not fetch any of them and will not characterise them.

### Verdict

- **First hour:** register `@ai-sdk/otel` and point it at a console/stdout exporter. Ten minutes, and you immediately get per-call token counts, which is the thing you will actually want on day three when a loop burns your budget.
- **First hour:** log every model call's input schema, output, and Zod parse result. This is not observability tooling, it's a five-line wrapper, and for an agent-built prototype it catches more than a tracing backend will.
- **Worth it at scale:** a real OTel backend (collector + Jaeger/Grafana or a hosted vendor), cost attribution via a token-price table, tail sampling.
- **Overkill here:** standing up an OTel Collector, adopting a hosted LLM-observability vendor, or building anything against `gen_ai.*` attribute names while the conventions repo is still marked TODO.

---

## Consolidated recommendation

**Do in the first hour (~90 minutes total):**
1. `npx nuxi module add eslint` + append a typed-linting block with `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`.
2. `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
3. `depcruise --init`; add a no-circular rule at error severity and a domain-no-framework rule.
4. `knip` with default config.
5. Claude Code `PostToolUse` hook on `Edit|Write`: lint + typecheck the touched file, exit 2 with errors on stderr.
6. Claude Code `Stop` hook: full check, block if red.
7. `AGENTS.md` (~80 lines) + two-line `CLAUDE.md` importing it.
8. One GitHub Actions workflow: typecheck → lint → test → depcruise → knip.
9. `@ai-sdk/otel` registered with a console exporter.
10. lefthook: pre-commit lint/format, pre-push typecheck/test.

**Worth it once the shape stabilises:** eslint-plugin-boundaries; `.claude/rules/` with `paths:` frontmatter; Vitest glob coverage thresholds holding the domain layer high; `z.toJSONSchema()` for tool definitions; a real OTel backend.

**Overkill for this project:** Biome/Oxlint migration, Sheriff, ts-arch/ArchUnitTS, madge (redundant with depcruise), blocking LLM evals in CI, an OTel Collector, a hosted eval vendor, a large CLAUDE.md.

**The one non-obvious finding to act on:** ⛔ **RETRACTED — this was wrong.** `@nuxt/eslint` *does*
enable type-aware rules as of v1.4.0; #499 was closed by a feature. See the corrections banner.

Replacing it, the finding that actually holds: **put domain code in `shared/domain/**`** — Nuxt 4
documents that `shared/` cannot import Vue or Nitro code, so the architecture rule you most want to
enforce is one the framework already states, and dependency-cruiser is enforcing a contract rather
than a preference.

## What I could not verify

- ESLint 10's release date and flat-config-only status (searched; only content-farm sources; did not fetch eslint.org).
- Any linter benchmark number. All from SEO sites with no methodology.
- Whether Sheriff detects import cycles (repo README section fetched did not say).
- Current versions of dependency-cruiser, knip, sheriff, lefthook, madge, ts-reset — deliberately omitted rather than guessed.
- `simple-git-hooks` current status — searched explicitly, zero 2026 results.
- Formal stability level of the OTel GenAI semantic conventions (repo shows TODO for Schema URL; no stability declaration found).
- Any cost-tracking tooling for LLM apps — not researched; no claims made.
- ~~An officially documented recipe for appending typescript-eslint typeChecked configs onto `withNuxt()`.~~ ⛔ **Resolved, and the premise was wrong** — no append is needed; `eslint.config.typescript.tsconfigPath` is the supported option. The failure here was reading the issue's closed-state as abandonment without checking whether a commit referenced it.
