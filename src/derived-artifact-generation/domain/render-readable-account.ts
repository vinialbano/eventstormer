import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { byId, connectedComponents, longestPathRanks, undirectedNeighbours } from './graph.ts'
import type { AccountBlock, AccountDocument, AccountInput, ReferenceSite } from './model.ts'

export const kindWord = (kind: AccountBlock['kind']): 'Event' | 'Actor' | 'System' => {
  switch (kind) {
    case 'domain-event':
      return 'Event'
    case 'actor':
      return 'Actor'
    case 'system':
      return 'System'
  }
}

const blockLine = (block: AccountBlock): string => {
  const kind = kindWord(block.kind)
  return block.withdrawn ? `- ${kind} (withdrawn): ${block.label}` : `- ${kind}: ${block.label}`
}

const quoteLine = (text: string): string =>
  text.split('\n').map((line) => `> ${line}`).join('\n')

const placedEvents = (blocks: readonly AccountBlock[]): AccountBlock[] =>
  blocks.filter(
    (block) =>
      block.kind === 'domain-event' && block.placement === 'timeline' && !block.withdrawn,
  )

const timelineLines = (input: AccountInput): string[] | undefined => {
  const placed = placedEvents(input.blocks)
  if (placed.length === 0) return undefined
  const byBlockId = new Map(placed.map((block) => [block.id, block]))
  const eligible = new Set(placed.map((block) => block.id))
  const follows = (input.follows ?? []).filter(
    (edge) => eligible.has(edge.predecessor) && eligible.has(edge.successor),
  )
  const neighbours = undirectedNeighbours(eligible, follows)
  const lines = ['## Timeline and relations']
  for (const component of connectedComponents(eligible, neighbours)) {
    const ranks = longestPathRanks(component, follows)
    const eventIds = component.toSorted((left, right) => {
      const rankDiff = (ranks[left] ?? 0) - (ranks[right] ?? 0)
      return rankDiff !== 0 ? rankDiff : byId(left, right)
    })
    for (const id of eventIds) {
      const block = byBlockId.get(id)
      if (!block) continue
      const indent = '  '.repeat(ranks[id] ?? 0)
      lines.push(`${indent}${blockLine(block)}`)
    }
  }
  return lines
}

const toMarkdown = (input: AccountInput): string => {
  const scope = input.scope ?? '(not set)'
  const blocks = ['## Building blocks', ...input.blocks.map(blockLine)].join('\n')
  const quotes = ['## Quoted evidence', ...input.quotes.map((quote) => quoteLine(quote.text))].join(
    '\n',
  )
  const timeline = timelineLines(input)
  const coverage =
    timeline === undefined
      ? `## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run`
      : `## Coverage
- Stakeholder check: not run
- Chosen problem: not run

${timeline.join('\n')}`
  return `# Readable account
Format: Big Picture
Narrators: ${String(input.narratorCount)}
Scope: ${scope}

${coverage}

${blocks}

${quotes}
`
}

/**
 * Deterministic Markdown walk of the snapshot. Placed events appear in
 * follows order under Timeline and relations; building-block lines remain
 * for every kind. Quoted evidence is inserted verbatim and never follows
 * a reword. Relation sites are keyed by endpoint ids so a reword does not
 * change the site set.
 */
export const renderReadableAccount = (input: AccountInput): AccountDocument => {
  const references = new Map<BuildingBlockId, ReferenceSite[]>(
    input.blocks.map((block) => [
      block.id,
      [{ kind: 'readable-account' as const, path: 'building-blocks' }],
    ]),
  )
  const pushSite = (id: BuildingBlockId, site: ReferenceSite): void => {
    const existing = references.get(id)
    if (existing) existing.push(site)
    else references.set(id, [site])
  }
  for (const edge of input.follows ?? []) {
    const site: ReferenceSite = {
      kind: 'follows',
      path: `${edge.predecessor}>${edge.successor}`,
    }
    pushSite(edge.predecessor, site)
    pushSite(edge.successor, site)
  }
  for (const edge of input.causedBy ?? []) {
    const site: ReferenceSite = {
      kind: 'caused-by',
      path: `${edge.cause}>${edge.effect}`,
    }
    pushSite(edge.cause, site)
    pushSite(edge.effect, site)
  }
  return { markdown: toMarkdown(input), references }
}
