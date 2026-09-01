import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import { Operation, type OperationKind } from '../schema/index.ts'
import { decide } from './decide.ts'
import { evolve } from './evolve.ts'
import { type BoardWriteModel, emptyWriteModel, type BuildingBlockKind } from './model.ts'

const bid = (value: string): BuildingBlockId => value as BuildingBlockId

const author = { accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })

/** Given(prior operations): fold them into the write model (ADR-008 style). */
const given = (priors: Record<string, unknown>[]): BoardWriteModel =>
  priors.reduce((writeModel, raw) => evolve(writeModel, op(raw)), emptyWriteModel())

const NOT_IMPLEMENTED: OperationKind[] = [
  'raise-hot-spot',
  'sequence',
  'unsequence',
  'insert-between',
  'link-cause',
  'unlink-cause',
  'annotate',
  'unannotate',
  'mark-pivotal',
  'unmark-pivotal',
  'resolve',
  'reopen',
]

describe('decide — capture', () => {
  it('emits the capture operation for each kind-specific variant', () => {
    for (const kind of ['capture-domain-event', 'identify-actor', 'identify-system'] as const) {
      const result = decide(emptyWriteModel(), op({ kind, id: 'b1', label: 'order placed' }))
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(1)
        expect(result.value[0]).toMatchObject({ kind, id: 'b1', label: 'order placed' })
      }
    }
  })

  it('rejects a duplicate id (systemic, no-op)', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'capture-domain-event', id: 'e1', label: 'again' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'duplicate-id', classification: 'systemic', id: 'e1' })
    }
  })
})

describe('decide — reword', () => {
  it('rewords a present target', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'reword', target: 'e1', label: 'order was placed' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value[0]).toMatchObject({ kind: 'reword', target: 'e1' })
  })

  it('rejects a reword of an unknown target (systemic, no-op)', () => {
    const result = decide(emptyWriteModel(), op({ kind: 'reword', target: 'e9', label: 'x' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'unknown-target',
        classification: 'systemic',
        target: 'e9',
      })
    }
  })

  it('rejects a whitespace-only label — the schema catches an empty string first', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'reword', target: 'e1', label: '   ' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'empty-label',
        classification: 'systemic',
        target: 'e1',
      })
    }
  })

  it('does not dedupe — two blocks may share a label', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'same' },
      { kind: 'capture-domain-event', id: 'e2', label: 'same' },
    ])
    expect(isOk(decide(writeModel, op({ kind: 'reword', target: 'e1', label: 'same' })))).toBe(true)
  })

  it('rejects a reword of a withdrawn target', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'order placed' },
      { kind: 'withdraw', target: 'e1' },
    ])
    const result = decide(writeModel, op({ kind: 'reword', target: 'e1', label: 'order was placed' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'withdrawn-target',
        classification: 'systemic',
        target: 'e1',
      })
    }
  })
})

