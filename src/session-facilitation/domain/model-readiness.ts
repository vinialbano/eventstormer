/**
 * The F04 / F07 readiness gates as named domain predicates over the board
 * snapshot — the facilitator never self-reports "the model has enough shape".
 * Pure; no framework or Node import (domain rule). The application of these
 * predicates lives at the anticorruption seam; the vocabulary lives here.
 */

/** A handful of placed events, not a long board — the point past which a
 * suggested-milestone proposal (F07) is worth making. */
export const PIVOTAL_MIN_PLACED_EVENTS = 5

/** The slice of a board snapshot the readiness predicates read. Both
 * `readBoardSnapshot`'s published shape and the board write model satisfy it. */
export interface ReadinessSnapshot {
  follows: readonly unknown[]
  causedBy: readonly unknown[]
  blocks: readonly {
    kind: string
    withdrawn: boolean
    placement: 'backlog' | 'timeline'
    pivotal: boolean
  }[]
}

const placedDomainEventCount = (snapshot: ReadinessSnapshot): number =>
  snapshot.blocks.filter(
    (block) => block.kind === 'domain-event' && block.placement === 'timeline' && !block.withdrawn,
  ).length

/**
 * F04: a reword proposal is only meaningful once the model has structure to
 * reword against — at least one `follows` / `causedBy` edge, or at least one
 * pivotal mark.
 */
export const hasModelStructure = (snapshot: ReadinessSnapshot): boolean =>
  snapshot.follows.length > 0 ||
  snapshot.causedBy.length > 0 ||
  snapshot.blocks.some((block) => block.pivotal && !block.withdrawn)

/**
 * F07: a `mark-pivotal` / `unmark-pivotal` proposal is only made once the board
 * has enough placed domain events for milestones to help navigation.
 */
export const pivotalProposable = (snapshot: ReadinessSnapshot): boolean =>
  placedDomainEventCount(snapshot) >= PIVOTAL_MIN_PLACED_EVENTS
