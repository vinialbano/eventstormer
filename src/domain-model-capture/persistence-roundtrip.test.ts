import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { StoredOperationInput, StreamKey } from '~/plumbing/event-store/port.ts'
import { createSqliteEventStore } from '~/plumbing/event-store/sqlite-adapter.ts'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { emptySnapshot, Operation, OP_SCHEMA_VERSION, replay } from './api.ts'

/**
 * The end-to-end proof that a workshop's model survives a process restart
 * (F01). Under Approach A there is no repository yet — this test wires
 * `store.read → replay` directly, the way the F06 board handler does.
 */

const temporaryDirectories: string[] = []
const freshDbPath = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'eventstormer-roundtrip-'))
  temporaryDirectories.push(directory)
  return join(directory, 'workshop.db')
}

afterAll(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true })
})

const stream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: 'w1' }
const at = '2026-01-01T00:00:00.000Z' // fixed clock
const author = { accepter: { name: 'Dana' } }

const bid = (value: string): BuildingBlockId => value as BuildingBlockId

const ops: Operation[] = [
  Operation.parse({ author, kind: 'capture-domain-event', id: 'e1', label: 'order placed' }),
  Operation.parse({ author, kind: 'capture-domain-event', id: 'e2', label: 'order paid' }),
  Operation.parse({ author, kind: 'reword', target: 'e1', label: 'order was placed' }),
  Operation.parse({ author, kind: 'withdraw', target: 'e2' }),
]

const topologyOps: Operation[] = [
  Operation.parse({ author, kind: 'capture-domain-event', id: 'e1', label: 'order placed' }),
  Operation.parse({ author, kind: 'capture-domain-event', id: 'e2', label: 'order paid' }),
  Operation.parse({ author, kind: 'identify-actor', id: 'a1', label: 'clerk' }),
  Operation.parse({ author, kind: 'place', target: 'e1' }),
  Operation.parse({ author, kind: 'sequence', predecessor: 'e1', successor: 'e2' }),
  Operation.parse({ author, kind: 'link-cause', cause: 'a1', effect: 'e1' }),
]
const asInput = (op: Operation): StoredOperationInput => ({
  at,
  opVersion: OP_SCHEMA_VERSION,
  operation: op,
})

describe('persistence round-trip', () => {
  it('a workshop replays to the same snapshot after a simulated process restart', () => {
    const path = freshDbPath()

    const first = createSqliteEventStore(path)
    first.append(stream, -1, ops.map(asInput))
    // process ends — drop the reference (Approach A: no dispose API yet)

    const second = createSqliteEventStore(path)
    const fromDisk = replay(second.read(stream).map((row) => Operation.parse(row.operation)))

    expect(fromDisk).toEqual({
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

  it('follows, causedBy, and placement survive a simulated process restart', () => {
    const path = freshDbPath()

    const first = createSqliteEventStore(path)
    first.append(stream, -1, topologyOps.map(asInput))

    const second = createSqliteEventStore(path)
    const fromDisk = replay(second.read(stream).map((row) => Operation.parse(row.operation)))

    expect(fromDisk).toEqual({
      position: 5,
      follows: [{ predecessor: bid('e1'), successor: bid('e2') }],
      causedBy: [{ cause: bid('a1'), effect: bid('e1') }],
      blocks: new Map([
        [
          bid('e1'),
          {
            kind: 'domain-event',
            label: 'order placed',
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
            label: 'order paid',
            withdrawn: false,
            placement: 'timeline',
            pivotal: false,
            provenance: author,
          },
        ],
        [
          bid('a1'),
          {
            kind: 'actor',
            label: 'clerk',
            withdrawn: false,
            placement: 'backlog',
            pivotal: false,
            provenance: author,
          },
        ],
      ]),
    })
  })

  it('a never-written stream reads back empty and replays to the empty snapshot', () => {
    const store = createSqliteEventStore(freshDbPath())
    expect(store.read(stream)).toEqual([])
    expect(replay(store.read(stream).map((row) => Operation.parse(row.operation)))).toEqual(
      emptySnapshot(),
    )
  })

  it('every persisted row carries a non-null op_version equal to OP_SCHEMA_VERSION', () => {
    const store = createSqliteEventStore(freshDbPath())
    store.append(stream, -1, ops.map(asInput))

    const versions = store.read(stream).map((row) => row.opVersion)
    expect(versions).toHaveLength(ops.length)
    expect(versions).toEqual(ops.map(() => OP_SCHEMA_VERSION))
  })

  it('pointing a fresh store at a non-existent path auto-creates and migrates it', () => {
    // If the schema were not migrated, `read` would throw "no such table".
    const store = createSqliteEventStore(freshDbPath())
    expect(store.read(stream)).toEqual([])
  })
})
