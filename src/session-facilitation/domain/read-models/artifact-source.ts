import type { ProposalEvent, SessionEvent, WorkshopEvent } from '../schema/events.ts'

interface ArtifactQuote {
  id: string
  text: string
}

export interface ArtifactSource {
  format: 'big-picture'
  scope: string | null
  narratorCount: number
  quotes: ArtifactQuote[]
}

export interface ArtifactSourceInput {
  workshopEvents: readonly WorkshopEvent[]
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
 * Scope is the last `Scope Set` statement (the command is repeatable).
 */
export const artifactSource = (input: ArtifactSourceInput): ArtifactSource => {
  const contributions = contributionQuotes(input.sessions)
  return {
    format: 'big-picture',
    scope: latestScope(input.workshopEvents),
    narratorCount: contributions.narratorCount,
    quotes: [...contributions.quotes, ...spanQuotes(input.sessions)],
  }
}
