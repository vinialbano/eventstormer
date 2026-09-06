import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { deserialise } from './deserialise.ts'
import { MODEL_JSON_COLLECTION_CAP, type ModelBlock } from './model-json.ts'
import { serialise } from './serialise.ts'

const partyArb = fc.record({ name: fc.string() })

const blockArb = (id: string): fc.Arbitrary<ModelBlock> =>
  fc
    .record({
      kind: fc.constantFrom('domain-event', 'actor', 'system', 'hot-spot'),
      label: fc.string(),
      withdrawn: fc.boolean(),
      placement: fc.constantFrom('backlog', 'timeline'),
      pivotal: fc.boolean(),
      proposer: fc.option(partyArb, { nil: undefined }),
      accepter: partyArb,
      modelAffecting: fc.option(fc.boolean(), { nil: undefined }),
      annotates: fc.option(fc.string(), { nil: undefined }),
      resolved: fc.option(fc.boolean(), { nil: undefined }),
      reference: fc.option(fc.string(), { nil: undefined }),
    })
    .map((raw): ModelBlock => ({
      id,
      kind: raw.kind,
      label: raw.label,
      withdrawn: raw.withdrawn,
      placement: raw.placement,
      pivotal: raw.pivotal,
      provenance: {
        ...(raw.proposer === undefined ? {} : { proposer: raw.proposer }),
        accepter: raw.accepter,
      },
      ...(raw.modelAffecting === undefined ? {} : { modelAffecting: raw.modelAffecting }),
      ...(raw.annotates === undefined ? {} : { annotates: raw.annotates }),
      ...(raw.resolved === undefined ? {} : { resolved: raw.resolved }),
      ...(raw.reference === undefined ? {} : { reference: raw.reference }),
    }))

const byId = (left: { id: string }, right: { id: string }): number => left.id.localeCompare(right.id)

const pairArb = fc.uniqueArray(
  fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
  { maxLength: 6, selector: (pair) => pair.join('>') },
)

const snapshotAndSourceArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: 8 })
  .chain((ids) =>
    fc.record({
      blocks: fc.tuple(...ids.map((id) => blockArb(id))).map((blocks) => [...blocks].toSorted(byId)),
      follows: pairArb.map((pairs) =>
        pairs
          .map(([predecessor, successor]) => ({ predecessor, successor }))
          .toSorted(
            (left, right) =>
              left.predecessor.localeCompare(right.predecessor) ||
              left.successor.localeCompare(right.successor),
          ),
      ),
      causedBy: pairArb.map((pairs) =>
        pairs
          .map(([cause, effect]) => ({ cause, effect }))
          .toSorted(
            (left, right) =>
              left.cause.localeCompare(right.cause) || left.effect.localeCompare(right.effect),
          ),
      ),
    }),
  )
  .chain((snapshot) =>
    fc.record({
      snapshot: fc.constant(snapshot),
      source: fc.record({
        format: fc.constant('big-picture' as const),
        scope: fc.option(fc.string(), { nil: null }),
        narratorCount: fc.nat({ max: 20 }),
        stakeholderCheck: fc.oneof(
          fc.constant({ run: false as const }),
          fc.record({
            run: fc.constant(true as const),
            complete: fc.boolean(),
            absentNames: fc.array(fc.string()),
          }),
        ),
        chosenProblem: fc.oneof(
          fc.constant({ notRun: true as const }),
          fc.record({
            skipped: fc.constant(true as const),
            reason: fc.constantFrom('none-chosen' as const, 'no-impediments-yet' as const),
          }),
          fc.record({
            chosen: fc.constant(true as const),
            hotSpotId: fc.string(),
            label: fc.string(),
            qualification: fc.constantFrom('firm' as const, 'provisional' as const),
          }),
        ),
      }),
    }),
  )

describe('deserialise', () => {
  it('round-trips deserialise(serialise(x)) back to { snapshot, source }', () => {
    fc.assert(
      fc.property(snapshotAndSourceArb, (value) => {
        const document = serialise({
          ...value,
          boardPosition: 3,
          sessionRecordPosition: 9,
          renderedAt: '2026-09-05T10:00:00.000Z',
        })
        const result = deserialise(document)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ snapshot: value.snapshot, source: value.source })
        }
      }),
    )
  })

  it('rejects a foreign document', () => {
    const result = deserialise({ format: 'openapi', paths: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-model-json')
  })

  it('rejects an oversized document and expands nothing', () => {
    const block: ModelBlock = {
      id: 'e_1',
      kind: 'domain-event',
      label: 'x',
      withdrawn: false,
      placement: 'timeline',
      pivotal: false,
      provenance: { accepter: { name: 'Dana' } },
    }
    const oversized = serialise({
      snapshot: {
        blocks: Array.from({ length: MODEL_JSON_COLLECTION_CAP + 1 }, (_, index) => ({
          ...block,
          id: `e_${String(index)}`,
        })),
        follows: [],
        causedBy: [],
      },
      source: {
        format: 'big-picture',
        scope: null,
        narratorCount: 0,
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
      },
      boardPosition: 0,
      sessionRecordPosition: 0,
      renderedAt: '2026-09-05T10:00:00.000Z',
    })
    const result = deserialise(oversized)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-model-json')
  })
})
