/**
 * The sole cross-context surface for derived-artifact-generation (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 */
export {}
