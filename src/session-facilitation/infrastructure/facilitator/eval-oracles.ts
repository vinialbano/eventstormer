/**
 * Deterministic F11 graders. Pure functions over canned or live turns — no
 * network, no schema library. `isPastTenseLabel` is a v1 heuristic: the last
 * whitespace-separated word ends in `ed` (irregulars such as "built" fail).
 */

const TOKEN = /[a-z0-9]+/g

export const contentWords = (text: string): string[] =>
  (text.toLowerCase().match(TOKEN) ?? []).filter((token) => token.length > 2)

export const sharesContentWord = (label: string, segment: string): boolean => {
  const segmentWords = new Set(contentWords(segment))
  return contentWords(label).some((word) => segmentWords.has(word))
}

export const isPastTenseLabel = (label: string): boolean => {
  const last = label.trim().split(/\s+/).at(-1)
  return last?.toLowerCase().endsWith('ed') === true
}

export const hasFlagPhase = (tracks: { track: string }[]): boolean =>
  tracks.some((track) => track.track === 'flag-phase')

export const proposedKinds = (tracks: { track: string; blockKind?: string }[]): string[] =>
  tracks.flatMap((track) => (track.blockKind === undefined ? [] : [track.blockKind]))
