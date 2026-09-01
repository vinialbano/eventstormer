export type RelationEdit =
  | { kind: 'place'; target: string }
  | { kind: 'unplace'; target: string }
  | { kind: 'withdraw'; target: string }
  | { kind: 'reinstate'; target: string }
  | { kind: 'sequence'; predecessor: string; successor: string }
  | { kind: 'insert-between'; predecessor: string; inserted: string; successor: string }
  | { kind: 'link-cause'; cause: string; effect: string }
  | { kind: 'mark-pivotal'; target: string }
  | { kind: 'unmark-pivotal'; target: string }

export const DRAG_MIME = 'text/plain'

export interface DraggedBlock {
  id: string
  kind: string
}

export type DropSite =
  | { site: 'pane' }
  | { site: 'event'; id: string }
  | { site: 'edge'; predecessor: string; successor: string }

export const isEventKind = (kind: string): boolean => kind === 'domain-event'

export const isCauseKind = (kind: string): boolean => kind === 'actor' || kind === 'system'

export const encodeDragged = (block: DraggedBlock): string => JSON.stringify(block)

export const decodeDragged = (raw: string): DraggedBlock | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const record = parsed as { id?: unknown; kind?: unknown }
    if (typeof record.id !== 'string' || typeof record.kind !== 'string') return undefined
    return { id: record.id, kind: record.kind }
  } catch {
    return undefined
  }
}

export const dropSiteFromElement = (target: EventTarget | null): DropSite => {
  if (!(target instanceof Element)) return { site: 'pane' }
  const edge = target.closest('.vue-flow__edge')
  if (edge !== null) {
    const labelled = /Edge from (\S+) to (\S+)/.exec(edge.getAttribute('aria-label') ?? '')
    if (labelled?.[1] !== undefined && labelled[2] !== undefined) {
      return { site: 'edge', predecessor: labelled[1], successor: labelled[2] }
    }
    const raw = edge.getAttribute('data-id') ?? ''
    const split = raw.split('>')
    const predecessor = split[0]
    const successor = split[1]
    if (split.length === 2 && predecessor !== undefined && successor !== undefined) {
      return { site: 'edge', predecessor, successor }
    }
  }
  const eventId = target.closest('[data-event-id]')?.getAttribute('data-event-id')
  if (eventId !== null && eventId !== undefined) return { site: 'event', id: eventId }
  return { site: 'pane' }
}

export const relationFromDrop = (dragged: DraggedBlock, site: DropSite): RelationEdit | undefined => {
  switch (site.site) {
    case 'pane':
      return isEventKind(dragged.kind) ? { kind: 'place', target: dragged.id } : undefined
    case 'event':
      if (isEventKind(dragged.kind)) {
        return { kind: 'sequence', predecessor: site.id, successor: dragged.id }
      }
      if (isCauseKind(dragged.kind)) {
        return { kind: 'link-cause', cause: dragged.id, effect: site.id }
      }
      return undefined
    case 'edge':
      return isEventKind(dragged.kind)
        ? {
            kind: 'insert-between',
            predecessor: site.predecessor,
            inserted: dragged.id,
            successor: site.successor,
          }
        : undefined
  }
}

export const relationFromConnect = (
  source: string,
  target: string,
): { kind: 'sequence'; predecessor: string; successor: string } | undefined => {
  if (source.length === 0 || target.length === 0 || source === target) return undefined
  return { kind: 'sequence', predecessor: source, successor: target }
}

export const cycleLine = (path: readonly string[], labels: ReadonlyMap<string, string>): string =>
  `That sequence would loop: ${path.map((id) => labels.get(id) ?? id).join(' → ')}.`

export const isCycleRejection = (body: unknown): body is { error: 'cycle'; path: string[] } => {
  if (typeof body !== 'object' || body === null) return false
  const record = body as { error?: unknown; path?: unknown }
  return (
    record.error === 'cycle' &&
    Array.isArray(record.path) &&
    record.path.every((id) => typeof id === 'string')
  )
}
