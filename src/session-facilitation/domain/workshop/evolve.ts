import type { WorkshopEvent } from '../schema/events.ts'
import type { WorkshopWriteModel } from './model.ts'

/**
 * The `Workshop` write-model fold — pure, returns a new model. `Scope Set` leaves
 * the write model untouched: scope status is a read-model concern, not an
 * aggregate field, which is what makes `Set Scope` repeatable. The close-ceremony
 * events set the once-only guards and the chosen-problem qualification input.
 */
export const evolve = (writeModel: WorkshopWriteModel, event: WorkshopEvent): WorkshopWriteModel => {
  switch (event.type) {
    case 'Workshop Started':
      return {
        started: true,
        format: event.format,
        creatorName: event.creatorName,
        stakeholderCheckRun: false,
        problemDecided: false,
      }
    case 'Scope Set':
      return writeModel
    case 'Stakeholder Check Recorded':
      return { ...writeModel, stakeholderCheckRun: true, stakeholderComplete: event.complete }
    case 'Problem Chosen':
    case 'Problem Choice Skipped':
      return { ...writeModel, problemDecided: true }
  }
}
