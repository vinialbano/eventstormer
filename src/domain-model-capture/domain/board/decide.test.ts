import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import { Operation, type OperationKind } from '../schema/index.ts'
import { decide } from './decide.ts'
import { evolve } from './evolve.ts'
import { type BoardWriteModel, emptyWriteModel, type BuildingBlockKind } from './model.ts'
import { replay } from './replay.ts'

const bid = (value: string): BuildingBlockId => value as BuildingBlockId

const author = { accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })

/** Given(prior operations): fold them into the write model (ADR-008 style). */
const given = (priors: Record<string, unknown>[]): BoardWriteModel =>
  priors.reduce((writeModel, raw) => evolve(writeModel, op(raw)), emptyWriteModel())

const inboundCounts = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
): { nodes: Set<BuildingBlockId>; inbound: Map<BuildingBlockId, number> } => {
  const nodes = new Set<BuildingBlockId>()
  const inbound = new Map<BuildingBlockId, number>()
  for (const [predecessor, successors] of follows) {
    nodes.add(predecessor)
    if (!inbound.has(predecessor)) inbound.set(predecessor, 0)
    for (const successor of successors) {
      nodes.add(successor)
      inbound.set(successor, (inbound.get(successor) ?? 0) + 1)
    }
  }
  return { nodes, inbound }
}

const followsIsAcyclic = (follows: Map<BuildingBlockId, Set<BuildingBlockId>>): boolean => {
  const { nodes, inbound } = inboundCounts(follows)
  const ready = [...nodes].filter((id) => (inbound.get(id) ?? 0) === 0)
  let visited = 0
  while (ready.length > 0) {
    const current = ready.shift()
    if (!current) break
    visited += 1
    for (const successor of follows.get(current) ?? []) {
      const remaining = (inbound.get(successor) ?? 1) - 1
      inbound.set(successor, remaining)
      if (remaining === 0) ready.push(successor)
    }
  }
  return visited === nodes.size
}

