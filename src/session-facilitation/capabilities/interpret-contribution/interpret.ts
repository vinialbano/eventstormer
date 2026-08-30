import { readBuildingBlocks } from '../../../domain-model-capture/api.ts'
import type { ContributionId, ProposalId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { facilitationContext } from '../../domain/read-models/facilitation.ts'
import { priorSessionHistory, sessionProposalIds } from '../../domain/read-models/session-summary.ts'
import { sessionView } from '../../domain/read-models/session-view.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../../domain/schema/events.ts'
import { decide as decideProposal } from '../../domain/proposal/decide.ts'
import { replay as replayProposal } from '../../domain/proposal/replay.ts'
import { decide as decideSession } from '../../domain/session/decide.ts'
import { replay as replaySession } from '../../domain/session/replay.ts'
import { markDerivedTrack, readDerivedTrackKeys } from '../../infrastructure/derived-track.ts'
import { mapTurn } from '../../infrastructure/facilitator/map.ts'
import { buildInstructions, buildTurnInput } from '../../infrastructure/facilitator/prompt.ts'
import { close as closeSessionIndexRow, openSessions, sessionIdsFor } from '../../infrastructure/session-index.ts'
import { proposalStream, sessionStream, storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { InterpretContributionDeps } from './deps.ts'

type Interpreted = Extract<SessionEvent, { type: 'Contribution Interpreted' }>

const readSession = (deps: InterpretContributionDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((r) => SessionEvent.parse(r.operation))

const readProposal = (deps: InterpretContributionDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((r) => ProposalEvent.parse(r.operation))

const readWorkshop = (deps: InterpretContributionDeps, id: WorkshopId): WorkshopEvent[] =>
  deps.store.read(workshopStream(id)).map((r) => WorkshopEvent.parse(r.operation))

/** Append decided `Session` events at the stream's current head. */
const appendSession = (
  deps: InterpretContributionDeps,
  id: SessionId,
  events: SessionEvent[],
): void => {
  if (events.length === 0) return
  const position = deps.store.read(sessionStream(id)).length - 1
  deps.store.append(sessionStream(id), position, storedOps(events))
}

/**
 * Assemble the facilitator's per-turn context: the workshop scope, the current
 * building blocks (`readBuildingBlocks`, not the op log), the prior closed
 * sessions' summaries, and this session's open questions + recent transcript.
 */
const assembleFacilitationContext = (
  deps: InterpretContributionDeps,
  workshopId: WorkshopId,
  events: SessionEvent[],
) => {
  const scopeStatement = [...readWorkshop(deps, workshopId)]
    .reverse()
    .find((e) => e.type === 'Scope Set')?.statement

  const buildingBlocks = readBuildingBlocks({ store: deps.store, clock: deps.clock }, workshopId).map(
    (b) => ({ kind: b.kind, label: b.label }),
  )

  const view = sessionView(events)

  const { closed } = sessionIdsFor(deps.db, workshopId)
  const priors = closed.map((id) => {
    const closedEvents = readSession(deps, id)
    const blocksAdded = sessionProposalIds(closedEvents).reduce(
      (n, pid) => n + readProposal(deps, pid).filter((e) => e.type === 'Operation Applied').length,
      0,
    )
    return { events: closedEvents, blocksAdded }
  })

  return facilitationContext({
    recentTranscript: view.transcript.map((t) => `${t.speaker}: ${t.text}`),
    openQuestions: view.openQuestions.map((q) => q.text),
    ...(scopeStatement === undefined ? {} : { scopeStatement }),
    priorSummaries: priorSessionHistory(priors),
    buildingBlocks,
  })
}

/**
 * Derive every stream implied by a `Contribution Interpreted` event (AD-021).
 * Idempotent: a track already marked in `derived_track` is skipped, and each
 * `decide` is a no-op once its effect exists. Runs with no model call.
 */
const deriveTracks = (deps: InterpretContributionDeps, event: Interpreted): void => {
  const derived = readDerivedTrackKeys(deps.db)

  event.tracks.forEach((track, index) => {
    if (derived.has(`${event.contributionId}::${String(index)}`)) return

    switch (track.track) {
      case 'propose-building-block': {
        const decided = decideProposal(replayProposal(readProposal(deps, track.proposalId)), {
          type: 'Propose Building Block',
          proposalId: track.proposalId,
          sessionId: event.sessionId,
          contributionId: event.contributionId,
          blockKind: track.blockKind,
          label: track.label,
          bar: track.bar,
          ...(track.evidenceSpan === undefined ? {} : { evidenceSpan: track.evidenceSpan }),
          at: event.at,
        })
        if (decided.ok && decided.value.length > 0) {
          deps.store.append(proposalStream(track.proposalId), -1, storedOps(decided.value))
        }
        break
      }
      case 'flag-phase': {
        const decided = decideSession(replaySession(readSession(deps, event.sessionId)), {
          type: 'Ask Question',
          sessionId: event.sessionId,
          questionId: track.questionId,
          kind: 'phase',
          text: track.questionText,
          at: event.at,
        })
        if (decided.ok) appendSession(deps, event.sessionId, decided.value)
        break
      }
      case 'attribute-to-other-format': {
        const events = readSession(deps, event.sessionId)
        const already = events.some(
          (e) =>
            e.type === 'Contribution Attributed To Another Format' &&
            e.contributionId === event.contributionId &&
            e.format === track.format &&
            e.note === track.note,
        )
        if (!already) {
          const decided = decideSession(replaySession(events), {
            type: 'Attribute Contribution',
            sessionId: event.sessionId,
            contributionId: event.contributionId,
            format: track.format,
            note: track.note,
            at: event.at,
          })
          if (decided.ok) appendSession(deps, event.sessionId, decided.value)
        }
        break
      }
      case 'answer-question': {
        const decided = decideSession(replaySession(readSession(deps, event.sessionId)), {
          type: 'Answer Question',
          sessionId: event.sessionId,
          questionId: track.questionId,
          byContributionId: event.contributionId,
          at: event.at,
        })
        if (decided.ok) appendSession(deps, event.sessionId, decided.value)
        else console.warn(`answer-question: dropped unknown/resolved questionId ${track.questionId}`)
        break
      }
    }

    markDerivedTrack(deps.db, event.contributionId, index)
  })

  // The free follow-up question — once per turn, idempotent via the questions map.
  if (event.askQuestionId !== undefined && event.askQuestionText !== undefined) {
    const decided = decideSession(replaySession(readSession(deps, event.sessionId)), {
      type: 'Ask Question',
      sessionId: event.sessionId,
      questionId: event.askQuestionId,
      kind: 'free',
      text: event.askQuestionText,
      at: event.at,
    })
    if (decided.ok) appendSession(deps, event.sessionId, decided.value)
  }
}

const runInterpretation = async (
  deps: InterpretContributionDeps,
  workshopId: WorkshopId,
  sessionId: SessionId,
  contributionId: ContributionId,
): Promise<void> => {
  deps.inFlight.mark(sessionId, contributionId)
  try {
    const events = readSession(deps, sessionId)
    const segment = events.find(
      (e): e is Extract<SessionEvent, { type: 'Contribution Made' }> =>
        e.type === 'Contribution Made' && e.contributionId === contributionId,
    )
    if (segment === undefined) return

    const context = assembleFacilitationContext(deps, workshopId, events)
    const input = {
      instructions: buildInstructions(),
      prompt: buildTurnInput(context, { speaker: segment.speaker, body: segment.body }),
    }

    const turn = await deps.facilitator.interpret(input)
    if (!turn.ok) {
      if (turn.error.kind === 'provider-down') return
      const decided = decideSession(replaySession(readSession(deps, sessionId)), {
        type: 'Fail Interpretation',
        sessionId,
        contributionId: segment.contributionId,
        reason: turn.error.detail.slice(0, 500) || 'schema-invalid',
        at: deps.clock(),
      })
      if (decided.ok) appendSession(deps, sessionId, decided.value)
      return
    }

    const mapped = mapTurn(turn.value, deps.mint)
    const asking: { askQuestionId?: QuestionId; askQuestionText?: string } =
      turn.value.nextMove.move === 'ask' &&
      turn.value.nextMove.questionText !== undefined &&
      mapped.askQuestionId !== undefined
        ? { askQuestionId: mapped.askQuestionId, askQuestionText: turn.value.nextMove.questionText }
        : {}

    const decided = decideSession(replaySession(readSession(deps, sessionId)), {
      type: 'Interpret Contribution',
      sessionId,
      contributionId: segment.contributionId,
      tracks: mapped.tracks,
      ...asking,
      at: deps.clock(),
    })
    if (!decided.ok || decided.value.length === 0) return
    appendSession(deps, sessionId, decided.value)

    const interpreted = decided.value[0]
    if (interpreted?.type === 'Contribution Interpreted') deriveTracks(deps, interpreted)
  } finally {
    deps.inFlight.clear(sessionId)
  }
}

/**
 * Ask the forced opening scope question (S1-08, S1-33, S1-58) — one unit of work.
 * An open session with no `Question Asked {kind:'scope'}` and no `Scope Set` gets
 * `facilitator.askOpening`; the proposed statement rides back as `scopeStatement`
 * on a `Question Asked {kind:'scope'}`. Provider-down leaves it for the next tick.
 */
export const askOpeningQuestion = async (deps: InterpretContributionDeps): Promise<void> => {
  for (const { workshopId, sessionId } of openSessions(deps.db)) {
    const events = readSession(deps, sessionId)
    const wm = replaySession(events)
    if (wm.closed) continue

    const hasScopeQuestion = events.some((e) => e.type === 'Question Asked' && e.kind === 'scope')
    const scopeSet = readWorkshop(deps, workshopId).some((e) => e.type === 'Scope Set')
    if (hasScopeQuestion || scopeSet) continue

    const opening = await deps.facilitator.askOpening({
      instructions: buildInstructions(),
      prompt:
        'A new Big Picture EventStorming session is starting. Propose the scope question to put ' +
        'to the domain expert and a first-draft one-sentence statement of the business being ' +
        'mapped, for them to accept or edit.',
    })
    if (!opening.ok) return

    const decided = decideSession(wm, {
      type: 'Ask Question',
      sessionId,
      questionId: deps.mint.questionId(),
      kind: 'scope',
      text: opening.value.questionText,
      scopeStatement: opening.value.scopeStatement,
      at: deps.clock(),
    })
    if (decided.ok) appendSession(deps, sessionId, decided.value)
    return
  }
}

/**
 * The reconciliation pass (AD-021) — every scheduler cycle, for each open
 * session: re-run `deriveTracks` over every `Contribution Interpreted` (a track
 * already marked in `derived_track` is skipped, so this is a no-op once whole),
 * and sweep the half-closed case (`Session Closed` in the stream but the
 * `session_index` row still `open`). No model call.
 */
export const reconcilePendingDerivations = (deps: InterpretContributionDeps): void => {
  for (const { sessionId } of openSessions(deps.db)) {
    const events = readSession(deps, sessionId)
    for (const e of events) {
      if (e.type === 'Contribution Interpreted') deriveTracks(deps, e)
    }
    const closed = events.find((e) => e.type === 'Session Closed')
    if (closed !== undefined) closeSessionIndexRow(deps.db, sessionId, closed.at)
  }
}

/**
 * One unit of work: interpret the oldest un-interpreted `Contribution Made` in an
 * open session that is not already in flight, FIFO by `Session` stream position.
 * `Contribution Interpreted` is the sole commit point; `deriveTracks` runs after
 * it. `provider-down` leaves the contribution for the next tick; `schema-invalid`
 * appends `Contribution Interpretation Failed` and counts it interpreted.
 */
export const interpretContribution = async (deps: InterpretContributionDeps): Promise<void> => {
  for (const { workshopId, sessionId } of openSessions(deps.db)) {
    if (deps.inFlight.sessions().has(sessionId)) continue
    const events = readSession(deps, sessionId)
    const wm = replaySession(events)
    if (wm.closed) continue

    const pending = events.find(
      (e): e is Extract<SessionEvent, { type: 'Contribution Made' }> =>
        e.type === 'Contribution Made' && !wm.interpreted.has(e.contributionId),
    )
    if (pending === undefined) continue

    await runInterpretation(deps, workshopId, sessionId, pending.contributionId)
    return
  }
}
