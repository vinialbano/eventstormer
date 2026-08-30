import { z } from 'zod'
import { Author } from './author.ts'
import { BuildingBlockId } from './ids.ts'

/**
 * The frozen `v:1` operation union — every command in the domain-model-capture
 * canvas Commands table (ADR-004). The `Board` decider handles only 6
 * kinds in Slice 0 — the 3 captures, reword, withdraw, reinstate; the other 14
 * variants are defined and frozen here so `switch-exhaustiveness-check` forces
 * every later slice to handle its new operations.
 *
 * `v: z.literal(1).default(1)` on every variant: a parsed operation with `v`
 * absent yields `v === 1`; `v: 2` fails to parse. Never mutate a v1 shape — a
 * future change adds `z.literal(2)` variants beside these.
 *
 * `at` (timestamp) is NOT here — the application layer stamps it on append from
 * an injected Clock. `author` IS here — it is part of the log contract.
 * `OperationId` is omitted from v:1.
 */
const opBase = { v: z.literal(1).default(1), author: Author }

// --- implemented in Slice 0 ---------------------------------------------------

const captureDomainEvent = z.object({
  ...opBase,
  kind: z.literal('capture-domain-event'),
  id: BuildingBlockId,
  label: z.string().min(1),
})
const identifyActor = z.object({
  ...opBase,
  kind: z.literal('identify-actor'),
  id: BuildingBlockId,
  label: z.string().min(1),
})
const identifySystem = z.object({
  ...opBase,
  kind: z.literal('identify-system'),
  id: BuildingBlockId,
  label: z.string().min(1),
})
const reword = z.object({
  ...opBase,
  kind: z.literal('reword'),
  target: BuildingBlockId,
  label: z.string().min(1),
})
const withdraw = z.object({ ...opBase, kind: z.literal('withdraw'), target: BuildingBlockId })
const reinstate = z.object({ ...opBase, kind: z.literal('reinstate'), target: BuildingBlockId })

// --- defined and frozen; not yet handled by the decider (Slices 3–4) ---------

const raiseHotSpot = z.object({
  ...opBase,
  kind: z.literal('raise-hot-spot'),
  id: BuildingBlockId,
  label: z.string().min(1),
  modelAffecting: z.boolean().default(true),
})
const place = z.object({ ...opBase, kind: z.literal('place'), target: BuildingBlockId })
const unplace = z.object({ ...opBase, kind: z.literal('unplace'), target: BuildingBlockId })
const sequence = z.object({
  ...opBase,
  kind: z.literal('sequence'),
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
})
const unsequence = z.object({
  ...opBase,
  kind: z.literal('unsequence'),
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
})
const insertBetween = z.object({
  ...opBase,
  kind: z.literal('insert-between'),
  predecessor: BuildingBlockId,
  inserted: BuildingBlockId,
  successor: BuildingBlockId,
})
const linkCause = z.object({
  ...opBase,
  kind: z.literal('link-cause'),
  cause: BuildingBlockId,
  effect: BuildingBlockId,
})
const unlinkCause = z.object({
  ...opBase,
  kind: z.literal('unlink-cause'),
  cause: BuildingBlockId,
  effect: BuildingBlockId,
})
const annotate = z.object({
  ...opBase,
  kind: z.literal('annotate'),
  hotSpot: BuildingBlockId,
  target: BuildingBlockId,
})
const unannotate = z.object({
  ...opBase,
  kind: z.literal('unannotate'),
  hotSpot: BuildingBlockId,
})
const markPivotal = z.object({ ...opBase, kind: z.literal('mark-pivotal'), target: BuildingBlockId })
const unmarkPivotal = z.object({
  ...opBase,
  kind: z.literal('unmark-pivotal'),
  target: BuildingBlockId,
})
const resolve = z.object({
  ...opBase,
  kind: z.literal('resolve'),
  target: BuildingBlockId,
  // Required: a missing `reference` key fails `.parse`. Shape is
  // deliberately unconstrained — a recorded value, not a live pointer (#49).
  reference: z.unknown(),
})
const reopen = z.object({ ...opBase, kind: z.literal('reopen'), target: BuildingBlockId })

export const Operation = z.discriminatedUnion('kind', [
  captureDomainEvent,
  identifyActor,
  identifySystem,
  reword,
  withdraw,
  reinstate,
  raiseHotSpot,
  place,
  unplace,
  sequence,
  unsequence,
  insertBetween,
  linkCause,
  unlinkCause,
  annotate,
  unannotate,
  markPivotal,
  unmarkPivotal,
  resolve,
  reopen,
])

export type Operation = z.infer<typeof Operation>
export type OperationKind = Operation['kind']
