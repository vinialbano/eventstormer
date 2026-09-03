import type { BuildingBlockId, ResolutionId } from '~/plumbing/ids.ts'
import type { ResolutionDisposition } from '../resolution/model.ts'
import { replay } from '../resolution/replay.ts'
import type { ResolutionEvent, SessionEvent } from '../schema/events.ts'

/**
 * `resolutionsView` — the read model behind `GET /sessions/:id/resolutions`.
 * Pure: the caller supplies each resolution's stream. Order follows
 * `sessionResolutionIds` (stream order), so a contribution's resolutions are
 * contiguous.
 */

interface ResolutionCard {
  resolutionId: ResolutionId
  hotSpotId: BuildingBlockId
  reference: string
  disposition: ResolutionDisposition
  /** The bounce reason when the resolution `LAPSED` on an apply rejection. */
  lapsedReason?: string
}

const birthOf = (
  events: ResolutionEvent[],
): Extract<ResolutionEvent, { type: 'Resolution Proposed' }> | undefined =>
  events.find(
    (event): event is Extract<ResolutionEvent, { type: 'Resolution Proposed' }> =>
      event.type === 'Resolution Proposed',
  )

/** Project one `Resolution` stream to its card, or `undefined` with no birth. */
export const resolutionCard = (events: ResolutionEvent[]): ResolutionCard | undefined => {
  const birth = birthOf(events)
  if (birth === undefined) return undefined

  const writeModel = replay(events)
  const bounced = events.findLast((event) => event.type === 'Hot Spot Resolution Rejected')

  return {
    resolutionId: birth.resolutionId,
    hotSpotId: birth.hotSpotId,
    reference: writeModel.reference ?? birth.reference,
    disposition: writeModel.disposition,
    ...(bounced?.type === 'Hot Spot Resolution Rejected' ? { lapsedReason: bounced.reason } : {}),
  }
}

/** Every `resolutionId` this session proposed — a fold over `Contribution Interpreted` tracks. */
export const sessionResolutionIds = (events: SessionEvent[]): ResolutionId[] => {
  const ids: ResolutionId[] = []
  for (const event of events) {
    if (event.type !== 'Contribution Interpreted') continue
    for (const track of event.tracks) {
      if (track.track === 'propose-resolution') ids.push(track.resolutionId)
    }
  }
  return ids
}

export const resolutionsView = (
  sessionEvents: SessionEvent[],
  streams: { resolutionId: ResolutionId; events: ResolutionEvent[] }[],
): ResolutionCard[] => {
  const byId = new Map(streams.map((stream) => [stream.resolutionId, stream.events]))
  const cards: ResolutionCard[] = []
  for (const resolutionId of sessionResolutionIds(sessionEvents)) {
    const card = resolutionCard(byId.get(resolutionId) ?? [])
    if (card !== undefined) cards.push(card)
  }
  return cards
}
