import type { WorkshopEvent } from '../schema/events.ts'
import type { WorkshopWriteModel } from './model.ts'

/**
 * The `Workshop` write-model fold — pure, returns a new model. `Scope Set` leaves
 * the write model untouched: scope status is a read-model concern (AD-023), not
 * an aggregate field, which is what makes `Set Scope` repeatable.
 */
export const evolve = (wm: WorkshopWriteModel, e: WorkshopEvent): WorkshopWriteModel => {
  switch (e.type) {
    case 'Workshop Started':
      return { started: true, format: e.format, creatorName: e.creatorName }
    case 'Scope Set':
      return wm
  }
}