const NOT_IMPLEMENTED: OperationKind[] = [
  'raise-hot-spot',
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

describe('decide — sequence / unsequence', () => {
  const threeEvents = [
    { kind: 'capture-domain-event', id: 'eA', label: 'a' },
    { kind: 'capture-domain-event', id: 'eB', label: 'b' },
    { kind: 'capture-domain-event', id: 'eC', label: 'c' },
  ]

  it('accepts A→B then A→C and retains both successors', () => {
    const afterFirst = given([...threeEvents, { kind: 'sequence', predecessor: 'eA', successor: 'eB' }])
    const second = decide(afterFirst, op({ kind: 'sequence', predecessor: 'eA', successor: 'eC' }))
    expect(isOk(second)).toBe(true)
    if (!isOk(second)) return
    expect(second.value).toEqual([op({ kind: 'sequence', predecessor: 'eA', successor: 'eC' })])
    const folded = second.value.reduce(evolve, afterFirst)
    expect(folded.follows.get(bid('eA'))).toEqual(new Set([bid('eB'), bid('eC')]))
  })

  it('rejects C→A after A→B→C as a cycle with a pinned path; graph unchanged', () => {
    const writeModel = given([
      ...threeEvents,
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
      { kind: 'sequence', predecessor: 'eB', successor: 'eC' },
    ])
    const result = decide(writeModel, op({ kind: 'sequence', predecessor: 'eC', successor: 'eA' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'cycle',
        classification: 'systemic',
        path: [bid('eC'), bid('eA'), bid('eB'), bid('eC')],
      })
    }
    expect(writeModel.follows.get(bid('eA'))).toEqual(new Set([bid('eB')]))
    expect(writeModel.follows.get(bid('eB'))).toEqual(new Set([bid('eC')]))
    expect(writeModel.follows.get(bid('eC'))).toBeUndefined()
  })

  it('rejects a self-loop as a cycle', () => {
    const writeModel = given([{ kind: 'capture-domain-event', id: 'eA', label: 'a' }])
    const result = decide(writeModel, op({ kind: 'sequence', predecessor: 'eA', successor: 'eA' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'cycle',
        classification: 'systemic',
        path: [bid('eA'), bid('eA')],
      })
    }
  })

  it('rejects a duplicate A→B as already-related', () => {
    const writeModel = given([
      ...threeEvents,
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
    ])
    const result = decide(writeModel, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'already-related', classification: 'systemic' })
    }
  })

  it('rejects unsequence of a missing pair as missing-edge', () => {
    const writeModel = given(threeEvents)
    const result = decide(writeModel, op({ kind: 'unsequence', predecessor: 'eA', successor: 'eB' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'missing-edge', classification: 'systemic' })
    }
  })

  it('unsequences an existing edge as a single unsequence', () => {
    const writeModel = given([
      ...threeEvents,
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
    ])
    const result = decide(writeModel, op({ kind: 'unsequence', predecessor: 'eA', successor: 'eB' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([op({ kind: 'unsequence', predecessor: 'eA', successor: 'eB' })])
    }
  })

  it('rejects sequence of an actor as kind-permission', () => {
    const writeModel = given([
      { kind: 'identify-actor', id: 'a1', label: 'clerk' },
      { kind: 'capture-domain-event', id: 'eA', label: 'a' },
    ])
    const result = decide(writeModel, op({ kind: 'sequence', predecessor: 'a1', successor: 'eA' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('kind-permission')
  })

  it('no accepted operation sequence leaves a follows cycle', () => {
    const pool: Operation[] = [
      op({ kind: 'capture-domain-event', id: 'e1', label: 'a' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'b' }),
      op({ kind: 'capture-domain-event', id: 'e3', label: 'c' }),
      op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
      op({ kind: 'sequence', predecessor: 'e2', successor: 'e3' }),
      op({ kind: 'sequence', predecessor: 'e3', successor: 'e1' }),
      op({ kind: 'sequence', predecessor: 'e1', successor: 'e3' }),
      op({ kind: 'sequence', predecessor: 'e2', successor: 'e1' }),
      op({ kind: 'unsequence', predecessor: 'e1', successor: 'e2' }),
      op({ kind: 'unsequence', predecessor: 'e2', successor: 'e3' }),
      op({ kind: 'insert-between', predecessor: 'e1', inserted: 'e3', successor: 'e2' }),
      op({ kind: 'place', target: 'e1' }),
      op({ kind: 'unplace', target: 'e2' }),
    ]
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...pool), { maxLength: 30 }), (log) => {
        let writeModel = emptyWriteModel()
        for (const candidate of log) {
          const decision = decide(writeModel, candidate)
          if (!isOk(decision)) continue
          for (const applied of decision.value) writeModel = evolve(writeModel, applied)
        }
        expect(followsIsAcyclic(writeModel.follows)).toBe(true)
      }),
    )
  })
})

describe('decide — insert-between', () => {
  it('inserts C between A and B as one op and leaves A→D', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }),
      op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }),
      op({ kind: 'capture-domain-event', id: 'eC', label: 'c' }),
      op({ kind: 'capture-domain-event', id: 'eD', label: 'd' }),
      op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
      op({ kind: 'sequence', predecessor: 'eA', successor: 'eD' }),
    ]
    const writeModel = log.reduce((model, item) => evolve(model, item), emptyWriteModel())
    const insert = op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' })
    const result = decide(writeModel, insert)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([insert])
    const snap = replay([...log, insert])
    expect(snap.follows).toEqual([
      { predecessor: bid('eA'), successor: bid('eD') },
      { predecessor: bid('eA'), successor: bid('eC') },
      { predecessor: bid('eC'), successor: bid('eB') },
    ])
    expect(snap.follows).not.toContainEqual({ predecessor: bid('eA'), successor: bid('eB') })
    expect(snap.blocks.get(bid('eC'))?.placement).toBe('timeline')
  })

  it('rejects insert-between when A→B is absent as missing-edge', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'eA', label: 'a' },
      { kind: 'capture-domain-event', id: 'eB', label: 'b' },
      { kind: 'capture-domain-event', id: 'eC', label: 'c' },
    ])
    const result = decide(
      writeModel,
      op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' }),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'missing-edge', classification: 'systemic' })
    }
  })

  it('rejects insert-between when C can reach A as a cycle', () => {
    const writeModel = given([
      { kind: 'capture-domain-event', id: 'eA', label: 'a' },
      { kind: 'capture-domain-event', id: 'eB', label: 'b' },
      { kind: 'capture-domain-event', id: 'eC', label: 'c' },
      { kind: 'sequence', predecessor: 'eC', successor: 'eA' },
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
    ])
    const result = decide(
      writeModel,
      op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' }),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'cycle',
        classification: 'systemic',
        path: [bid('eA'), bid('eC'), bid('eA')],
      })
    }
    expect(writeModel.follows.get(bid('eA'))).toEqual(new Set([bid('eB')]))
    expect(writeModel.follows.get(bid('eC'))).toEqual(new Set([bid('eA')]))
  })
})

