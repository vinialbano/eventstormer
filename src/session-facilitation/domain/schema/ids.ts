import { z } from 'zod'

/**
 * The branded id schemas for `session-facilitation`.
 *
 * `WorkshopId` is canonical in `plumbing/ids.ts` (it is shared with
 * `domain-model-capture`) and re-exported here. `SessionId`, `ContributionId`,
 * `ProposalId` and `QuestionId` are this context's own. `BuildingBlockId` is
 * `domain-model-capture`'s; the `Proposal Accepted` / `Operation Applied` events
 * record one, so a structural brand mirror is declared here for validation —
 * `z.string().brand<'BuildingBlockId'>()` infers exactly the plumbing mirror
 * type, so a value crosses the seam with no cast.
 *
 * Branding is static-only: `.parse` returns the string unchanged.
 */
export { WorkshopId } from '~/plumbing/ids.ts'

export const SessionId = z.string().brand<'SessionId'>()
export const ContributionId = z.string().brand<'ContributionId'>()
export const ProposalId = z.string().brand<'ProposalId'>()
export const QuestionId = z.string().brand<'QuestionId'>()
export const BuildingBlockId = z.string().brand<'BuildingBlockId'>()
