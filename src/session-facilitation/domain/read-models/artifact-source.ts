import type { ProposalEvent, SessionEvent, WorkshopEvent } from '../schema/events.ts'

interface ArtifactQuote {
  id: string
  text: string
}

/**
 * A board block as the artifact source reads it — the minimum a `domain/` read
 * model can depend on without importing `domain-model-capture`. The infra layer
 * maps `readBoardSnapshot` down to this.
 */
export interface BoardBlockView {
  id: string
  kind: string
  label: string
  withdrawn: boolean
  resolved?: boolean | undefined
  modelAffecting?: boolean | undefined
}

type StakeholderCheck = { run: false } | { run: true; complete: boolean; absentNames: string[] }

type ChosenProblem =
  | { notRun: true }
  | { skipped: true; reason: 'none-chosen' | 'no-impediments-yet' }
  | { chosen: true; hotSpotId: string; label: string; qualification: 'firm' | 'provisional' }

export interface ArtifactSource {
  format: 'big-picture'
  scope: string | null
  narratorCount: number
  quotes: ArtifactQuote[]
  stakeholderCheck: StakeholderCheck
  chosenProblem: ChosenProblem
  openModelAffectingHotSpots: { id: string; label: string }[]
}

export interface ArtifactSourceInput {
  workshopEvents: readonly WorkshopEvent[]
  boardBlocks: readonly BoardBlockView[]
  sessions: readonly {
    events: readonly SessionEvent[]
    proposals: readonly (readonly ProposalEvent[])[]
  }[]
}

const latestScope = (workshopEvents: readonly WorkshopEvent[]): string | null => {
  let scope: string | null = null
  for (const event of workshopEvents) {
    if (event.type === 'Scope Set') scope = event.statement
  }
  return scope
}

const latestStakeholderCheck = (workshopEvents: readonly WorkshopEvent[]): StakeholderCheck => {
  let check: StakeholderCheck = { run: false }
  for (const event of workshopEvents) {
    if (event.type === 'Stakeholder Check Recorded') {
      check = { run: true, complete: event.complete, absentNames: [...event.absentNames] }
    }
  }
  return check
}

const latestChosenProblem = (
  workshopEvents: readonly WorkshopEvent[],
  labelOf: (hotSpotId: string) => string,
): ChosenProblem => {
  let decision: ChosenProblem = { notRun: true }
  for (const event of workshopEvents) {
    if (event.type === 'Problem Chosen') {
      decision = {
        chosen: true,
        hotSpotId: event.problemHotSpotId,
        label: labelOf(event.problemHotSpotId),
        qualification: event.qualification,
      }
    }
    if (event.type === 'Problem Choice Skipped') decision = { skipped: true, reason: event.reason }
  }
  return decision
}

const openModelAffectingHotSpots = (
  boardBlocks: readonly BoardBlockView[],
): { id: string; label: string }[] =>
  boardBlocks
    .filter(
      (block) =>
        block.kind === 'hot-spot' &&
        !block.withdrawn &&
        block.modelAffecting !== false &&
        block.resolved === false,
    )
    .map((block) => ({ id: block.id, label: block.label }))

const contributionQuotes = (
  sessions: ArtifactSourceInput['sessions'],
): { quotes: ArtifactQuote[]; narratorCount: number } => {
  const quotes: ArtifactQuote[] = []
  const speakers = new Set<string>()
  for (const session of sessions) {
    for (const event of session.events) {
      if (event.type !== 'Contribution Made') continue
      speakers.add(event.speaker)
      quotes.push({ id: event.contributionId, text: event.body })
    }
  }
  return { quotes, narratorCount: speakers.size }
}

const spanQuotes = (sessions: ArtifactSourceInput['sessions']): ArtifactQuote[] => {
  const quotes: ArtifactQuote[] = []
  for (const session of sessions) {
    for (const proposal of session.proposals) {
      for (const event of proposal) {
        if (event.type !== 'Building Block Proposed') continue
        if (event.evidenceSpan === undefined) continue
        quotes.push({ id: `span:${event.proposalId}`, text: event.evidenceSpan })
      }
    }
  }
  return quotes
}

/**
 * Quoted evidence and coverage inputs for a derived artifact. Quotes are
 * contribution bodies followed by stored evidence spans — never a proposal label.
 * Scope is the last `Scope Set` statement (the command is repeatable). The
 * close-ceremony fields let #42 tell "check not run" from "run, found nothing".
 */
export const artifactSource = (input: ArtifactSourceInput): ArtifactSource => {
  const contributions = contributionQuotes(input.sessions)
  const labelOf = (hotSpotId: string): string =>
    input.boardBlocks.find((block) => block.id === hotSpotId)?.label ?? hotSpotId
  return {
    format: 'big-picture',
    scope: latestScope(input.workshopEvents),
    narratorCount: contributions.narratorCount,
    quotes: [...contributions.quotes, ...spanQuotes(input.sessions)],
    stakeholderCheck: latestStakeholderCheck(input.workshopEvents),
    chosenProblem: latestChosenProblem(input.workshopEvents, labelOf),
    openModelAffectingHotSpots: openModelAffectingHotSpots(input.boardBlocks),
  }
}
