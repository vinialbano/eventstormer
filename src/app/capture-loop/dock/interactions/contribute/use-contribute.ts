import { computed, type Ref } from 'vue'
import type { SessionView } from '../../../types.ts'
import { submitContribution } from '../../../transport/session.ts'

interface DockEmit {
  mutated: () => void
}

/** Contribution capture — submit text and surface interpreting state to the composer. */
export const useContribute = (
  sessionId: Ref<string | null>,
  sessionView: Ref<SessionView | null>,
  emit: DockEmit,
) => {
  const catchingUp = computed(() =>
    (sessionView.value?.contributions ?? []).some(
      (contribution) => contribution.status === 'pending' || contribution.status === 'interpreting',
    ),
  )

  const onSubmit = async (text: string): Promise<void> => {
    if (sessionId.value === null) return
    await submitContribution(sessionId.value, text)
    emit.mutated()
  }

  return { catchingUp, onSubmit }
}
