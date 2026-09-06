import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { byId, connectedComponents, longestPathRanks, undirectedNeighbours } from './graph.ts'
import type { AccountFollowsEdge } from './model.ts'

const id = (value: string): BuildingBlockId => value as BuildingBlockId
const edge = (predecessor: string, successor: string): AccountFollowsEdge => ({
  predecessor: id(predecessor),
  successor: id(successor),
})

describe('byId', () => {
  it('orders lexicographically', () => {
    expect(['c', 'a', 'b'].toSorted(byId)).toEqual(['a', 'b', 'c'])
  })
})

describe('undirectedNeighbours', () => {
  it('links both directions for an eligible edge', () => {
    const neighbours = undirectedNeighbours(new Set([id('a'), id('b')]), [edge('a', 'b')])
    expect(neighbours.get(id('a'))).toEqual([id('b')])
    expect(neighbours.get(id('b'))).toEqual([id('a')])
  })

  it('drops an edge with an ineligible endpoint', () => {
    const neighbours = undirectedNeighbours(new Set([id('a')]), [edge('a', 'b')])
    expect(neighbours.size).toBe(0)
  })
})

describe('connectedComponents', () => {
  it('returns one component for a connected chain', () => {
    const eligible = new Set([id('a'), id('b'), id('c')])
    const neighbours = undirectedNeighbours(eligible, [edge('a', 'b'), edge('b', 'c')])
    expect(connectedComponents(eligible, neighbours)).toEqual([[id('a'), id('b'), id('c')]])
  })

  it('splits a disconnected graph and sorts components by lowest id', () => {
    const eligible = new Set([id('z1'), id('z2'), id('a1'), id('a2')])
    const neighbours = undirectedNeighbours(eligible, [edge('z1', 'z2'), edge('a1', 'a2')])
    const components = connectedComponents(eligible, neighbours)
    expect(components.map((component) => component.toSorted(byId))).toEqual([
      [id('a1'), id('a2')],
      [id('z1'), id('z2')],
    ])
  })
})

describe('longestPathRanks', () => {
  it('ranks a linear chain 0,1,2', () => {
    const nodes = [id('a'), id('b'), id('c')]
    expect(longestPathRanks(nodes, [edge('a', 'b'), edge('b', 'c')])).toEqual({ a: 0, b: 1, c: 2 })
  })

  it('ranks a branch: both successors at rank 1', () => {
    const nodes = [id('a'), id('b'), id('c')]
    expect(longestPathRanks(nodes, [edge('a', 'b'), edge('a', 'c')])).toEqual({ a: 0, b: 1, c: 1 })
  })

  it('takes the longest path to a diamond sink', () => {
    const nodes = [id('a'), id('b'), id('c'), id('d')]
    const ranks = longestPathRanks(nodes, [
      edge('a', 'b'),
      edge('a', 'c'),
      edge('b', 'c'),
      edge('c', 'd'),
    ])
    expect(ranks).toEqual({ a: 0, b: 1, c: 2, d: 3 })
  })

  it('gives an isolated node rank 0', () => {
    expect(longestPathRanks([id('a'), id('b')], [])).toEqual({ a: 0, b: 0 })
  })
})
