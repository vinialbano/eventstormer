import { z } from 'zod'

/**
 * The branded id schemas for this context.
 *
 * `WorkshopId` is canonical in `plumbing/ids.ts` — it spans both bounded
 * contexts, so it is defined once there and re-exported here to keep the
 * context's schema surface a single import. `BuildingBlockId` is this context's
 * own; `z.infer` of it is `string & z.$brand<'BuildingBlockId'>`, structurally
 * identical to `plumbing/ids.ts`'s mirror, so a parsed value crosses the
 * plumbing seam with no cast (docs/adr/004).
 *
 * Branding is static-only: `.parse` returns the string unchanged.
 */
export { WorkshopId } from '~/plumbing/ids.ts'
export const BuildingBlockId = z.string().brand<'BuildingBlockId'>()
