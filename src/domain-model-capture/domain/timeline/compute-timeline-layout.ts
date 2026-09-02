import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { BoardSnapshot, FollowsEdge } from '../board/model.ts'

interface TimelineTrack {
  eventIds: BuildingBlockId[]
  ranks: Record<string, number>
}

export interface TimelineLayout {
  tracks: TimelineTrack[]
  edges: { predecessor: BuildingBlockId; successor: BuildingBlockId }[]
  attachments: Record<string, BuildingBlockId[]>
  pivotal: BuildingBlockId[]
}

const byId = (left: string, right: string): number => left.localeCompare(right)

const eligibleEventIds = (
  snapshot: BoardSnapshot,
  includeWithdrawn: boolean,
): Set<BuildingBlockId> => {
  const eligible = new Set<BuildingBlockId>()
  for (const [id, block] of snapshot.blocks) {
    if (block.kind !== 'domain-event') continue
    if (block.placement !== 'timeline') continue
    if (block.withdrawn && !includeWithdrawn) continue
    eligible.add(id)
  }
  return eligible
}

const undirectedNeighbours = (
  eligible: Set<BuildingBlockId>,
  follows: BoardSnapshot['follows'],
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
  return components.toSorted((left, right) => {
    const leftMin = left.toSorted(byId)[0] ?? ''
    const rightMin = right.toSorted(byId)[0] ?? ''
    return byId(leftMin, rightMin)
  })
}

const longestPathRanks = (
  nodes: readonly BuildingBlockId[],
  edges: readonly FollowsEdge[],
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
  for (const edge of edges) {
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

const attachmentsFor = (
  snapshot: BoardSnapshot,
  eligible: Set<BuildingBlockId>,
): Record<string, BuildingBlockId[]> => {
  const attachments: Record<string, BuildingBlockId[]> = {}
  for (const edge of snapshot.causedBy) {
    if (!eligible.has(edge.effect)) continue
    const cause = snapshot.blocks.get(edge.cause)
    if (!cause || cause.withdrawn) continue
    const existing = attachments[edge.effect]
    if (existing) existing.push(edge.cause)
    else attachments[edge.effect] = [edge.cause]
  }
  for (const [eventId, causes] of Object.entries(attachments)) {
    attachments[eventId] = causes.toSorted(byId)
  }
  return attachments
}

/**
 * Ranked tracks of placed domain events — connected components of undirected
 * `follows`, longest-path rank from in-degree 0, id string sort within a rank.
 * Causes attach under laid-out events; actors never occupy a track slot.
 * No pixel, rank, or coordinate is stored.
 */
export const computeTimelineLayout = (
  snapshot: BoardSnapshot,
  options?: { includeWithdrawn?: boolean },
): TimelineLayout => {
  const includeWithdrawn = options?.includeWithdrawn === true
  const eligible = eligibleEventIds(snapshot, includeWithdrawn)
  const neighbours = undirectedNeighbours(eligible, snapshot.follows)
  const edges = snapshot.follows.filter(
    (edge) => eligible.has(edge.predecessor) && eligible.has(edge.successor),
  )
  const tracks = connectedComponents(eligible, neighbours).map((component) => {
    const ranks = longestPathRanks(component, edges)
    const eventIds = component.toSorted((left, right) => {
      const rankDiff = (ranks[left] ?? 0) - (ranks[right] ?? 0)
      return rankDiff !== 0 ? rankDiff : byId(left, right)
    })
    return { eventIds, ranks }
  })
  const pivotal = [...eligible]
    .filter((id) => snapshot.blocks.get(id)?.pivotal === true)
    .toSorted(byId)

  return {
    tracks,
    edges,
    attachments: attachmentsFor(snapshot, eligible),
    pivotal,
  }
}
