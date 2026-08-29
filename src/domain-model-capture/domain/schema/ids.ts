import { z } from 'zod'

/**
 * The branded id schemas. `z.infer<typeof WorkshopId>` is `string &
 * z.$brand<'WorkshopId'>` — structurally identical to `plumbing/ids.ts`'s
 * `WorkshopId`, so a value parsed here is assignable at the plumbing seam with
 * no cast (ADR-004; design Tech Decisions — one brand mechanism, Zod's).
 *
 * Branding is static-only: `.parse` returns the string unchanged.
 */
export const WorkshopId = z.string().brand<'WorkshopId'>()
export const SessionId = z.string().brand<'SessionId'>()
export const BuildingBlockId = z.string().brand<'BuildingBlockId'>()
