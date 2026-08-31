import type { SessionEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { emptySession, type SessionWriteModel } from './model.ts'

/** Rebuild the `Session` write model by folding its stream from empty. */
export const replay = (events: SessionEvent[]): SessionWriteModel =>
  events.reduce(evolve, emptySession())
