import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
import { evolve } from './evolve.ts'
import { emptySnapshot } from './model.ts'
import { project } from './project.ts'
import { replay, replayWriteModel } from './replay.ts'

const author = { accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })
const bid = (value: string): BuildingBlockId => value as BuildingBlockId

/** A pool of valid operations to build random logs from (property tests). */
const POOL: Operation[] = [
  op({ kind: 'capture-domain-event', id: 'e1', label: 'a' }),
  op({ kind: 'capture-domain-event', id: 'e2', label: 'b' }),
  op({ kind: 'capture-domain-event', id: 'e3', label: 'c' }),
  op({ kind: 'identify-actor', id: 'a1', label: 'server' }),
  op({ kind: 'identify-system', id: 's1', label: 'ledger' }),
  op({ kind: 'reword', target: 'e1', label: 'a-reworded' }),
  op({ kind: 'withdraw', target: 'e1' }),
  op({ kind: 'reinstate', target: 'e1' }),
  op({ kind: 'place', target: 'e1' }),
  op({ kind: 'unplace', target: 'e1' }),
  op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
  op({ kind: 'unsequence', predecessor: 'e1', successor: 'e2' }),
  op({ kind: 'insert-between', predecessor: 'e1', inserted: 'e3', successor: 'e2' }),
  op({ kind: 'link-cause', cause: 'a1', effect: 'e1' }),
  op({ kind: 'unlink-cause', cause: 'a1', effect: 'e1' }),
  op({ kind: 'mark-pivotal', target: 'e1' }),
  op({ kind: 'unmark-pivotal', target: 'e1' }),
  op({ kind: 'raise-hot-spot', id: 'h1', label: 'hot' }),
  op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }),
  op({ kind: 'unannotate', hotSpot: 'h1' }),
  op({ kind: 'resolve', target: 'h1', reference: 'fixed' }),
  op({ kind: 'reopen', target: 'h1' }),
]

