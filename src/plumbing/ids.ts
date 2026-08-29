import { nanoid } from 'nanoid'

/**
 * Branded id types and their generators. The brand *symbols* live here so
 * `plumbing/` stays a true leaf (an `EventStore` signature can name a
 * `WorkshopId` without importing a context); the Zod *schemas* that validate a
 * string into one of these live in `domain-model-capture/domain/schema/`.
 */

interface Brand<B extends string> {
  readonly __brand: B
}

export type WorkshopId = string & Brand<'WorkshopId'>
export type SessionId = string & Brand<'SessionId'>
export type BuildingBlockId = string & Brand<'BuildingBlockId'>

/**
 * `nanoid()` is a 21-char id over the URL-safe alphabet `A-Za-z0-9_-` — no `/`
 * or `+`, so a workshop slug needs no escaping. It is the only place `nanoid`
 * is imported (evergreen: one seam).
 */
export const newWorkshopId = (): WorkshopId => nanoid() as unknown as WorkshopId
export const newSessionId = (): SessionId => nanoid() as unknown as SessionId
export const newBuildingBlockId = (): BuildingBlockId => nanoid() as unknown as BuildingBlockId

/** The resumable-workshop URL slug is the id itself — already URL-safe. */
export const workshopUrlSlug = (id: WorkshopId): string => id
