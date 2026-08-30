import type { ContributionId, SessionId } from '~/plumbing/ids.ts'
import type { InFlightGuard } from './deps.ts'

/**
 * The in-process interpretation guard — at most one contribution in flight per
 * session. A plain `Map` behind the `InFlightGuard` interface; `host/` builds
 * one and injects it into every tick call and into the read capabilities.
 */
export const createInFlightGuard = (): InFlightGuard => {
  const bySession = new Map<SessionId, ContributionId>()
  return {
    sessions: () => new Set(bySession.keys()),
    contributions: () => new Set(bySession.values()),
    mark: (sessionId, contributionId) => {
      bySession.set(sessionId, contributionId)
    },
    clear: (sessionId) => {
      bySession.delete(sessionId)
    },
  }
}
