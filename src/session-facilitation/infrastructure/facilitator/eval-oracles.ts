/**
 * Deterministic F11 graders. Pure functions over canned or live turns — no
 * network, no schema library. `isPastTenseLabel` is a v1 heuristic: the last
 * whitespace-separated word ends in `ed` (irregulars such as "built" fail).
 *
 * The relation / pivotal / reword / format graders read the facilitator's
 * returned `FacilitationTrack[]` (the model-output shape). Endpoint and target
 * labels are matched by order and case-insensitive substring: the fixture states
 * the shortest distinctive fragment of the board label, the model returns the
 * full label.
 */

import { RELATION_FIELDS, type InterpretedRelationKind } from '../../domain/schema/interpreted-track.ts'
import type { FacilitationTrack } from './turn-schema.ts'

const TOKEN = /[a-z0-9]+/g

export const contentWords = (text: string): string[] =>
  (text.toLowerCase().match(TOKEN) ?? []).filter((token) => token.length > 2)

export const sharesContentWord = (label: string, segment: string): boolean => {
  const segmentWords = new Set(contentWords(segment))
  return contentWords(label).some((word) => segmentWords.has(word))
}

/** Common irregular past-tense / past-participle forms an `-ed` check misses — the ones
 * that actually turn up in EventStorming domain-event labels. */
const IRREGULAR_PAST = new Set([
  'sent', 'made', 'put', 'took', 'taken', 'got', 'gotten', 'ran', 'run', 'came', 'went', 'gone',
  'left', 'built', 'held', 'told', 'gave', 'given', 'drew', 'drawn', 'set', 'began', 'begun',
  'brought', 'bought', 'caught', 'found', 'kept', 'led', 'lost', 'met', 'paid', 'read', 'said',
  'sold', 'spent', 'stood', 'won', 'cut', 'hit', 'let', 'shut', 'done', 'seen', 'written',
  'broken', 'spoken', 'chosen', 'driven', 'thrown', 'known', 'grown', 'shown',
])

/** A domain-event label is past tense if any word in it is a past-tense verb — an `-ed`
 * form or a known irregular. Checks every word, not just the last, so
 * "Ticket sent to the kitchen line" passes. */
export const isPastTenseLabel = (label: string): boolean =>
  label
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .some((word) => word.endsWith('ed') || IRREGULAR_PAST.has(word))

export const hasFlagPhase = (tracks: { track: string }[]): boolean =>
  tracks.some((track) => track.track === 'flag-phase')

/** Reads naturally alongside the other `proposes*` graders. */
export const flagsPhase = (tracks: { track: string }[]): boolean => hasFlagPhase(tracks)

export const proposedKinds = (tracks: { track: string; blockKind?: string }[]): string[] =>
  tracks.flatMap((track) => (track.blockKind === undefined ? [] : [track.blockKind]))

/** `haystack` contains `needle`, both compared lowercased and trimmed. */
const containsFold = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase())

/** A track attributing the content to a deeper EventStorming format named `format`. */
export const attributesToFormat = (tracks: FacilitationTrack[], format: string): boolean =>
  tracks.some(
    (track) => track.track === 'attribute-to-other-format' && containsFold(track.format, format),
  )

export interface RelationExpectation {
  kind: InterpretedRelationKind
  /** Endpoint label fragments, in the `RELATION_FIELDS[kind]` order. */
  labels: string[]
}

/**
 * A `propose-relation` track whose `relationKind` matches and whose endpoints —
 * as many as the kind takes — resolve to `expected.labels` in order.
 */
export const proposesRelation = (
  tracks: FacilitationTrack[],
  expected: RelationExpectation,
): boolean => {
  const arity = RELATION_FIELDS[expected.kind].length
  if (expected.labels.length !== arity) return false
  return tracks.some(
    (track) =>
      track.track === 'propose-relation' &&
      track.relationKind === expected.kind &&
      track.endpoints.length === arity &&
      expected.labels.every((label, index) => containsFold(track.endpoints[index] ?? '', label)),
  )
}

export interface PivotalExpectation {
  kind: 'mark-pivotal' | 'unmark-pivotal'
  label: string
}

/** A `propose-pivotal` track with the given `pivotalKind` on the named event. */
export const proposesPivotal = (
  tracks: FacilitationTrack[],
  expected: PivotalExpectation,
): boolean =>
  tracks.some(
    (track) =>
      track.track === 'propose-pivotal' &&
      track.pivotalKind === expected.kind &&
      containsFold(track.eventLabel, expected.label),
  )

export interface RewordExpectation {
  from: string
  to: string
}

/** A `propose-reword` track from a `from`-matching label to a `to`-matching one. */
export const proposesReword = (tracks: FacilitationTrack[], expected: RewordExpectation): boolean =>
  tracks.some(
    (track) =>
      track.track === 'propose-reword' &&
      containsFold(track.targetLabel, expected.from) &&
      containsFold(track.newLabel, expected.to),
  )
