/** The operation-log schema SSOT — one framework-free definition (ADR-004). */
export { Author } from './author.ts'
export { BuildingBlock } from './building-blocks.ts'
export { BuildingBlockId, SessionId, WorkshopId } from './ids.ts'
export { Operation } from './operations.ts'
export type { OperationKind } from './operations.ts'
export {
  canReplay,
  OP_SCHEMA_VERSION,
  REPLAYABLE_OP_SCHEMA_VERSIONS,
} from './schema-version.ts'
