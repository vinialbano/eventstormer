import { type Ref } from 'vue'
import { useInterpretationPoll } from './use-interpretation-poll.ts'
import { useAccountStore } from '../../stores/account.ts'
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
  const poll = useInterpretationPoll()

  const ports = {
    session: { load: session.load.bind(session), refetch: session.refetch.bind(session) },
    proposals: { load: proposals.load.bind(proposals), refetch: proposals.refetch.bind(proposals) },
    board: { load: board.load.bind(board), refetch: board.refetch.bind(board) },
    account: { load: account.load.bind(account), refetch: account.refetch.bind(account) },
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
    poll,
    onMutated,
    onBoardDirty,
    coldLoad,
    shouldLoadProposals,
    loadProposals,
  }
}
