/**
 * The sole cross-context surface for domain-model-capture (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 */
export {
  Author,
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
