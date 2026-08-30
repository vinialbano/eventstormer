import type { ContributionId, QuestionId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'

/**
 * `sessionView` — the read model behind `GET /workshops/:id/session`. Pure fold
 * over the `Session` stream; the caller supplies the facts the stream cannot
 * hold on its own (whether `Workshop.scope` is set, which contributions are
 * in flight, which interpreted tracks have a `derived_track` row).
 */

type InterpretationStatus =
  | 'pending'
  | 'interpreting'
  | 'interpreted'
  | 'derived'
  | 'failed'

interface TranscriptTurn {
  kind: 'contribution' | 'question' | 'notice'
  speaker: string
  text: string
  at: string
}

interface OpenQuestion {
  questionId: QuestionId
  kind: 'scope' | 'phase' | 'free'
  text: string
}

export interface SessionView {
  scope: { status: 'none' | 'proposed' | 'set'; proposedStatement?: string }
  transcript: TranscriptTurn[]
  openQuestions: OpenQuestion[]
  contributions: { contributionId: ContributionId; status: InterpretationStatus }[]
  /** True only once every contribution is `derived` / `failed` — the poll-stop signal. */
  fullyDerived: boolean
}

export interface SessionViewOptions {
  scopeIsSet?: boolean
  inFlight?: ReadonlySet<ContributionId>
  /** `${contributionId}::${trackIndex}` keys with a `derived_track` row. */
  derivedTracks?: ReadonlySet<string>
}

const trackKey = (contributionId: string, index: number): string =>
  `${contributionId}::${String(index)}`

export const sessionView = (
  events: SessionEvent[],
  options: SessionViewOptions = {},
): SessionView => {
  const inFlight = options.inFlight ?? new Set<ContributionId>()
  const derivedTracks = options.derivedTracks ?? new Set<string>()

  const transcript: TranscriptTurn[] = []
  const questions = new Map<QuestionId, OpenQuestion & { resolved: boolean }>()
  const madeOrder: ContributionId[] = []
  const interpreted = new Map<ContributionId, number>()
  const failed = new Set<ContributionId>()
  let scopeStatement: string | undefined

  for (const e of events) {
    switch (e.type) {
      case 'Contribution Made':
        madeOrder.push(e.contributionId)
        transcript.push({ kind: 'contribution', speaker: e.speaker, text: e.body, at: e.at })
        break
      case 'Question Asked':
        questions.set(e.questionId, {
          questionId: e.questionId,
          kind: e.kind,
          text: e.text,
          resolved: false,
        })
        if (e.kind === 'scope') scopeStatement = e.scopeStatement
        transcript.push({ kind: 'question', speaker: 'facilitator', text: e.text, at: e.at })
        break
      case 'Question Answered': {
        const q = questions.get(e.questionId)
        if (q) q.resolved = true
        break
      }
      case 'Contribution Attributed To Another Format':
        transcript.push({ kind: 'notice', speaker: 'facilitator', text: e.note, at: e.at })
        break
      case 'Contribution Interpreted':
        interpreted.set(e.contributionId, e.tracks.length)
        break
      case 'Contribution Interpretation Failed':
        failed.add(e.contributionId)
        break
      case 'Session Started':
      case 'Session Closed':
        break
    }
  }

  const statusOf = (contributionId: ContributionId): InterpretationStatus => {
    if (failed.has(contributionId)) return 'failed'
    const trackCount = interpreted.get(contributionId)
    if (trackCount !== undefined) {
      for (let i = 0; i < trackCount; i += 1) {
        if (!derivedTracks.has(trackKey(contributionId, i))) return 'interpreted'
      }
      return 'derived'
    }
    return inFlight.has(contributionId) ? 'interpreting' : 'pending'
  }

  const contributions = madeOrder.map((contributionId) => ({
    contributionId,
    status: statusOf(contributionId),
  }))

  const scopeStatus: 'none' | 'proposed' | 'set' = options.scopeIsSet
    ? 'set'
    : scopeStatement !== undefined
      ? 'proposed'
      : 'none'

  return {
    scope: {
      status: scopeStatus,
      ...(scopeStatus === 'proposed' && scopeStatement !== undefined
        ? { proposedStatement: scopeStatement }
        : {}),
    },
    transcript,
    openQuestions: [...questions.values()]
      .filter((q) => !q.resolved)
      .map(({ questionId, kind, text }) => ({ questionId, kind, text })),
    contributions,
    fullyDerived: contributions.every((c) => c.status === 'derived' || c.status === 'failed'),
  }
}
