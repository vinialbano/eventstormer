import { type ModelBlock, type ModelJson, type ModelWorkshop } from './model-json.ts'

interface SerialiseSnapshot {
  blocks: readonly ModelBlock[]
  follows: readonly { predecessor: string; successor: string }[]
  causedBy: readonly { cause: string; effect: string }[]
}

export interface SerialiseInput {
  snapshot: SerialiseSnapshot
  source: ModelWorkshop
  boardPosition: number
  sessionRecordPosition: number
  renderedAt: string
}

const party = (value: { name: string }): { name: string } => ({ name: value.name })

const blockJson = (block: ModelBlock): ModelBlock => ({
  id: block.id,
  kind: block.kind,
  label: block.label,
  withdrawn: block.withdrawn,
  placement: block.placement,
  pivotal: block.pivotal,
  provenance: {
    ...(block.provenance.proposer === undefined
      ? {}
      : { proposer: party(block.provenance.proposer) }),
    accepter: party(block.provenance.accepter),
  },
  ...(block.modelAffecting === undefined ? {} : { modelAffecting: block.modelAffecting }),
  ...(block.annotates === undefined ? {} : { annotates: block.annotates }),
  ...(block.resolved === undefined ? {} : { resolved: block.resolved }),
  ...(block.reference === undefined ? {} : { reference: block.reference }),
})

/**
 * Deterministic Board snapshot + workshop record → `ModelJson`. The document is
 * assembled in a fixed key order; `buildingBlocks` sort by id, `follows` by
 * `(predecessor, successor)`, `causedBy` by `(cause, effect)` — so two exports
 * of the same source state are byte-identical regardless of operation-log
 * insertion order. `boardPosition` is normalised `-1 → 0`. Nothing here reads a
 * contribution body, a stored rationale, or an evidence span, and the document
 * declares no external documentation toolchain.
 */
export const serialise = (input: SerialiseInput): ModelJson => ({
  format: 'eventstormer.model',
  formatVersion: 1,
  renderedAt: input.renderedAt,
  boardPosition: input.boardPosition < 0 ? 0 : input.boardPosition,
  sessionRecordPosition: input.sessionRecordPosition,
  workshop: {
    format: input.source.format,
    scope: input.source.scope,
    narratorCount: input.source.narratorCount,
    stakeholderCheck: input.source.stakeholderCheck,
    chosenProblem: input.source.chosenProblem,
  },
  buildingBlocks: [...input.snapshot.blocks]
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map(blockJson),
  follows: [...input.snapshot.follows]
    .toSorted(
      (left, right) =>
        left.predecessor.localeCompare(right.predecessor) ||
        left.successor.localeCompare(right.successor),
    )
    .map((edge) => ({ predecessor: edge.predecessor, successor: edge.successor })),
  causedBy: [...input.snapshot.causedBy]
    .toSorted(
      (left, right) =>
        left.cause.localeCompare(right.cause) || left.effect.localeCompare(right.effect),
    )
    .map((edge) => ({ cause: edge.cause, effect: edge.effect })),
})
