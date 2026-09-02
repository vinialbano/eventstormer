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

/** What `decide` reads on a Building Block — kind plus withdrawn. */
export interface WriteBlock {
  kind: BuildingBlockKind
  withdrawn: boolean
}

/**
 * The slim write model `decide` guards on: only what an invariant
 * reads. `follows` is predecessor → successors; `causedBy` is effect → causes.
 * `annotates` holds the live hot-spot → target edge (one per hot spot);
 * `hotSpotResolved` is what the `resolve` / `reopen` guards read. A hot spot's
 * `reference` is not here — no invariant reads it.
 */
export interface BoardWriteModel {
  blocks: Map<BuildingBlockId, WriteBlock>
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>
  causedBy: Map<BuildingBlockId, Set<BuildingBlockId>>
  annotates: Map<BuildingBlockId, BuildingBlockId>
  hotSpotResolved: Map<BuildingBlockId, boolean>
}

export const emptyWriteModel = (): BoardWriteModel => ({
  blocks: new Map(),
  follows: new Map(),
  causedBy: new Map(),
  annotates: new Map(),
  hotSpotResolved: new Map(),
})

/** A projected Building Block in the read-model snapshot. */
export interface SnapshotBlock {
  kind: BuildingBlockKind
  label: string
  withdrawn: boolean
  placement: 'backlog' | 'timeline'
  pivotal: boolean
  provenance: Author
  // Meaningful only when kind === 'hot-spot':
  modelAffecting?: boolean
  annotates?: BuildingBlockId | null
  resolved?: boolean
  reference?: unknown
}

export interface FollowsEdge {
  predecessor: BuildingBlockId
  successor: BuildingBlockId
}

export interface CausedByEdge {
  cause: BuildingBlockId
  effect: BuildingBlockId
}

/**
 * The read-model snapshot — labels, placement, provenance, and published
 * topology. What `replay(log)` yields and every consumer uses;
 * `replay(log) === snapshot` is asserted on it. `position` is the last folded
 * operation's position, `-1` when empty.
 */
export interface BoardSnapshot {
  blocks: Map<BuildingBlockId, SnapshotBlock>
  follows: readonly FollowsEdge[]
  causedBy: readonly CausedByEdge[]
  hotSpotCount: number
  position: number
}

export const emptySnapshot = (): BoardSnapshot => ({
  blocks: new Map(),
  follows: [],
  causedBy: [],
  hotSpotCount: 0,
  position: -1,
})

/**
 * Why an operation was rejected. Every rejection is *systemic* — a human
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
  | { kind: 'cycle'; classification: 'systemic'; path: BuildingBlockId[] }
  | { kind: 'kind-permission'; classification: 'systemic'; operation: string; reason: string }
  | { kind: 'already-related'; classification: 'systemic' }
  | { kind: 'missing-edge'; classification: 'systemic' }
  | { kind: 'already-resolved'; classification: 'systemic'; target: string }
  | { kind: 'not-resolved'; classification: 'systemic'; target: string }
