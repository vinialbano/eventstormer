import type { ReferenceSite } from './reword-references.ts'

export type RewordConfirmPhase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; sites: ReferenceSite[] }
  | { kind: 'posting'; sites: ReferenceSite[] }

export const idleConfirm = (): RewordConfirmPhase => ({ kind: 'idle' })

export const startConfirmLoad = (): RewordConfirmPhase => ({ kind: 'loading' })

export const confirmLoadSucceeded = (sites: ReferenceSite[]): RewordConfirmPhase => ({
  kind: 'ready',
  sites,
})

export const confirmLoadFailed = (): RewordConfirmPhase => ({ kind: 'error' })

export const startConfirmPost = (sites: ReferenceSite[]): RewordConfirmPhase => ({
  kind: 'posting',
  sites,
})

export const canConfirmReword = (phase: RewordConfirmPhase): boolean => phase.kind === 'ready'

export const confirmIsBusy = (phase: RewordConfirmPhase): boolean =>
  phase.kind === 'loading' || phase.kind === 'posting'

export const confirmSites = (phase: RewordConfirmPhase): ReferenceSite[] =>
  phase.kind === 'ready' || phase.kind === 'posting' ? phase.sites : []
