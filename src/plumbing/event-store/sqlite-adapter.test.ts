import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { eventStoreContract } from './contract-test.ts'
import type { StreamKey } from './port.ts'
import { createSqliteEventStore } from './sqlite-adapter.ts'

const tempDirs: string[] = []

const makeStore = () => {
  const dir = mkdtempSync(join(tmpdir(), 'eventstormer-sqlite-'))
  tempDirs.push(dir)
  return createSqliteEventStore(join(dir, 'test.db'))
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

// The same behavioural contract the in-memory impl passes.
eventStoreContract('node:sqlite', makeStore)

describe('createSqliteEventStore', () => {
  const stream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: 'w1' }

  it('auto-creates and migrates the DB on construction — read on a fresh file yields []', () => {
    const store = makeStore()
    expect(store.read(stream)).toEqual([])
  })

  it('closes the handle and rethrows when construction fails (e.g. WAL unavailable)', () => {
    // `:memory:` cannot run in WAL — the PRAGMA reports 'memory', tripping the
    // assertion. The handle must be closed before the error escapes, not leaked.
    expect(() => createSqliteEventStore(':memory:')).toThrow(/WAL journal mode/)
  })

  it('persists op_version and at from the input on every row', () => {
    const store = makeStore()
    store.append(stream, -1, [
      { at: '2021-06-01T12:00:00.000Z', opVersion: 1, operation: { kind: 'x' } },
      { at: '2021-06-01T12:00:01.000Z', opVersion: 1, operation: { kind: 'y' } },
    ])

    const rows = store.read(stream)
    expect(rows.map((r) => r.opVersion)).toEqual([1, 1])
    expect(rows.map((r) => r.at)).toEqual([
      '2021-06-01T12:00:00.000Z',
      '2021-06-01T12:00:01.000Z',
    ])
    expect(rows.map((r) => r.operation)).toEqual([{ kind: 'x' }, { kind: 'y' }])
  })
})
