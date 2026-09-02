# Tasks — board wall presentation split

## Gate Check Commands

| Level | Command |
| ----- | ------- |
| quick | `pnpm exec vitest run --project app src/app/capture-loop/board` |
| full | `pnpm check` |

## T1: Shared sticky chrome styles

**Done when:** `sticky-chrome.css` holds base sticky label/who/kind/withdrawn/selected/fresh styles; no duplicate definitions in `BoardWall` or `TimelinePane` yet removed.

**Files:** `board/presentation/sticky-chrome.css`

**Gate:** quick (no test change)

**Commit:** `refactor(board): add shared sticky chrome styles`

## T2: Extract wall chrome and backlog pane

**Done when:** `BoardWallChrome.vue` renders ink/frame/time/tape/markers; `BacklogPane.vue` renders backlog stickies using shared chrome CSS.

**Files:** `BoardWallChrome.vue`, `BacklogPane.vue`, `BoardWall.vue` (wire)

**Gate:** quick

**Commit:** `refactor(board): extract wall chrome and backlog pane`

## T3: Extract action toolbar

**Done when:** `BoardActionToolbar.vue` renders show-withdrawn, cycle error, toolbar actions, timeline reword overlay.

**Files:** `BoardActionToolbar.vue`, `BoardWall.vue`

**Gate:** quick

**Commit:** `refactor(board): extract action toolbar`

## T4: Extract timeline event node

**Done when:** `TimelineEventNode.vue` holds event node markup; `TimelinePane.vue` delegates to it and imports shared sticky CSS.

**Files:** `TimelineEventNode.vue`, `TimelinePane.vue`

**Gate:** quick (`TimelinePane.test.ts` + board tests)

**Commit:** `refactor(board): extract timeline event node`

## T5: Slim wall coordinator + release

**Done when:** `BoardWall.vue` ~150 lines; duplicate sticky styles removed; changeset added; `pnpm check` green.

**Files:** `BoardWall.vue`, `.changeset/*.md`

**Gate:** full

**Commit:** `refactor(board): slim board wall coordinator`
