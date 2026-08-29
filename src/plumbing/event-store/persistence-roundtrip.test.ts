import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  emptySnapshot,
  Operation,
  OP_SCHEMA_VERSION,
  replay,
} from '~/domain-model-capture/api.ts'
import type { StoredOperationInput, StreamKey } from './port.ts'
import { createSqliteEventStore } from './sqlite-adapter.ts'

/**
 * The end-to-end proof that a workshop's model survives a process restart
 * (F01, S0-20). Under Approach A there is no repository yet — this test wires
 * `store.read → replay` directly, the way Slice 2's F06 handler eventually will.
 */

const tempDirs: string[] = []
const freshDbPath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'eventstormer-roundtrip-'))
  tempDirs.push(dir)
  return join(dir, 'workshop.db')
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

const stream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: 'w1' }
const at = '2026-01-01T00:00:00.000Z' // fixed clock
const author = { accepter: { name: 'Dana' } }

const ops: Operation[] = [
  Operation.parse({ author, kind: 'capture-domain-event', id: 'e1', label: 'order placed' }),
  Operation.parse({ author, kind: 'reword', target: 'e1', label: 'order was placed' }),
  Operation.parse({ author, kind: 'withdraw', target: 'e1' }),
]
const asInput = (op: Operation): StoredOperationInput => ({
  at,
  opVersion: OP_SCHEMA_VERSION,
  operation: op,
})

describe('persistence round-trip', () => {
  it('a workshop replays to the same snapshot after a simulated process restart (S0-20)', () => {
    const path = freshDbPath()

    const first = createSqliteEventStore(path)
    first.append(stream, -1, ops.map(asInput))
    // process ends — drop the reference (Approach A: no dispose API yet)

    const second = createSqliteEventStore(path)
    const fromDisk = replay(second.read(stream).map((r) => Operation.parse(r.operation)))

    expect(fromDisk).toEqual(replay(ops))
  })

  it('a never-written stream reads back empty and replays to the empty snapshot (S0-20)', () => {
    const store = createSqliteEventStore(freshDbPath())
    expect(store.read(stream)).toEqual([])
    expect(replay(store.read(stream).map((r) => Operation.parse(r.operation)))).toEqual(
      emptySnapshot(),
    )
  })

  it('every persisted row carries a non-null op_version equal to OP_SCHEMA_VERSION (S0-19)', () => {
    const store = createSqliteEventStore(freshDbPath())
    store.append(stream, -1, ops.map(asInput))

    const versions = store.read(stream).map((r) => r.opVersion)
    expect(versions).toHaveLength(ops.length)
    expect(versions).toEqual(ops.map(() => OP_SCHEMA_VERSION))
  })

  it('pointing a fresh store at a non-existent path auto-creates and migrates it (S0-19)', () => {
    // If the schema were not migrated, `read` would throw "no such table".
    const store = createSqliteEventStore(freshDbPath())
    expect(store.read(stream)).toEqual([])
  })
})