describe('decide — link-cause / unlink-cause', () => {
  const actorAndEvent = [
    { kind: 'identify-actor', id: 'a1', label: 'clerk' },
    { kind: 'capture-domain-event', id: 'eA', label: 'a' },
  ]

  it('accepts actor→event and system→event as a single link-cause', () => {
    const actorModel = given(actorAndEvent)
    const actorLink = decide(actorModel, op({ kind: 'link-cause', cause: 'a1', effect: 'eA' }))
    expect(isOk(actorLink)).toBe(true)
    if (isOk(actorLink)) {
      expect(actorLink.value).toEqual([op({ kind: 'link-cause', cause: 'a1', effect: 'eA' })])
    }
    const systemModel = given([
      { kind: 'identify-system', id: 's1', label: 'ledger' },
      { kind: 'capture-domain-event', id: 'eA', label: 'a' },
    ])
    const systemLink = decide(systemModel, op({ kind: 'link-cause', cause: 's1', effect: 'eA' }))
    expect(isOk(systemLink)).toBe(true)
    if (isOk(systemLink)) {
      expect(systemLink.value).toEqual([op({ kind: 'link-cause', cause: 's1', effect: 'eA' })])
    }
  })

  it('rejects event→event, actor→actor, and event→actor as kind-permission', () => {
    const writeModel = given([
      ...actorAndEvent,
      { kind: 'capture-domain-event', id: 'eB', label: 'b' },
      { kind: 'identify-actor', id: 'a2', label: 'member' },
    ])
    const pairings = [
      { cause: 'eA', effect: 'eB' },
      { cause: 'a1', effect: 'a2' },
      { cause: 'eA', effect: 'a1' },
    ]
    for (const pairing of pairings) {
      const result = decide(writeModel, op({ kind: 'link-cause', ...pairing }))
      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error.kind).toBe('kind-permission')
    }
  })

  it('rejects a duplicate link-cause as already-related', () => {
    const writeModel = given([
      ...actorAndEvent,
      { kind: 'link-cause', cause: 'a1', effect: 'eA' },
    ])
    const result = decide(writeModel, op({ kind: 'link-cause', cause: 'a1', effect: 'eA' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'already-related', classification: 'systemic' })
    }
  })

  it('unlinks an existing pair as a single unlink-cause', () => {
    const writeModel = given([
      ...actorAndEvent,
      { kind: 'link-cause', cause: 'a1', effect: 'eA' },
    ])
    const result = decide(writeModel, op({ kind: 'unlink-cause', cause: 'a1', effect: 'eA' }))
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([op({ kind: 'unlink-cause', cause: 'a1', effect: 'eA' })])
    }
  })

  it('rejects unlink-cause of an unknown pair as missing-edge', () => {
    const writeModel = given(actorAndEvent)
    const result = decide(writeModel, op({ kind: 'unlink-cause', cause: 'a1', effect: 'eA' }))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'missing-edge', classification: 'systemic' })
    }
  })

  it('rejects missing or withdrawn endpoints with existing rejection kinds', () => {
    const missing = decide(emptyWriteModel(), op({ kind: 'link-cause', cause: 'a9', effect: 'e9' }))
    expect(isErr(missing)).toBe(true)
    if (isErr(missing)) {
      expect(missing.error).toEqual({
        kind: 'unknown-target',
        classification: 'systemic',
        target: 'a9',
      })
    }
    const withdrawnCause = given([
      ...actorAndEvent,
      { kind: 'withdraw', target: 'a1' },
    ])
    const withdrawn = decide(
      withdrawnCause,
      op({ kind: 'link-cause', cause: 'a1', effect: 'eA' }),
    )
    expect(isErr(withdrawn)).toBe(true)
    if (isErr(withdrawn)) {
      expect(withdrawn.error).toEqual({
        kind: 'withdrawn-target',
        classification: 'systemic',
        target: 'a1',
      })
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
