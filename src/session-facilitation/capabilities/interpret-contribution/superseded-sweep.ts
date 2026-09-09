import { readBoardSnapshot } from '../../../domain-model-capture/api.ts'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { sessionProposalIds } from '../../domain/read-models/session-summary.ts'
import { decide as decideProposal } from '../../domain/proposal/decide.ts'
import { replay as replayProposal } from '../../domain/proposal/replay.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import { openSessions } from '../../infrastructure/session-index.ts'
import { proposalStream, sessionStream, storedOps } from '../../infrastructure/streams.ts'
import type { InterpretContributionDeps } from './deps.ts'

/** The current reword target + label, folding the last `Model Change Edited`. */
const rewordState = (
  events: ProposalEvent[],
): { target: BuildingBlockId; newLabel: string } | undefined => {
  const birth = events.find((event) => event.type === 'Model Change Proposed')
  if (birth?.type !== 'Model Change Proposed' || birth.intent.kind !== 'reword') return undefined
  let target = birth.intent.target
  let newLabel = birth.intent.newLabel
  for (const event of events) {
    if (event.type !== 'Model Change Edited') continue
    if (event.changed.target !== undefined) target = event.changed.target
    if (event.changed.newLabel !== undefined) newLabel = event.changed.newLabel
  }
  return { target, newLabel }
}

/**
 * Reconciliation pass for the `reword` last-write-wins race. For each open
 * session, an `APPLIED` `reword` model-change proposal with no `Model Change
 * Superseded` marker: if the board's current label for the reword target differs
 * from this proposal's `newLabel`, a later reword overtook it — append `Record
 * Model Change Superseded { supersededByLabel }` to this (the earlier) proposal's
 * stream.
 *
 * Idempotent: the marker-present guard and the label check both re-evaluate
 * cleanly next tick. Open-sessions only — a reword race after close is not
 * reachable (a closed session rejects accepts), consistent with the accepted
 * bound on the other reconciliation passes.
 */
export const supersededRewordSweep = (deps: InterpretContributionDeps): void => {
  for (const { workshopId, sessionId } of openSessions(deps.db)) {
    const sessionEvents = deps.store
      .read(sessionStream(sessionId))
      .map((row) => SessionEvent.parse(row.operation))
    const boardBlocks = readBoardSnapshot({ store: deps.store }, workshopId).blocks

    for (const proposalId of sessionProposalIds(sessionEvents)) {
      const events = deps.store
        .read(proposalStream(proposalId))
        .map((row) => ProposalEvent.parse(row.operation))
      const writeModel = replayProposal(events)
      if (writeModel.disposition !== 'APPLIED' || writeModel.superseded === true) continue

      const reword = rewordState(events)
      if (reword === undefined) continue

      const boardLabel = boardBlocks.find((block) => block.id === reword.target)?.label
      if (boardLabel === undefined || boardLabel === reword.newLabel) continue

      const decided = decideProposal(writeModel, {
        type: 'Record Model Change Superseded',
        proposalId,
        target: reword.target,
        supersededByLabel: boardLabel,
        at: deps.clock(),
      })
      if (!decided.ok || decided.value.length === 0) continue
      const position = deps.store.read(proposalStream(proposalId)).length - 1
      deps.store.append(proposalStream(proposalId), position, storedOps(decided.value))
    }
  }
}
