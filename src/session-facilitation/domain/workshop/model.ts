import type { WorkshopId } from '~/plumbing/ids.ts'

/**
 * The `Workshop` write model `decide` guards on — `{ format, creatorName }` and
 * nothing else (design / path-scoped AGENTS.md). "Has the scope been set / is it
 * locked" is never an aggregate field: a true invariant never delegates its data
 * to another context. `started` is the birth guard only.
 */
export interface WorkshopWriteModel {
  started: boolean
  format?: 'big-picture'
  creatorName?: string
}

export const emptyWorkshop = (): WorkshopWriteModel => ({ started: false })

/**
 * Why a `Workshop` command was rejected. Every reason is *systemic* — a human
 * fixes the input, it is never auto-retried (AD-008).
 */
export type WorkshopRejection =
  | { kind: 'already-started'; classification: 'systemic' }
  | { kind: 'not-started'; classification: 'systemic' }
  | { kind: 'blank-name'; classification: 'systemic' }
  | { kind: 'name-too-long'; classification: 'systemic' }
  | { kind: 'blank-statement'; classification: 'systemic' }
  | { kind: 'statement-too-long'; classification: 'systemic' }

export type WorkshopCommand =
  | { type: 'Start Workshop'; workshopId: WorkshopId; creatorName: string; at: string }
  | { type: 'Set Scope'; workshopId: WorkshopId; statement: string; at: string }
