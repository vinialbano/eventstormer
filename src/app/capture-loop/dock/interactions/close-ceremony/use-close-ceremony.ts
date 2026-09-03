import { ref } from 'vue'
import {
  closeSession,
  recordChosenProblem,
  recordStakeholderCheck,
  type ChosenProblemInput,
  type CloseReport,
} from '../../../transport/close.ts'

interface DockEmit {
  mutated: () => void
  boardDirty: () => void
}

/**
 * `idle` → `stakeholder` → `problem` → `confirm` → `closed`. The session is
 * OPEN for every step but the last: `confirm` is the only call that POSTs
 * `/sessions/:id/close`, so the sweep and the summary freeze happen once, on an
 * explicit press. The stakeholder answer and the chosen problem are recorded
 * first, on their own steps, while contributions are still accepted.
 */
export type CeremonyStep = 'idle' | 'stakeholder' | 'problem' | 'confirm' | 'closed'

/**
 * Drives the in-dock close ceremony. Presentational cards call these actions and
 * read `step` / `busy` / `error`; the composable owns the sequence and the POSTs
 * and never freezes the session before `confirm`. A failed step stays put with
 * an error and advances nothing — the session is untouched.
 */
export const useCloseCeremony = (
  workshopId: () => string,
  sessionId: () => string | null,
  emit: DockEmit,
) => {
  const step = ref<CeremonyStep>('idle')
  const busy = ref(false)
  const error = ref<string | null>(null)
  const report = ref<CloseReport | null>(null)

  const run = async (work: Promise<unknown>, next: CeremonyStep): Promise<void> => {
    busy.value = true
    error.value = null
    try {
      await work
      step.value = next
    } catch {
      error.value = "Couldn't record that — try again"
    } finally {
      busy.value = false
    }
  }

  const start = (): void => {
    step.value = 'stakeholder'
    error.value = null
  }

  const cancel = (): void => {
    if (step.value === 'closed') return
    step.value = 'idle'
    error.value = null
  }

  const back = (): void => {
    if (step.value === 'confirm') step.value = 'problem'
  }

  const answerStakeholder = (complete: boolean, absentNames: string[] = []): Promise<void> =>
    run(recordStakeholderCheck(workshopId(), { complete, absentNames }), 'problem')

  const chooseProblem = (problemHotSpotId: string): Promise<void> =>
    submitProblem({ problemHotSpotId })

  const skipProblem = (reason: 'none-chosen' | 'no-impediments-yet'): Promise<void> =>
    submitProblem({ skipReason: reason })

  const submitProblem = (input: ChosenProblemInput): Promise<void> =>
    run(recordChosenProblem(workshopId(), input), 'confirm')

  const confirm = async (): Promise<void> => {
    const id = sessionId()
    if (id === null) return
    busy.value = true
    error.value = null
    try {
      report.value = await closeSession(id)
      step.value = 'closed'
      emit.boardDirty()
      emit.mutated()
    } catch {
      error.value = "Couldn't close the session — try again"
    } finally {
      busy.value = false
    }
  }

  return {
    step,
    busy,
    error,
    report,
    start,
    cancel,
    back,
    answerStakeholder,
    chooseProblem,
    skipProblem,
    confirm,
  }
}
