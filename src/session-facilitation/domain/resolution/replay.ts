import type { ResolutionEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { emptyResolution, type ResolutionWriteModel } from './model.ts'

/** Rebuild the `Resolution` write model by folding its stream from empty. */
export const replay = (events: ResolutionEvent[]): ResolutionWriteModel =>
  events.reduce(evolve, emptyResolution())
