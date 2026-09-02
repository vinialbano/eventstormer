import { refetchTargetsFor } from './refetch-graph.ts'
import type { CaptureZoneEvent, RefetchTarget } from './zone-events.ts'

interface ReadModelPort {
  refetch: () => Promise<void>
  load: (id: string) => Promise<void>
}

export interface CaptureEffectPorts {
  session: ReadModelPort
  proposals: ReadModelPort
  board: ReadModelPort
  account: ReadModelPort
}

export interface CaptureEffectContext {
  workshopId: string
}

const runTarget = async (
  target: RefetchTarget,
  ports: CaptureEffectPorts,
  context: CaptureEffectContext,
): Promise<void> => {
  switch (target) {
    case 'session':
    case 'board':
    case 'account':
      return ports[target].load(context.workshopId)
    case 'proposals':
      return ports.proposals.refetch()
  }
}

/** Single entry for zone-event → parallel refetch. No Vue imports. */
export const applyCaptureZoneEvent = async (
  event: CaptureZoneEvent,
  ports: CaptureEffectPorts,
  context: CaptureEffectContext,
): Promise<void> => {
  await Promise.all(refetchTargetsFor(event).map((target) => runTarget(target, ports, context)))
}
