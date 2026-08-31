import { describe, expect, it } from 'vitest'
import { isErr } from '../result.ts'
import type { EventStore, StoredOperationInput, StreamKey } from './port.ts'

const stream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: 'w1' }

const op = (count: number): StoredOperationInput => ({
  at: '2020-01-01T00:00:00.000Z',
  opVersion: 1,
  operation: { count },
})

/**
 * One behavioural contract, run against every `EventStore` implementation.
 * `makeStore` returns a fresh, empty store per call.
 */
export const eventStoreContract = (name: string, makeStore: () => EventStore): void => {
  describe(`EventStore contract: ${name}`, () => {
    it('assigns contiguous positions 0,1,2 to a 3-op batch', () => {
      const store = makeStore()

      const result = store.append(stream, -1, [op(0), op(1), op(2)])

      expect(result).toEqual({ ok: true, value: { nextPosition: 2 } })
      expect(store.read(stream).map((row) => row.position)).toEqual([0, 1, 2])
    })

    it('returns operations in log order across multiple appends', () => {
      const store = makeStore()

      store.append(stream, -1, [op(10), op(11)])
      store.append(stream, 1, [op(12)])

      const rows = store.read(stream)
      expect(rows.map((row) => (row.operation as { count: number }).count)).toEqual([10, 11, 12])
      expect(rows.map((row) => row.position)).toEqual([0, 1, 2])
    })

    it('rejects a stale expectedPosition with a transient error and writes nothing', () => {
      const store = makeStore()
      store.append(stream, -1, [op(0), op(1)]) // stream now at position 1

      const result = store.append(stream, 0, [op(2)]) // caller still thinks position 0

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error).toEqual({
          kind: 'stale-position',
          actual: 1,
          classification: 'transient',
        })
      }
      expect(store.read(stream)).toHaveLength(2) // no partial write, no duplicate position
    })

    it('rejects append(stream, -1, ops) on an existing stream with stale-position and writes nothing', () => {
      const store = makeStore()
      store.append(stream, -1, [op(0), op(1)]) // stream now at position 1

      const result = store.append(stream, -1, [op(2)]) // caller thinks the stream is new

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error).toEqual({
          kind: 'stale-position',
          actual: 1,
          classification: 'transient',
        })
      }
      expect(store.read(stream)).toHaveLength(2)
    })

    it('throws on an empty batch and leaves the stream untouched', () => {
      const store = makeStore()
      store.append(stream, -1, [op(0)])

      expect(() => store.append(stream, 0, [])).toThrow(RangeError)
      expect(store.read(stream)).toHaveLength(1)
    })

    it('leaves the stream at its pre-batch length when an op in the batch fails mid-insert', () => {
      const store = makeStore()
      store.append(stream, -1, [op(0)]) // pre-batch length 1

      const circular: Record<string, unknown> = {}
      circular.self = circular
      const poison: StoredOperationInput = {
        at: '2020-01-01T00:00:00.000Z',
        opVersion: 1,
        operation: circular,
      }

      expect(() => store.append(stream, 0, [op(1), poison, op(2)])).toThrow()

      const rows = store.read(stream)
      expect(rows).toHaveLength(1)
      expect(rows.map((row) => row.position)).toEqual([0])
    })
  })
}
