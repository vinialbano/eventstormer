import type { SessionView } from '../../types.ts'
import type { CaptureEffectPorts } from './apply-capture-effect.ts'

export const shouldLoadBoardOnBootstrap = (view: SessionView | null): boolean =>
  (view?.contributions.length ?? 0) > 0

export const shouldLoadProposals = (sessionId: string | null, sessionOpen: boolean): boolean =>
  sessionId !== null && sessionOpen

export const coldLoadCaptureScreen = async (
  workshopId: string,
  ports: CaptureEffectPorts,
  readSessionView: () => SessionView | null,
): Promise<void> => {
  await ports.session.load(workshopId)
  if (shouldLoadBoardOnBootstrap(readSessionView())) {
    await ports.board.load(workshopId)
  }
}
