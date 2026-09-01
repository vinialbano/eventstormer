import dagre from '@dagrejs/dagre'
import { Position, type Edge, type Node } from '@vue-flow/core'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { CELL } from './layout.ts'

const RANK_SEP = 48
const NODE_SEP = 48
const TRACK_GAP = 56

export interface EventNodeData {
  label: string
  withdrawn: boolean
  pivotal: boolean
  speaker?: string | undefined
  attachments: { id: string; kind: string; label: string }[]
}

interface RankedBox {
  x: number
  y: number
}

const rankedBox = (value: unknown): RankedBox => {
  if (typeof value !== 'object' || value === null) return { x: 0, y: 0 }
  const record = value as { x?: unknown; y?: unknown }
  return {
    x: typeof record.x === 'number' ? record.x : 0,
    y: typeof record.y === 'number' ? record.y : 0,
  }
}

const nodeHeight = (attachmentCount: number): number =>
  CELL + (attachmentCount > 0 ? 28 : 0)

const layoutTrack = (
  track: TimelineLayout['tracks'][number],
  timeline: TimelineLayout,
  blocks: ReadonlyMap<string, { label: string; kind: string; withdrawn: boolean; speaker?: string | undefined }>,
  yOffset: number,
): { nodes: Node<EventNodeData>[]; bottom: number } => {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', ranksep: RANK_SEP, nodesep: NODE_SEP })
  const inTrack = new Set(track.eventIds.map(String))
  for (const id of track.eventIds) {
    graph.setNode(id, { width: CELL, height: nodeHeight(timeline.attachments[id]?.length ?? 0) })
  }
  for (const edge of timeline.edges) {
    if (!inTrack.has(edge.predecessor) || !inTrack.has(edge.successor)) continue
    graph.setEdge(edge.predecessor, edge.successor)
  }
  dagre.layout(graph)

  const nodes: Node<EventNodeData>[] = []
  let bottom = yOffset
  for (const id of track.eventIds) {
    const placed = rankedBox(graph.node(id))
    const block = blocks.get(id)
    const attachmentIds = timeline.attachments[id] ?? []
    const height = nodeHeight(attachmentIds.length)
    const top = placed.y - height / 2 + yOffset
    bottom = Math.max(bottom, top + height)
    nodes.push({
      id,
      type: 'event',
      position: { x: placed.x - CELL / 2, y: top },
      draggable: false,
      connectable: true,
      width: CELL,
      height,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: block?.label ?? '',
        withdrawn: block?.withdrawn === true,
        pivotal: timeline.pivotal.some((pivotalId) => pivotalId === id),
        speaker: block?.speaker,
        attachments: attachmentIds.flatMap((causeId) => {
          const cause = blocks.get(causeId)
          if (cause === undefined) return []
          return [{ id: causeId, kind: cause.kind, label: cause.label }]
        }),
      },
    })
  }
  return { nodes, bottom }
}

/**
 * Pixel positions for Vue Flow — dagre `rankdir: 'LR'` per track, node box
 * fixed at `CELL` so a wrapping label cannot change ranks or neighbour
 * coordinates.
 */
export const layoutTimeline = (
  timeline: TimelineLayout,
  blocks: ReadonlyMap<string, { label: string; kind: string; withdrawn: boolean; speaker?: string | undefined }>,
): { nodes: Node<EventNodeData>[]; edges: Edge[] } => {
  const nodes: Node<EventNodeData>[] = []
  const edges: Edge[] = timeline.edges.map((edge) => ({
    id: `${edge.predecessor}>${edge.successor}`,
    source: edge.predecessor,
    target: edge.successor,
  }))
  let yOffset = 0
  for (const track of timeline.tracks) {
    const laid = layoutTrack(track, timeline, blocks, yOffset)
    nodes.push(...laid.nodes)
    yOffset = laid.bottom + TRACK_GAP
  }
  return { nodes, edges }
}
