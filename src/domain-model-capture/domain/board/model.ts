import type { z } from 'zod'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type {
  Author as AuthorSchema,
  BuildingBlock as BuildingBlockSchema,
} from '../schema/index.ts'

/** The four Building Block kinds (domain invariant — a discriminated union). */
export type BuildingBlockKind = z.infer<typeof BuildingBlockSchema>['kind']

/** An operation's recorded author — proposer (optional) + accepter (F01). */
export type Author = z.infer<typeof AuthorSchema>

/**
 * The slim write model `decide` guards on: only what an invariant
 * reads. Slices 3–4 add `follows` / `causedBy` adjacency and hot-spot state.
 */
export type BoardWriteModel = Map<BuildingBlockId, { kind: BuildingBlockKind; withdrawn: boolean }>

export const emptyWriteModel = (): BoardWriteModel => new Map()

/** A projected Building Block in the read-model snapshot. */
export interface SnapshotBlock {
  kind: BuildingBlockKind
  label: string
  withdrawn: boolean
  placement: 'backlog'
  provenance: Author
}

/**
 * The read-model snapshot — labels, placement, provenance. What `replay(log)`
 * yields and every consumer uses; `replay(log) === snapshot` is asserted on it.
 * `position` is the last folded operation's position, `-1` when empty.
 */
export interface BoardSnapshot {
  blocks: Map<BuildingBlockId, SnapshotBlock>
  position: number
}

export const emptySnapshot = (): BoardSnapshot => ({ blocks: new Map(), position: -1 })

/**
 * Why an operation was rejected. Every Slice 0 rejection is *systemic* — a human
 * fixes the input, it is never auto-retried. Transient failures (a
 * stale expected position) live on the EventStore's `AppendConflict`, not here.
 */
export type Rejection =
  | { kind: 'schema'; classification: 'systemic'; issues: z.core.$ZodIssue[] }
  | { kind: 'unknown-target'; classification: 'systemic'; target: string }
  | { kind: 'empty-label'; classification: 'systemic'; target: string }
  | { kind: 'duplicate-id'; classification: 'systemic'; id: string }
  | { kind: 'not-withdrawn'; classification: 'systemic'; target: string }
  | { kind: 'already-withdrawn'; classification: 'systemic'; target: string }
  | { kind: 'withdrawn-target'; classification: 'systemic'; target: string }
  | { kind: 'not-implemented-in-slice'; classification: 'systemic'; operation: string }
