import { describe, expect, it } from 'vitest'
import { Operation, type OperationKind } from './operations.ts'

const author = { accepter: { name: 'Dana' } }

/** One valid instance of every one of the 20 frozen variants. */
const samples: Record<OperationKind, Record<string, unknown>> = {
  'capture-domain-event': { kind: 'capture-domain-event', author, id: 'e1', label: 'order placed' },
  'identify-actor': { kind: 'identify-actor', author, id: 'a1', label: 'server' },
  'identify-system': { kind: 'identify-system', author, id: 's1', label: 'POS' },
  reword: { kind: 'reword', author, target: 'e1', label: 'order was placed' },
  withdraw: { kind: 'withdraw', author, target: 'e1' },
  reinstate: { kind: 'reinstate', author, target: 'e1' },
  'raise-hot-spot': { kind: 'raise-hot-spot', author, id: 'h1', label: 'expo bottleneck' },
  place: { kind: 'place', author, target: 'e1' },
  unplace: { kind: 'unplace', author, target: 'e1' },
  sequence: { kind: 'sequence', author, predecessor: 'e1', successor: 'e2' },
  unsequence: { kind: 'unsequence', author, predecessor: 'e1', successor: 'e2' },
  'insert-between': {
    kind: 'insert-between',
    author,
    predecessor: 'e1',
    inserted: 'e3',
    successor: 'e2',
  },
  'link-cause': { kind: 'link-cause', author, cause: 'a1', effect: 'e1' },
  'unlink-cause': { kind: 'unlink-cause', author, cause: 'a1', effect: 'e1' },
  annotate: { kind: 'annotate', author, hotSpot: 'h1', target: 'e1' },
  unannotate: { kind: 'unannotate', author, hotSpot: 'h1' },
  'mark-pivotal': { kind: 'mark-pivotal', author, target: 'e1' },
  'unmark-pivotal': { kind: 'unmark-pivotal', author, target: 'e1' },
  resolve: { kind: 'resolve', author, target: 'h1', reference: { note: 'decided in session 3' } },
  reopen: { kind: 'reopen', author, target: 'h1' },
}

describe('Operation schema union (frozen v:1)', () => {
  it('parses a valid instance of every one of the 20 variants, defaulting v to 1', () => {
    for (const [kind, sample] of Object.entries(samples)) {
      const parsed = Operation.parse(sample)
      expect(parsed.kind).toBe(kind)
      expect(parsed.v).toBe(1) // v absent -> 1
    }
  })

  it('accepts an explicit v: 1', () => {
    expect(Operation.parse({ ...samples.withdraw, v: 1 }).v).toBe(1)
  })

  it('rejects v: 2', () => {
    expect(() => Operation.parse({ ...samples.withdraw, v: 2 })).toThrow()
  })

  it('requires resolve.reference — a missing key fails parse', () => {
    expect(() => Operation.parse({ kind: 'resolve', author, target: 'h1' })).toThrow()
  })

  it('accepts any shape for resolve.reference once present', () => {
    expect(Operation.parse({ kind: 'resolve', author, target: 'h1', reference: 42 })).toMatchObject({
      reference: 42,
    })
  })

  it('rejects resolve with a present-but-undefined reference key', () => {
    expect(() =>
      Operation.parse({ kind: 'resolve', author, target: 'h1', reference: undefined }),
    ).toThrow()
  })

  it('accepts resolve with reference: null — null is a recorded value', () => {
    expect(Operation.parse({ kind: 'resolve', author, target: 'h1', reference: null })).toMatchObject(
      { kind: 'resolve', reference: null },
    )
  })

  it('rejects an unknown operation kind', () => {
    expect(() => Operation.parse({ kind: 'destroy', author, target: 'e1' })).toThrow()
  })

  it('rejects a missing author', () => {
    expect(() => Operation.parse({ kind: 'withdraw', target: 'e1' })).toThrow()
  })

  it('defaults raise-hot-spot.modelAffecting to true', () => {
    const parsed = Operation.parse(samples['raise-hot-spot'])
    expect(parsed).toMatchObject({ kind: 'raise-hot-spot', modelAffecting: true })
  })

  // `switch (op.kind)` is exhaustive over the frozen union.
  // A deliberately missing branch makes this function fail to type-check
  // ("not all code paths return") — the compile-time exhaustiveness proof.
  it('exposes an exhaustive discriminant — every kind has a switch branch', () => {
    const branch = (op: Operation): string => {
      switch (op.kind) {
        case 'capture-domain-event':
          return op.label
        case 'identify-actor':
          return op.label
        case 'identify-system':
          return op.label
        case 'reword':
          return op.label
        case 'withdraw':
          return op.target
        case 'reinstate':
          return op.target
        case 'raise-hot-spot':
          return op.label
        case 'place':
          return op.target
        case 'unplace':
          return op.target
        case 'sequence':
          return op.successor
        case 'unsequence':
          return op.successor
        case 'insert-between':
          return op.inserted
        case 'link-cause':
          return op.effect
        case 'unlink-cause':
          return op.effect
        case 'annotate':
          return op.hotSpot
        case 'unannotate':
          return op.hotSpot
        case 'mark-pivotal':
          return op.target
        case 'unmark-pivotal':
          return op.target
        case 'resolve':
          return op.target
        case 'reopen':
          return op.target
      }
    }

    for (const sample of Object.values(samples)) {
      expect(typeof branch(Operation.parse(sample))).toBe('string')
    }
  })
})
