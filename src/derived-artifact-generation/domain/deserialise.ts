import type { z } from 'zod'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { ModelJson } from './model-json.ts'
import type { SerialiseInput } from './serialise.ts'

type SnapshotAndSource = Pick<SerialiseInput, 'snapshot' | 'source'>

export interface InvalidModelJson {
  kind: 'invalid-model-json'
  issues: z.core.$ZodIssue[]
}

/**
 * `ModelJson.parse` (which bounds the collection sizes) then a structural
 * rebuild of `{ snapshot, source }` — the inverse of `serialise`. A foreign or
 * oversized document is rejected here and expands nothing.
 */
export const deserialise = (json: unknown): Result<SnapshotAndSource, InvalidModelJson> => {
  const parsed = ModelJson.safeParse(json)
  if (!parsed.success) return err({ kind: 'invalid-model-json', issues: parsed.error.issues })

  const document = parsed.data
  return ok({
    source: document.workshop,
    snapshot: {
      blocks: document.buildingBlocks,
      follows: document.follows.map((edge) => ({
        predecessor: edge.predecessor,
        successor: edge.successor,
      })),
      causedBy: document.causedBy.map((edge) => ({ cause: edge.cause, effect: edge.effect })),
    },
  })
}
