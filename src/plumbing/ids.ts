import { nanoid } from 'nanoid'
import { z } from 'zod'

/**
 * Branded id types and their generators. The id *types* live here so `plumbing/`
 * stays a true leaf (an `EventStore` signature can name a `WorkshopId` without
 * importing a context).
 *
 * `WorkshopId` is **canonical here** — as a Zod brand — because it spans both
 * bounded contexts (an id brand is plumbing). `domain-model-capture` and
 * `session-facilitation` both re-export this one definition rather than each
 * declaring their own. `z.infer<typeof WorkshopId>` is `string &
 * z.$brand<'WorkshopId'>`, so a value parsed by the schema is assignable here
 * with no cast at the seam.
 *
 * The remaining brands are type-only mirrors of the schemas their owning context
 * defines (`BuildingBlockId` in `domain-model-capture/domain/schema/`).
 */
export const WorkshopId = z.string().brand<'WorkshopId'>()
export type WorkshopId = z.infer<typeof WorkshopId>
export type SessionId = string & z.$brand<'SessionId'>
export type BuildingBlockId = string & z.$brand<'BuildingBlockId'>
export type ContributionId = string & z.$brand<'ContributionId'>
export type ProposalId = string & z.$brand<'ProposalId'>
export type QuestionId = string & z.$brand<'QuestionId'>

/**
 * `nanoid()` is a 21-char id over the URL-safe alphabet `A-Za-z0-9_-` — no `/`
 * or `+`, so a workshop slug needs no escaping. It is the only place `nanoid`
 * is imported (evergreen: one seam).
 */
export const newWorkshopId = (): WorkshopId => nanoid() as unknown as WorkshopId
export const newSessionId = (): SessionId => nanoid() as unknown as SessionId
export const newBuildingBlockId = (): BuildingBlockId => nanoid() as unknown as BuildingBlockId
export const newContributionId = (): ContributionId => nanoid() as unknown as ContributionId
export const newProposalId = (): ProposalId => nanoid() as unknown as ProposalId
export const newQuestionId = (): QuestionId => nanoid() as unknown as QuestionId

/** The resumable-workshop URL slug is the id itself — already URL-safe. */
export const workshopUrlSlug = (id: WorkshopId): string => id
