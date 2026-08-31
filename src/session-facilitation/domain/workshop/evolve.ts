import type { WorkshopEvent } from '../schema/events.ts'
import type { WorkshopWriteModel } from './model.ts'

/**
 * The `Workshop` write-model fold — pure, returns a new model. `Scope Set` leaves
 * the write model untouched: scope status is a read-model concern, not
 * an aggregate field, which is what makes `Set Scope` repeatable.
 */
export const evolve = (writeModel: WorkshopWriteModel, event: WorkshopEvent): WorkshopWriteModel => {
  switch (event.type) {
    case 'Workshop Started':
      return { started: true, format: event.format, creatorName: event.creatorName }
    case 'Scope Set':
      return writeModel
  }
}
