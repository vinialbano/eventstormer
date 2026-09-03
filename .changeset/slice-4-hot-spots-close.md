---
"eventstormer": minor
---

Hot spots, deliberate resolution, and session close (F08 / F09 / F18).

- **F08 — hot spots.** Both creation routes: the facilitator proposes a hot-spot
  building block through the F05 accept/edit/reject path with a person-editable
  `modelAffecting` kind, or the person flags one directly on a selected block or
  on nothing. Annotated hot spots render as callouts on their block, unannotated
  ones as a list, with a running count. Withdrawing the annotated block cascades
  to its hot spots; withdrawing a hot spot clears its annotation. A `Resolution`
  aggregate makes resolving deliberate — the facilitator proposes a resolution
  with a recorded reference, accepting resolves the hot spot, a second one for
  the same hot spot lapses "already resolved", and a resolved hot spot can be
  reopened. Nothing in the product reads a hot spot's open/resolved state.
- **F09 — stakeholder check and chosen problem.** At close the person says
  whether anyone else would tell this differently (naming absentees creates one
  hot spot each and qualifies the conclusion as provisional) and picks the one
  problem most worth attacking from the currently-open hot spots, or skips with a
  recorded reason. Both are `Workshop` state.
- **F18 — close sweep and summary.** Closing is explicit: every unanswered
  facilitator question and every named absent stakeholder becomes exactly one
  hot spot, apply-failed proposals lapse with a hot spot, other non-terminal
  proposals lapse quietly, and the facilitation summary is a stable read-time
  projection over the now-terminal stream. A model with no hot spots is reported
  as a signal to interpret, not a pass or a failure. The whole ceremony runs as
  facilitator turns in the capture dock; the session stays open until the final
  confirm.

`GET /board` and `readArtifactSource` now carry the hot-spot and chosen-problem
data Slice 5's summary and exports consume.
