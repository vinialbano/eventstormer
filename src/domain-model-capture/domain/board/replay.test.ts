import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
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
  op({ kind: 'identify-actor', id: 'a1', label: 'server' }),
  op({ kind: 'reword', target: 'e1', label: 'a-reworded' }),
  op({ kind: 'withdraw', target: 'e1' }),
  op({ kind: 'reinstate', target: 'e1' }),
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

  it('two building blocks with identical labels both survive replay (no merge)', () => {
    const snap = replay([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'same' }),
      op({ kind: 'capture-domain-event', id: 'e2', label: 'same' }),
    ])
    expect(snap.blocks.size).toBe(2)
  })

  it('replayWriteModel folds the log into the slim write model', () => {
    const writeModel = replayWriteModel([
      op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }),
      op({ kind: 'withdraw', target: 'e1' }),
    ])
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: true })
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
})
