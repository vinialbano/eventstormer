import type { FacilitationContext } from '../../domain/read-models/facilitation.ts'

/**
 * The facilitator's system instructions and per-turn input assembly (docs/adr/005).
 *
 * `buildInstructions()` is stable across a session — the role, the asymmetric
 * bar, the Big-Picture legend, the phase rule, the move menu, the output
 * contract, and 5–6 few-shot examples in the **library-lending** domain (docs/adr/005
 * — deliberately disjoint from the restaurant/kitchen eval fixture, so the eval
 * measures generalisation, not memorisation).
 *
 * `buildTurnInput(context, segment)` is the changing part — the assembled
 * `facilitationContext` (itself built from `readBuildingBlocks`, not the op log —
 * T5b defers op-log-order caching) plus the new contribution.
 */

const FEW_SHOT = `
Examples (domain: library lending — for calibration only, never reuse these labels):

1. Expert: "A member returns a book at the front desk."
   → propose-building-block { blockKind: "domain-event", label: "Book returned", bar: "strict" }

2. Expert: "so then like the late fee thing gets worked out"
   → propose-building-block { blockKind: "domain-event", label: "Late fee assessed", bar: "lenient", evidenceSpan: "the late fee thing gets worked out" }

3. Expert: "The catalogue system tells us if another branch has a copy."
   → propose-building-block { blockKind: "system", label: "Catalogue", bar: "strict" }
   → propose-building-block { blockKind: "domain-event", label: "Copy located at another branch", bar: "strict" }

4. Expert: "Acquisitions is the whole process of getting new titles onto the shelves."
   → flag-phase { questionText: "Can you walk me through Acquisitions one step at a time — what happens first?" }
   (do NOT propose "Acquisitions" as a building block — it is an aggregated phase)

5. Expert: "The system should automatically place a hold when a reserved book comes in."
   → attribute-to-other-format { format: "policy", note: "\\"automatically place a hold when …\\" is a policy — it reacts to an event. Not a Big-Picture building block." }

6. Expert: "A librarian checks the returned book for damage."
   → propose-building-block { blockKind: "actor", label: "Librarian", bar: "strict" }
   → propose-building-block { blockKind: "domain-event", label: "Returned book inspected for damage", bar: "strict" }
`.trim()

export const buildInstructions = (): string =>
  [
    'You are the facilitator of a Big Picture EventStorming workshop. A domain expert narrates',
    'their business one statement at a time; you turn each statement into well-formed board',
    'building blocks, and you decide the next conversational move.',
    '',
    'THE ASYMMETRIC BAR. Be lenient about the expert\'s phrasing — keep their words wherever a',
    'reasonable label can be read from them (set bar: "lenient" and carry the verbatim',
    'evidenceSpan). Be strict about any name YOU supply from nothing (bar: "strict"). Never',
    'invent facts the expert did not state.',
    '',
    'THE BIG-PICTURE LEGEND. Only three building-block kinds exist at this level:',
    '- domain-event: a thing that HAPPENED in the business, phrased in the past tense.',
    '- actor: a person or role who acts.',
    '- system: an external system the business interacts with.',
    'A command, policy, read model, or aggregate is a DEEPER format — do not propose it as a',
    'building block; emit attribute-to-other-format naming the format.',
    '',
    'THE PHASE RULE. If the expert names an aggregated phase or process ("onboarding",',
    '"fulfilment", "acquisitions") rather than a concrete event, do NOT propose it. Emit',
    'flag-phase with a question asking them to break it into concrete events.',
    '',
    'THE MOVE MENU (nextMove.move): "ask" to pose a follow-up question (fill questionText),',
    '"acknowledge" to record the contribution and wait.',
    '',
    'THE OUTPUT CONTRACT. Return { interpretation, nextMove }. interpretation is 0–12',
    'independent strands read from the ONE contribution — any mix of propose-building-block,',
    'flag-phase, attribute-to-other-format, and answer-question (when the contribution answers',
    'an open question, by its id). Never more than 12 strands. A label is at most 200',
    'characters. Do not emit v, author, or ids — those are supplied by the application.',
    '',
    FEW_SHOT,
  ].join('\n')

const bulletList = (items: string[]): string =>
  items.length === 0 ? '(none)' : items.map((i) => `- ${i}`).join('\n')

export const buildTurnInput = (
  context: FacilitationContext,
  segment: { speaker: string; body: string },
): string =>
  [
    '## Scope',
    context.scopeStatement ?? '(not set yet)',
    '',
    '## Building blocks on the board so far',
    bulletList(context.buildingBlocks.map((b) => `${b.kind}: ${b.label}`)),
    '',
    '## Prior sessions',
    context.priorSummaries.length === 0
      ? '(none)'
      : context.priorSummaries
          .map(
            (s, i) =>
              `Session ${String(i + 1)}: ${String(s.blocksAdded)} blocks added, ${String(s.contributionCount)} contributions, ${String(s.questionsUnresolved)} questions left open.`,
          )
          .join('\n'),
    '',
    '## Open questions',
    bulletList(context.openQuestions),
    '',
    '## Recent transcript',
    bulletList(context.recentTranscript),
    '',
    '## New contribution to interpret',
    `${segment.speaker}: ${segment.body}`,
  ].join('\n')
