/**
 * The sole cross-context surface for domain-model-capture (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 */
export { anthropicOperationSchema } from './domain/anthropic-contract.ts'
export { decide } from './domain/board/decide.ts'
export { evolve } from './domain/board/evolve.ts'
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
  SessionId,
  WorkshopId,
} from './domain/schema/index.ts'
export type { OperationKind } from './domain/schema/index.ts'