describe('replay', () => {
  it('an empty log replays to the empty snapshot', () => {
    expect(replay([])).toEqual(emptySnapshot())
  })

  it('replays two captures, a reword, and a withdraw to a known snapshot', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'e1', label: 'order placed' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'order paid' }),
      op({ kind: 'reword', target: 'e1', label: 'order was placed' }),
      op({ kind: 'withdraw', target: 'e2' }),
    ]
    expect(replay(log)).toEqual({
      position: 3,
      follows: [],
      causedBy: [],
      hotSpotCount: 0,
      blocks: new Map([
        [
          bid('e1'),
          {
            kind: 'domain-event',
            label: 'order was placed',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('e2'),
          {
            kind: 'domain-event',
            label: 'order paid',
            withdrawn: true,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
      ]),
    })
  })

  // PRD F01 replay: a targeted sequence produces an exactly-known snapshot.
  it('produces the expected snapshot for a targeted sequence', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'e1', label: 'placed' }),
      op({ kind: 'withdraw', target: 'e1' }),
    ]
    const snap = replay(log)
    expect(snap.position).toBe(1)
    expect(snap.blocks.get(bid('e1'))).toEqual({
      kind: 'domain-event',
      label: 'placed',
      withdrawn: true,
      placement: 'backlog',
      pivotal: false,
      provenance: author,
    })
  })

  it('place, unplace, and insert-between publish the expected timeline topology', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }),
      op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }),
      op({ kind: 'capture-domain-event', id: 'eC', label: 'c' }),
      op({ kind: 'capture-domain-event', id: 'eD', label: 'd' }),
      op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
      op({ kind: 'sequence', predecessor: 'eA', successor: 'eD' }),
      op({ kind: 'place', target: 'eC' }),
      op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' }),
      op({ kind: 'unplace', target: 'eA' }),
    ]
    expect(replay(log)).toEqual({
      position: 8,
      follows: [{ predecessor: bid('eC'), successor: bid('eB') }],
      causedBy: [],
      hotSpotCount: 0,
      blocks: new Map([
        [
          bid('eA'),
          {
            kind: 'domain-event',
            label: 'a',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('eB'),
          {
            kind: 'domain-event',
            label: 'b',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('eC'),
          {
            kind: 'domain-event',
            label: 'c',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('eD'),
          {
            kind: 'domain-event',
            label: 'd',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
      ]),
    })
  })

  it('produces the expected snapshot after sequencing two events', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'e1', label: 'placed' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'paid' }),
      op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
    ]
    expect(replay(log)).toEqual({
      position: 2,
      follows: [{ predecessor: bid('e1'), successor: bid('e2') }],
      causedBy: [],
      hotSpotCount: 0,
      blocks: new Map([
        [
          bid('e1'),
          {
            kind: 'domain-event',
            label: 'placed',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('e2'),
          {
            kind: 'domain-event',
            label: 'paid',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
      ]),
    })
  })

  it('two building blocks with identical labels both survive replay (no merge)', () => {
    const snap = replay([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'same' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'same' }),
    ])
    expect(snap.blocks.size).toBe(2)
  })

  it('folds a full hot-spot log from empty to a spelled-out snapshot (acceptance test 18a)', () => {
    const log = [
      op({ kind: 'capture-domain-event', id: 'e1', label: 'payment' }),
      op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }),
      op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }),
      op({ kind: 'resolve', target: 'h1', reference: 'added a retry' }),
      op({ kind: 'reopen', target: 'h1' }),
      op({ kind: 'raise-hot-spot', id: 'h2', label: 'ownership', modelAffecting: false }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'refund' }),
      op({ kind: 'raise-hot-spot', id: 'h3', label: 'temp' }),
      op({ kind: 'annotate', hotSpot: 'h3', target: 'e2' }),
      op({ kind: 'withdraw', target: 'e2' }),
      op({ kind: 'withdraw', target: 'h3' }),
    ]
    expect(replay(log)).toEqual({
      position: 10,
      follows: [],
      causedBy: [],
      hotSpotCount: 2,
      blocks: new Map([
        [
          bid('e1'),
          {
            kind: 'domain-event',
            label: 'payment',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('h1'),
          {
            kind: 'hot-spot',
            label: 'timeouts',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
            modelAffecting: true,
            annotates: bid('e1'),
            resolved: false,
            reference: 'added a retry',
          },
        ],
        [
          bid('h2'),
          {
            kind: 'hot-spot',
            label: 'ownership',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
            modelAffecting: false,
            annotates: null,
            resolved: false,
            reference: null,
          },
        ],
        [
          bid('e2'),
          {
            kind: 'domain-event',
            label: 'refund',
            withdrawn: true,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('h3'),
          {
            kind: 'hot-spot',
            label: 'temp',
            withdrawn: true,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
            modelAffecting: true,
            annotates: null,
            resolved: false,
            reference: null,
          },
        ],
      ]),
    })
  })

  it('replayWriteModel folds the log into the slim write model', () => {
    const writeModel = replayWriteModel([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }),
      op({ kind: 'withdraw', target: 'e1' }),
    ])
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: true })
  })

  it('replayWriteModel records follows and causedBy from sequence and link-cause', () => {
    const writeModel = replayWriteModel([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'placed' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'paid' }),
      op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }),
      op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
      op({ kind: 'link-cause', cause: 'a1', effect: 'e1' }),
    ])
    expect(writeModel.follows.get(bid('e1'))).toEqual(new Set([bid('e2')]))
    expect(writeModel.causedBy.get(bid('e1'))).toEqual(new Set([bid('a1')]))
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: false })
  })

  it('replayWriteModel after withdraw has no incident follows or causedBy edges', () => {
    const writeModel = replayWriteModel([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'placed' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'paid' }),
      op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }),
      op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
      op({ kind: 'link-cause', cause: 'a1', effect: 'e1' }),
      op({ kind: 'withdraw', target: 'e1' }),
    ])
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: true })
    expect(writeModel.follows.size).toBe(0)
    expect(writeModel.causedBy.size).toBe(0)
  })

  // Consistency property only — not an independent oracle. Both sides share
  // `project`; a fold that silently drops a field still passes here.
  it('replay(log ++ [op]) deep-equals project(replay(log), op)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...POOL)), fc.constantFrom(...POOL), (log, next) => {
        expect(replay([...log, next])).toEqual(project(replay(log), next))
      }),
    )
  })

  // Twin of the snapshot property. Catches replayWriteModel drifting off
  // evolve (for example deriving the write model from a snapshot and dropping
  // adjacency). Edge contents are pinned by the goldens above, not here.
  it('replayWriteModel(log ++ [op]) deep-equals evolve(replayWriteModel(log), op)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...POOL)), fc.constantFrom(...POOL), (log, next) => {
        expect(replayWriteModel([...log, next])).toEqual(evolve(replayWriteModel(log), next))
      }),
    )
  })
})
