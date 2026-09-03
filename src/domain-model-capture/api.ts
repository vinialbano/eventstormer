/**
 * The sole cross-context surface for domain-model-capture (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 */
export { anthropicOperationSchema } from './domain/anthropic-contract.ts'
export { type ApplyResult, applyOperation } from './infrastructure/apply-operation.ts'
export type { BoardAccessDeps } from './capabilities/board-access/deps.ts'
export { boardAccessRoutes } from './capabilities/board-access/http.ts'
export { editModelRoutes } from './capabilities/edit-model/http.ts'
export { flagHotSpotRoutes } from './capabilities/flag-hot-spot/http.ts'
export {
  type BuildingBlockRow,
  readBuildingBlocks,
} from './capabilities/board-access/read-building-blocks.ts'
export { readBoardSnapshot } from './capabilities/board-access/read-board-snapshot.ts'
export { decide } from './domain/board/decide.ts'
export { evolve } from './domain/board/evolve.ts'
export {
  computeTimelineLayout,
  type TimelineLayout,
} from './domain/timeline/compute-timeline-layout.ts'
export {
  type Author,
  type BoardSnapshot,
  type BoardWriteModel,
  type BuildingBlockKind,
  emptySnapshot,
  emptyWriteModel,
  type Rejection,
  type SnapshotBlock,
} from './domain/board/model.ts'
export { project } from './domain/board/project.ts'
export { replay, replayWriteModel } from './domain/board/replay.ts'
export {
  Author as AuthorSchema,
  BuildingBlock,
  BuildingBlockId,
  canReplay,
  OP_SCHEMA_VERSION,
  Operation,
  REPLAYABLE_OP_SCHEMA_VERSIONS,
  WorkshopId,
} from './domain/schema/index.ts'
export type { OperationKind } from './domain/schema/index.ts'