describe('decide — withdraw / reinstate', () => {
  it('withdraws a present target', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    expect(isOk(decide(writeModel, op({ kind: 'withdraw', target: 'e1' })))).toBe(true)
  })

  it('withdraws a present event with no edges as a single withdraw', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'order placed' }])
    const result = decide(writeModel, op({ kind: 'withdraw', target: 'e1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]).toMatchObject({ kind: 'withdraw', target: 'e1' })
    }
  })

  it('withdraws a present actor with no edges as a single withdraw', () => {
    const writeModel = given([{ kind: 'identify-actor', id: 'a1', label: 'member' }])
    const result = decide(writeModel, op({ kind: 'withdraw', target: 'a1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]).toMatchObject({ kind: 'withdraw', target: 'a1' })
    }
  })

  it('rejects a withdraw of an already-withdrawn target', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'order placed' },
      { kind: 'withdraw', target: 'e1' },
    ])
    const result = decide(writeModel, op({ kind: 'withdraw', target: 'e1' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'already-withdrawn',
        classification: 'systemic',
        target: 'e1',
      })
    }
  })

  it('rejects a withdraw of an unknown target', () => {
    const result = decide(emptyWriteModel(), op({ kind: 'withdraw', target: 'e9' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('unknown-target')
  })

  // AT-17: a reinstate returns the operation naked — no relation restored
  // (there are none to restore in Slice 0).
  it('reinstates a withdrawn target', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'x' },
      { kind: 'withdraw', target: 'e1' },
    ])
    const result = decide(writeModel, op({ kind: 'reinstate', target: 'e1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([op({ kind: 'reinstate', target: 'e1' })])
  })

  it('rejects a reinstate of a target that is not withdrawn', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'reinstate', target: 'e1' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'not-withdrawn',
        classification: 'systemic',
        target: 'e1',
      })
    }
  })

  it('rejects a reinstate of an unknown target', () => {
    const result = decide(emptyWriteModel(), op({ kind: 'reinstate', target: 'e9' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('unknown-target')
  })
})

describe('decide — place / unplace', () => {
  it('places a domain event as a single place operation', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'place', target: 'e1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([op({ kind: 'place', target: 'e1' })])
    }
  })

  it('accepts a second place of an already-placed event', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'x' },
      { kind: 'place', target: 'e1' },
    ])
    const result = decide(writeModel, op({ kind: 'place', target: 'e1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([op({ kind: 'place', target: 'e1' })])
  })

  it('rejects place of an actor as kind-permission', () => {
    const writeModel = given([{ kind: 'identify-actor', id: 'a1', label: 'clerk' }])
    const result = decide(writeModel, op({ kind: 'place', target: 'a1' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'kind-permission',
        classification: 'systemic',
        operation: 'place',
        reason: 'only a domain event may be placed or unplaced',
      })
    }
  })

  it('rejects place of an unknown target', () => {
    const result = decide(emptyWriteModel(), op({ kind: 'place', target: 'e9' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'unknown-target',
        classification: 'systemic',
        target: 'e9',
      })
    }
  })

  it('rejects place of a withdrawn event', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'e1', label: 'x' },
      { kind: 'withdraw', target: 'e1' },
    ])
    const result = decide(writeModel, op({ kind: 'place', target: 'e1' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'withdrawn-target',
        classification: 'systemic',
        target: 'e1',
      })
    }
  })

  it('unplaces a sequenced event by unsequencing incident edges then unplace', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'eA', label: 'a' },
      { kind: 'capture-domain-event', id: 'eB', label: 'b' },
      { kind: 'capture-domain-event', id: 'eC', label: 'c' },
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
      { kind: 'sequence', predecessor: 'eC', successor: 'eA' },
    ])
    const result = decide(writeModel, op({ kind: 'unplace', target: 'eA' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.map((item) => item.kind)).toEqual(['unsequence', 'unsequence', 'unplace'])
      expect(result.value).toEqual([
        op({ kind: 'unsequence', predecessor: 'eA', successor: 'eB' }),
        op({ kind: 'unsequence', predecessor: 'eC', successor: 'eA' }),
        op({ kind: 'unplace', target: 'eA' }),
      ])
    }
  })

  it('unplaces an isolated event as a single unplace', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'e1', label: 'x' }])
    const result = decide(writeModel, op({ kind: 'unplace', target: 'e1' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([op({ kind: 'unplace', target: 'e1' })])
  })

  it('never accepts place or unplace on a non-event', () => {
    const kinds: BuildingBlockKind[] = ['actor', 'system', 'hot-spot', 'domain-event']
    for (const kind of kinds) {
      const writeModel: BoardWriteModel = {
        blocks: new Map([[bid('x1'), { kind, withdrawn: false }]]),
        follows: new Map(),
        causedBy: new Map(),
      }
      for (const operationKind of ['place', 'unplace'] as const) {
        const result = decide(writeModel, op({ kind: operationKind, target: 'x1' }))
        if (kind === 'domain-event') {
          expect(isOk(result)).toBe(true)
        } else {
          expect(isErr(result)).toBe(true)
          if (isErr(result)) expect(result.error.kind).toBe('kind-permission')
        }
      }
    }
  })
})

describe('decide — schema and not-implemented rejections', () => {
  it('rejects an operation that fails schema validation, emitting nothing', () => {
    const result = decide(emptyWriteModel(), { kind: 'withdraw', author } as unknown as Operation)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.kind).toBe('schema')
      expect(result.error.classification).toBe('systemic')
      if (result.error.kind === 'schema') expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('rejects every not-yet-implemented kind explicitly, never silently', () => {
    for (const kind of NOT_IMPLEMENTED) {
      const result = decide(emptyWriteModel(), op(sampleFor(kind)))
      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error).toEqual({
          kind: 'not-implemented-in-slice',
          classification: 'systemic',
          operation: kind,
        })
      }
    }
  })
})

/** A minimal valid payload for a not-yet-implemented operation kind. */
const EXTRA_FIELDS: Partial<Record<OperationKind, Record<string, unknown>>> = {
  'raise-hot-spot': { id: 'h1', label: 'x' },
  sequence: { predecessor: 'e1', successor: 'e2' },
  unsequence: { predecessor: 'e1', successor: 'e2' },
  'insert-between': { predecessor: 'e1', inserted: 'e3', successor: 'e2' },
  'link-cause': { cause: 'a1', effect: 'e1' },
  'unlink-cause': { cause: 'a1', effect: 'e1' },
  annotate: { hotSpot: 'h1', target: 'e1' },
  unannotate: { hotSpot: 'h1' },
  resolve: { target: 'h1', reference: 'noted' },
}

function sampleFor(kind: OperationKind): Record<string, unknown> {
  return { kind, ...(EXTRA_FIELDS[kind] ?? { target: 'e1' }) }
}
