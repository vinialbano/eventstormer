/**
 * The sole cross-context surface for domain-model-capture (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 */
export {
  OP_SCHEMA_VERSION,
  REPLAYABLE_OP_SCHEMA_VERSIONS,
  canReplay,
} from './domain/schema/schema-version.ts'
