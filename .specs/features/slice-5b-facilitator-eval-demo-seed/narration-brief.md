# Narration brief — Slice 5b prerequisite (maintainer-owned)

**Status 2026-09-08: DONE.** `transcript.md` is delivered and covers every beat below. The
recorded video is **dropped from scope** (no code dependency — see `spec.md` Scope note). This
file is kept as the record of what the transcript was built to exercise.

Original ask — one deliverable:

| File | What | Feeds |
| --- | --- | --- |
| `transcript.md` | Verbatim transcript, split into numbered turns | `pnpm seed` session + every eval fixture's `scopeStatement` / `contribution` body |

---

## 1. Record it (≈ 3–4 minutes, one take, no script)

- **You are the domain expert**, not a facilitator. Speak in first person about how the
  business works: "so what happens is…", "we…", "the kitchen…".
- **Domain: a restaurant dinner order** — from the table to the guest, kitchen side.
  (Fixed by ADR-008: fast to narrate cold, natural branches, real hot spots.)
- **Cold and natural.** Don't read the beat sheet below aloud. Talk the way you would to a
  colleague. Filler ("like", "honestly", "basically") and **self-corrections are wanted** —
  they're what the eval measures.
- **Pause clearly between thoughts.** Each pause = one "turn" = one contribution in the seed
  and potentially one eval fixture. Aim for ~12–16 turns.
- **Open by answering the scope question** ("what business are we mapping?"). Your first
  sentence is the workshop scope, e.g. *"We're mapping how a dinner order gets from the
  table to the guest — the kitchen side of it."*
- **Do not borrow library / lending / catalogue language** — that's the facilitator's
  built-in calibration domain and overlap contaminates the eval.

### Beat sheet — hit each of these once, in roughly this order

Each beat exists to exercise one facilitator behaviour the eval needs a fixture for. Phrase
them your own way; the **bracketed note is the behaviour, don't say it**.

1. **Scope.** "We're mapping how a dinner order gets from the table to the guest, kitchen
   side." *[sets scope]*
2. **A clean past-tense event.** "A guest placed their order with the server." *[correct kind
   = domain-event; already past tense]*
3. **A loose-tense event.** "Then it goes into the kitchen — the ticket prints down at the
   line." *[facilitator must rename to past tense: "Ticket printed at the line"]*
4. **Messy phrasing, but a real event.** "and then like the fire thing happens and the line
   cooks get on it." *[recognisable event — must be kept substantially as said, not
   sanitised away]*
5. **A near-miss that is NOT a phase.** "the expo fires the table once it's all up." *["fires"
   is an action, not an aggregated phase — must NOT be flagged as a phase]*
6. **An actual aggregated phase.** "after the food's down we're into service — running
   plates, checking back, refills, all of that." *["service" is a phase — facilitator asks
   you to break it down, proposes nothing]*
7. **A policy / rule (deeper format).** "whenever there's an allergy on the ticket, expo has
   to check every plate against it before anything leaves the pass." *[belongs to a deeper
   format — facilitator names it, proposes no building block]*
8. **An ordering / cause.** "the order has to be in before the kitchen starts cooking — and
   the kitchen only plates once every dish on that ticket is ready." *[relation: a sequence
   / causal link between two events]*
9. **A milestone.** "the moment that actually matters is when the food's delivered to the
   table — everything before that is just prep." *[pivotal mark]*
10. **A self-correction / reword.** "that step I called 'order goes in' — actually call it
    'order placed', that's clearer." *[reword of an earlier label]*
11. **Two things in one breath (integration).** "the server put the order in and the kitchen
    started right away — one straight after the other." *[an event + a relation from a single
    contribution]*
12. **Two things in one breath (integration).** "the guest got their check — and honestly
    'check dropped' is the real end of this, not 'table cleared'." *[an event + a
    pivotal/reword from a single contribution]*
13. **A branch — 86'd item.** "sometimes the kitchen's 86'd a dish, out of it, so the server
    went back to the table and the guest picked something else." *[demo colour + a branch]*
14. **A branch — sent back.** "we had a plate come back once, wrong temp, kitchen re-fired
    it." *[demo colour]*
15. **A hot spot (open question).** "ticket times blow right out when four tables land at
    once — nobody's really cracked the expo bottleneck." *[an unresolved area — a hot spot]*
16. **Wrap.** "and that's it — food delivered, check paid, table turns."

Beats 2–12 are the eval fixtures. Beats 13–16 make the seed board demo-worthy.

---

## 2. Transcribe it → `transcript.md`

Verbatim. Auto-transcribe (Whisper / MacWhisper / otter) then hand-clean, or type it. Keep
the messy wording in beats 3, 4 and 10 exactly as spoken — lightly trim only "um"/"uh" and
false starts that carry no words.

### Format

```markdown
# Seed narration transcript

**Scope statement:** We're mapping how a dinner order gets from the table to the guest — the kitchen side of it.

**Speaker:** <your name / "Sam">

## Turns

1. A guest placed their order with the server.
2. Then it goes into the kitchen — the ticket prints down at the line.
3. and then like the fire thing happens and the line cooks get on it.
4. the expo fires the table once it's all up.
5. after the food's down we're into service — running plates, checking back, refills, all of that.
... (one numbered line per pause, in spoken order)
```

Rules:
- **One numbered turn per pause**, in the order you said them. A turn is 1–3 sentences.
- The **scope statement** goes in its own field (it is workshop state, not a turn).
- Don't merge or reorder turns to "tidy" the flow — the eval and the seed replay them as-is.
- If you fluffed a beat and want a redo, just record again; don't stitch takes.

---

## 3. Also needed for Execute

`ANTHROPIC_API_KEY` reachable by whoever runs Execute — `pnpm eval --report` commits real
`k/N` numbers into the README against the live model (~$1–2 for the run).

---

## Done when

- [ ] `recording.m4a` — one take, ~3–4 min, all 16 beats present, restaurant/kitchen domain,
      opens on the scope answer.
- [ ] `transcript.md` — verbatim, scope statement split out, one numbered turn per pause.
- [ ] API key confirmed available for Execute.
