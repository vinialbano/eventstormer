import { z } from 'zod'
import { BuildingBlockId } from './ids.ts'

/**
 * The four Building Block kinds, as one discriminated union keyed on `kind`
 * (domain invariant — each kind permits different relations and markers).
 *
 * A hot spot's informational/model-affecting split is a boolean, not an enum:
 * the distinction is binary and about whether a resolution is required (F08).
 * `true` = model-affecting (the default, ADR-004 #32); `false` = informational.
 */
const shared = { id: BuildingBlockId, label: z.string() }

const domainEvent = z.object({ ...shared, kind: z.literal('domain-event') })
const actor = z.object({ ...shared, kind: z.literal('actor') })
const system = z.object({ ...shared, kind: z.literal('system') })
const hotSpot = z.object({
  ...shared,
  kind: z.literal('hot-spot'),
  modelAffecting: z.boolean().default(true),
})

export const BuildingBlock = z.discriminatedUnion('kind', [domainEvent, actor, system, hotSpot])
