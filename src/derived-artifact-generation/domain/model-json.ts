import { z } from 'zod'

/**
 * `ModelJson` — the versioned, self-describing contract behind the F10 JSON
 * export. It is a pure projection of the Board snapshot plus the workshop
 * record: no quoted evidence, no contribution bodies, no stored rationale, no
 * evidence spans. The composite version stamp (`boardPosition`,
 * `sessionRecordPosition`, `renderedAt`) is embedded so a held file can be
 * matched to a known version of the model.
 *
 * `serialise` builds a document in fixed key order; `deserialise` parses it
 * through this schema (which bounds the collection sizes) and structurally
 * rebuilds `{ snapshot, source }`.
 */

/** A generous ceiling — a hostile document is rejected here, never expanded. */
export const MODEL_JSON_COLLECTION_CAP = 10_000

const StakeholderCheckJson = z.union([
  z.object({ run: z.literal(false) }),
  z.object({
    run: z.literal(true),
    complete: z.boolean(),
    absentNames: z.array(z.string()),
  }),
])

const ChosenProblemJson = z.union([
  z.object({ notRun: z.literal(true) }),
  z.object({
    skipped: z.literal(true),
    reason: z.enum(['none-chosen', 'no-impediments-yet']),
  }),
  z.object({
    chosen: z.literal(true),
    hotSpotId: z.string(),
    label: z.string(),
    qualification: z.enum(['firm', 'provisional']),
  }),
])

const PartyJson = z.object({ name: z.string() })

const BlockJson = z.object({
  id: z.string(),
  kind: z.enum(['domain-event', 'actor', 'system', 'hot-spot']),
  label: z.string(),
  withdrawn: z.boolean(),
  placement: z.enum(['backlog', 'timeline']),
  pivotal: z.boolean(),
  provenance: z.object({ proposer: PartyJson.optional(), accepter: PartyJson }),
  modelAffecting: z.boolean().optional(),
  annotates: z.string().nullable().optional(),
  resolved: z.boolean().optional(),
  reference: z.unknown().optional(),
})
export type ModelBlock = z.infer<typeof BlockJson>

const FollowsJson = z.object({ predecessor: z.string(), successor: z.string() })
const CausedByJson = z.object({ cause: z.string(), effect: z.string() })

export const ModelJson = z
  .object({
    format: z.literal('eventstormer.model'),
    formatVersion: z.literal(1),
    renderedAt: z.iso.datetime(),
    boardPosition: z.number().int().nonnegative(),
    sessionRecordPosition: z.number().int().nonnegative(),
    workshop: z.object({
      format: z.literal('big-picture'),
      scope: z.string().nullable(),
      narratorCount: z.number().int().nonnegative(),
      stakeholderCheck: StakeholderCheckJson,
      chosenProblem: ChosenProblemJson,
    }),
    buildingBlocks: z.array(BlockJson).max(MODEL_JSON_COLLECTION_CAP),
    follows: z.array(FollowsJson).max(MODEL_JSON_COLLECTION_CAP),
    causedBy: z.array(CausedByJson).max(MODEL_JSON_COLLECTION_CAP),
  })
  .strict()

export type ModelJson = z.infer<typeof ModelJson>

/** The workshop record embedded in a `ModelJson` — a subset of `ArtifactSource`. */
export type ModelWorkshop = ModelJson['workshop']
