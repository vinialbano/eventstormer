import { err, ok } from '../result.ts'
import type { AppendConflict, EventStore, StoredOperation, StreamKey } from './port.ts'

/**
 * A first-class in-memory `EventStore` — the seam the decider/replay tests run
 * against (session-facilitation tests import it too). It enforces the same
 * `expectedPosition` and batch-atomic semantics as the `node:sqlite` adapter,
 * and serializes each operation the way the adapter does, so a non-serializable
 * operation aborts the whole batch here exactly as it would there.
 */
export const createMemoryEventStore = (): EventStore => {
  const streams = new Map<string, string[]>()
  const keyOf = (stream: StreamKey): string => `${stream.context}/${stream.aggregate}/${stream.id}`

  return {
    append(stream, expectedPosition, ops) {
      if (ops.length < 1) {
        throw new RangeError('append requires a batch of at least one operation')
      }

      const key = keyOf(stream)
      const existing = streams.get(key) ?? []
      const currentPosition = existing.length - 1

      if (currentPosition !== expectedPosition) {
        return err<AppendConflict>({
          kind: 'stale-position',
          actual: currentPosition,
          classification: 'transient',
        })
      }

      // Serialize the whole batch before touching the stream: a non-serializable
      // op throws here and the stream stays at its pre-batch length.
      const rows = ops.map((op, index) =>
        JSON.stringify({ ...op, position: expectedPosition + 1 + index }),
      )
      streams.set(key, [...existing, ...rows])

      return ok({ nextPosition: expectedPosition + ops.length })
    },

    read(stream) {
      const rows = streams.get(keyOf(stream)) ?? []
      return rows.map((row) => JSON.parse(row) as StoredOperation)
    },
  }
}
