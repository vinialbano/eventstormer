import { type Ref, watch } from 'vue'
import { useInterpretationPoll } from './use-interpretation-poll.ts'
import { useAccountStore } from '../../stores/account.ts'
import { useArtifactsStore } from '../../stores/artifacts.ts'
import { useBoardStore } from '../../stores/board.ts'
import { useProposalsStore } from '../../stores/proposals.ts'
import { useSessionStore } from '../../stores/session.ts'
import { applyCaptureZoneEvent } from '../orchestration/apply-capture-effect.ts'
import {
  coldLoadCaptureScreen,
  shouldLoadProposals as shouldLoadProposalsForSession,
} from '../orchestration/capture-bootstrap.ts'

/** Thin Vue adapter wiring Pinia stores to shell orchestration. */
export const useCaptureOrchestration = (workshopId: Ref<string>) => {
  const session = useSessionStore()
  const proposals = useProposalsStore()
  const board = useBoardStore()
  const account = useAccountStore()
  const artifacts = useArtifactsStore()
  const poll = useInterpretationPoll()

  // The artifacts store holds no sibling-store reference; the session id it needs
  // for the transcript segment is pushed in as the session view resolves.
  watch(
    () => session.sessionId,
    (sessionId) => {
      artifacts.setSession(sessionId)
    },
    { immediate: true },
  )

  const ports = {
    session: { load: session.load.bind(session), refetch: session.refetch.bind(session) },
    proposals: { load: proposals.load.bind(proposals), refetch: proposals.refetch.bind(proposals) },
    board: { load: board.load.bind(board), refetch: board.refetch.bind(board) },
    account: { load: account.load.bind(account), refetch: account.refetch.bind(account) },
    artifacts: { load: artifacts.load.bind(artifacts), refetch: artifacts.refetch.bind(artifacts) },
  }

  const context = (): { workshopId: string } => ({ workshopId: workshopId.value })

  const onMutated = (): Promise<void> => poll.refetchNow()

  const onBoardDirty = (): Promise<void> => applyCaptureZoneEvent('board-dirty', ports, context())

  const coldLoad = (): Promise<void> =>
    coldLoadCaptureScreen(workshopId.value, ports, () => session.view)

  const shouldLoadProposals = (): boolean =>
    shouldLoadProposalsForSession(session.sessionId, session.sessionOpen)

  const loadProposals = (): Promise<void> => {
    const sessionId = session.sessionId
    if (sessionId === null) return Promise.resolve()
    return proposals.load(sessionId)
  }

  return {
    session,
    proposals,
    board,
    account,
    artifacts,
    poll,
    onMutated,
    onBoardDirty,
    coldLoad,
    shouldLoadProposals,
    loadProposals,
  }
}
