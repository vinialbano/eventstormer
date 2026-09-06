import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { AccountFollowsEdge } from './model.ts'

/** Lexicographic id comparator — the total-order tie-break every ordered walk uses. */
export const byId = (left: string, right: string): number => left.localeCompare(right)

/**
 * Undirected adjacency over the `follows` edges whose both endpoints are
 * eligible. Each edge contributes a link in both directions.
 */
export const undirectedNeighbours = (
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

/**
 * The connected components of the eligible set under `neighbours`, each
 * component and the component list sorted by lowest member id — a total order.
 */
export const connectedComponents = (
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

/**
 * Longest-path rank of every node: 0 for a source, otherwise one more than the
 * maximum rank of any predecessor. Edges with an endpoint outside `nodes` are
 * ignored.
 */
export const longestPathRanks = (
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
