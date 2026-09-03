import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'

/**
 * The `Workshop` write model `decide` guards on. `{ format, creatorName }` stay
 * read-model concerns; the close-ceremony fields are true aggregate state —
 * an invariant reads each one: `stakeholderCheckRun` makes `Record Stakeholder
 * Check` once-only, `stakeholderComplete` sets the chosen problem's
 * qualification, `problemDecided` makes choose/skip once-only. `started` is the
 * birth guard only.
 */
export interface WorkshopWriteModel {
  started: boolean
  format?: 'big-picture'
  creatorName?: string
  stakeholderCheckRun: boolean
  stakeholderComplete?: boolean
  problemDecided: boolean
}

export const emptyWorkshop = (): WorkshopWriteModel => ({
  started: false,
  stakeholderCheckRun: false,
  problemDecided: false,
})

/**
 * Why a `Workshop` command was rejected. Every reason is *systemic* — a human
 * fixes the input, it is never auto-retried.
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
  | {
      type: 'Record Stakeholder Check'
      workshopId: WorkshopId
      complete: boolean
      absentNames: string[]
      at: string
    }
  | { type: 'Choose Problem'; workshopId: WorkshopId; problemHotSpotId: BuildingBlockId; at: string }
  | {
      type: 'Skip Problem Choice'
      workshopId: WorkshopId
      reason: 'none-chosen' | 'no-impediments-yet'
      at: string
    }
