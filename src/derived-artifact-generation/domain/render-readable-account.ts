import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { AccountBlock, AccountDocument, AccountFollowsEdge, AccountInput } from './model.ts'

const kindWord = (kind: AccountBlock['kind']): 'Event' | 'Actor' | 'System' => {
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

const byId = (left: string, right: string): number => left.localeCompare(right)

const placedEvents = (blocks: readonly AccountBlock[]): AccountBlock[] =>
  blocks.filter(
    (block) =>
      block.kind === 'domain-event' && block.placement === 'timeline' && !block.withdrawn,
  )

const undirectedNeighbours = (
  eligible: Set<BuildingBlockId>,
  follows: readonly AccountFollowsEdge[],
): Map<BuildingBlockId, BuildingBlockId[]> => {
  const neighbours = new Map<BuildingBlockId, BuildingBlockId[]>()
  const link = (from: BuildingBlockId, to: BuildingBlockId): void => {
    const existing = neighbours.get(from)
    if (existing) existing.push(to)
    else neighbours.set(from, [to])
  }
  for (const edge of follows) {
    if (!eligible.has(edge.predecessor) || !eligible.has(edge.successor)) continue
    link(edge.predecessor, edge.successor)
    link(edge.successor, edge.predecessor)
  }
  return neighbours
}

const connectedComponents = (
  eligible: Set<BuildingBlockId>,
  neighbours: Map<BuildingBlockId, BuildingBlockId[]>,
): BuildingBlockId[][] => {
  const remaining = new Set(eligible)
  const components: BuildingBlockId[][] = []
  while (remaining.size > 0) {
    const start = [...remaining].toSorted(byId)[0]
    if (start === undefined) break
    const component: BuildingBlockId[] = []
    const stack = [start]
    remaining.delete(start)
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) break
      component.push(current)
      for (const neighbour of neighbours.get(current) ?? []) {
        if (!remaining.has(neighbour)) continue
        remaining.delete(neighbour)
        stack.push(neighbour)
      }
    }
    components.push(component)
  }
  return components.toSorted((left, right) =>
    byId(left.toSorted(byId)[0] ?? '', right.toSorted(byId)[0] ?? ''),
  )
}

const longestPathRanks = (
  nodes: readonly BuildingBlockId[],
  follows: readonly AccountFollowsEdge[],
): Record<string, number> => {
  const nodeSet = new Set(nodes)
  const successors = new Map<BuildingBlockId, BuildingBlockId[]>()
  const inbound = new Map<BuildingBlockId, number>()
  const ranks: Record<string, number> = {}
  for (const id of nodes) {
    successors.set(id, [])
    inbound.set(id, 0)
    ranks[id] = 0
  }
  for (const edge of follows) {
    if (!nodeSet.has(edge.predecessor) || !nodeSet.has(edge.successor)) continue
    successors.get(edge.predecessor)?.push(edge.successor)
    inbound.set(edge.successor, (inbound.get(edge.successor) ?? 0) + 1)
  }
  const queue = nodes.filter((id) => inbound.get(id) === 0)
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    const currentRank = ranks[current] ?? 0
    for (const successor of successors.get(current) ?? []) {
      ranks[successor] = Math.max(ranks[successor] ?? 0, currentRank + 1)
      const remaining = (inbound.get(successor) ?? 1) - 1
      inbound.set(successor, remaining)
      if (remaining === 0) queue.push(successor)
    }
  }
  return ranks
}

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
 * a reword.
 */
export const renderReadableAccount = (input: AccountInput): AccountDocument => {
  const references = new Map(
    input.blocks.map((block) => [
      block.id,
      [{ kind: 'readable-account' as const, path: 'building-blocks' }],
    ]),
  )
  return { markdown: toMarkdown(input), references }
}
