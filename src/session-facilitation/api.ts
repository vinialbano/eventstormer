/**
 * The sole cross-context surface for session-facilitation (ADR-002). `host/`
 * reaches this context only through here — never its `domain/`, `capabilities/`,
 * or `infrastructure/`.
 *
 * Every capability router, the three interpretation tick functions, and the
 * in-flight-guard factory + its dep type are re-exported for the composition
 * root to wire (`host/config.ts`, `host/routes.ts`, `host/scheduler.ts`).
 */
export { startWorkshopRoutes } from './capabilities/start-workshop/http.ts'
export type { StartWorkshopDeps } from './capabilities/start-workshop/deps.ts'
export { setScopeRoutes } from './capabilities/set-scope/http.ts'
export type { SetScopeDeps } from './capabilities/set-scope/deps.ts'
export { startSessionRoutes } from './capabilities/start-session/http.ts'
export type { StartSessionDeps } from './capabilities/start-session/deps.ts'
export { makeContributionRoutes } from './capabilities/make-contribution/http.ts'
export type { MakeContributionDeps } from './capabilities/make-contribution/deps.ts'
export { reviewProposalRoutes } from './capabilities/review-proposal/http.ts'
export type { ReviewProposalDeps } from './capabilities/review-proposal/deps.ts'
export { reviewResolutionRoutes } from './capabilities/review-resolution/http.ts'
export type { ReviewResolutionDeps } from './capabilities/review-resolution/deps.ts'
export { recordStakeholderCheckRoutes } from './capabilities/record-stakeholder-check/http.ts'
export type { RecordStakeholderCheckDeps } from './capabilities/record-stakeholder-check/deps.ts'
export { chooseProblemRoutes } from './capabilities/choose-problem/http.ts'
export type { ChooseProblemDeps } from './capabilities/choose-problem/deps.ts'
export { closeSessionRoutes } from './capabilities/close-session/http.ts'
export type { CloseSessionDeps } from './capabilities/close-session/deps.ts'

export {
  askOpeningQuestion,
  interpretContribution,
  reconcilePendingDerivations,
} from './capabilities/interpret-contribution/interpret.ts'
export { createInFlightGuard } from './capabilities/interpret-contribution/in-flight.ts'
export type { InFlightGuard, InterpretContributionDeps } from './capabilities/interpret-contribution/deps.ts'

export { applySessionFacilitationMigrations } from './infrastructure/migrations.ts'
export { readArtifactSource } from './infrastructure/read-artifact-source.ts'
export type { SessionIndexDb } from './infrastructure/session-index.ts'
export { createAnthropicFacilitator } from './infrastructure/facilitator/anthropic-adapter.ts'
export type { Facilitator } from './infrastructure/facilitator/port.ts'
export type { TrackIdMint } from './infrastructure/facilitator/map.ts'
export type { FacilitationTurn, OpeningQuestion } from './infrastructure/facilitator/turn-schema.ts'
