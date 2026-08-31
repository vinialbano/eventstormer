import type { WorkshopEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { emptyWorkshop, type WorkshopWriteModel } from './model.ts'

/** Rebuild the `Workshop` write model by folding its stream from empty. */
export const replay = (events: WorkshopEvent[]): WorkshopWriteModel =>
  events.reduce(evolve, emptyWorkshop())
