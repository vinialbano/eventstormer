import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { renderSummary, type SummaryInput } from './render-summary.ts'

const at = '2026-09-05T10:00:00.000Z'

const id = (value: string): BuildingBlockId => value as BuildingBlockId

const rich = (): SummaryInput => ({
  boardPosition: 7,
  sessionRecordPosition: 3,
  renderedAt: at,
  snapshot: {
    blocks: [
      { id: id('e1'), kind: 'domain-event', label: 'Loan recorded', withdrawn: false, placement: 'timeline', pivotal: true },
      { id: id('e2'), kind: 'domain-event', label: 'Book shelved', withdrawn: false, placement: 'timeline', pivotal: true },
      { id: id('e3'), kind: 'domain-event', label: 'Fine assessed', withdrawn: false, placement: 'timeline', pivotal: false },
      { id: id('e4'), kind: 'domain-event', label: 'Reminder queued', withdrawn: false, placement: 'backlog', pivotal: false },
      { id: id('a1'), kind: 'actor', label: 'Member', withdrawn: false, placement: 'backlog', pivotal: false },
      { id: id('s1'), kind: 'system', label: 'Catalogue', withdrawn: false, placement: 'backlog', pivotal: false },
      { id: id('h1'), kind: 'hot-spot', label: 'Barcode unclear', withdrawn: false, placement: 'backlog', pivotal: false },
    ],
    follows: [
      { predecessor: id('e1'), successor: id('e2') },
      { predecessor: id('e1'), successor: id('e3') },
    ],
    causedBy: [{ cause: id('a1'), effect: id('e1') }],
  },
  source: {
    format: 'big-picture',
    scope: 'Lending',
    narratorCount: 2,
    stakeholderCheck: { run: true, complete: false, absentNames: ['Zoe', 'Amy'] },
    chosenProblem: { chosen: true, hotSpotId: 'h1', label: 'Barcode unclear', qualification: 'firm' },
    openModelAffectingHotSpots: [{ id: 'h1', label: 'Barcode unclear' }],
  },
})

const empty = (): SummaryInput => ({
  boardPosition: -1,
  sessionRecordPosition: 0,
  renderedAt: at,
  snapshot: { blocks: [], follows: [], causedBy: [] },
  source: {
    format: 'big-picture',
    scope: null,
    narratorCount: 0,
    stakeholderCheck: { run: false },
    chosenProblem: { notRun: true },
    openModelAffectingHotSpots: [],
  },
})

const RICH_MARKDOWN = `# Model summary
Format: Big Picture
Contributors: 2
Scope: Lending
Board position: 7
Session-record position: 3
Rendered at: 2026-09-05T10:00:00.000Z

## Format steps
- Stakeholder check: run (incomplete; absent: Amy, Zoe)
- Chosen problem: "Barcode unclear" (firm)

## Spine
- Event: Loan recorded
- Event: Book shelved

## Shape
- Domain events: 4 (placed 3, backlog 1)
- Actors: 1
- Systems: 1
- Hot spots: 1
- Disconnected tracks: 1
- Branch points: 1
  - Event: Loan recorded

## Open problems
- Chosen problem: "Barcode unclear" (firm)
- Open model-affecting hot spots:
  - Barcode unclear

## Coverage gaps
- Events with no recorded cause:
  - Event: Book shelved
  - Event: Fine assessed
  - Event: Reminder queued
- Unplaced events:
  - Event: Reminder queued
`

const EMPTY_MARKDOWN = `# Model summary
Format: Big Picture
Contributors: 0
Scope: (not set)
Board position: 0
Session-record position: 0
Rendered at: 2026-09-05T10:00:00.000Z

## Format steps
- Stakeholder check: not run
- Chosen problem: not run

## Spine
- (no pivotal marks)

## Shape
- Domain events: 0 (placed 0, backlog 0)
- Actors: 0
- Systems: 0
- Hot spots: 0
- Disconnected tracks: 0
- Branch points: 0

## Open problems
- Chosen problem: not run
- Open model-affecting hot spots: none

## Coverage gaps
- Events with no recorded cause: none
- Unplaced events: none
`

const shuffle = <T>(items: readonly T[], seed: number): T[] => {
  const copy = [...items]
  let state = seed
  for (let index = copy.length - 1; index > 0; index--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    const swap = state % (index + 1)
    ;[copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T]
  }
  return copy
}

describe('renderSummary', () => {
  it('renders every section for a rich workshop against a golden fixture', () => {
    expect(renderSummary(rich()).markdown).toBe(RICH_MARKDOWN)
  })

  it('renders every section, none omitted, for an empty model with boardPosition normalised to 0', () => {
    const result = renderSummary(empty())
    expect(result.markdown).toBe(EMPTY_MARKDOWN)
    expect(result.boardPosition).toBe(0)
    for (const heading of ['## Format steps', '## Spine', '## Shape', '## Open problems', '## Coverage gaps']) {
      expect(result.markdown).toContain(heading)
    }
  })

  it('returns the composite stamp positions alongside the markdown', () => {
    const result = renderSummary(rich())
    expect(result.boardPosition).toBe(7)
    expect(result.sessionRecordPosition).toBe(3)
  })

  it('renders byte-identical markdown for two renders that differ only in renderedAt', () => {
    const stripStamp = (markdown: string): string =>
      markdown.replace(/^Rendered at: .*$/m, 'Rendered at: <stamp>')
    const first = renderSummary({ ...rich(), renderedAt: '2026-01-01T00:00:00.000Z' })
    const second = renderSummary({ ...rich(), renderedAt: '2030-12-31T23:59:59.000Z' })
    expect(stripStamp(first.markdown)).toBe(stripStamp(second.markdown))
  })

  it('renders byte-identical markdown when the snapshot blocks and edges are shuffled', () => {
    const base = rich()
    const shuffled: SummaryInput = {
      ...base,
      snapshot: {
        blocks: shuffle(base.snapshot.blocks, 7),
        follows: shuffle(base.snapshot.follows, 13),
        causedBy: shuffle(base.snapshot.causedBy, 29),
      },
    }
    expect(renderSummary(shuffled).markdown).toBe(RICH_MARKDOWN)
  })

  it('contains no substring of any contribution body', () => {
    const { markdown } = renderSummary(rich())
    expect(markdown).not.toContain('A member borrowed a book')
  })

  it('orders the spine by (rank, id): a rank-0 pivotal event precedes a rank-1 pivotal event', () => {
    const base = rich()
    // Declared with the blocks reversed (e2 rank 1 before e1 rank 0); spine still puts e1 first.
    const input: SummaryInput = {
      ...base,
      snapshot: { ...base.snapshot, blocks: [...base.snapshot.blocks].reverse() },
    }
    const spine = renderSummary(input).markdown
    const section = spine.slice(spine.indexOf('## Spine'), spine.indexOf('## Shape'))
    expect(section.indexOf('Loan recorded')).toBeLessThan(section.indexOf('Book shelved'))
  })

  it('breaks a spine tie at equal longest-path rank by ascending id', () => {
    // Two pivotal events on separate tracks — both at longest-path rank 0.
    // Declared id-descending (e2 before e1) so a rank-only sort would keep that order.
    const input: SummaryInput = {
      boardPosition: 1,
      sessionRecordPosition: 1,
      renderedAt: at,
      snapshot: {
        blocks: [
          { id: id('e2'), kind: 'domain-event', label: 'Zebra tagged', withdrawn: false, placement: 'timeline', pivotal: true },
          { id: id('e1'), kind: 'domain-event', label: 'Apple picked', withdrawn: false, placement: 'timeline', pivotal: true },
        ],
        follows: [],
        causedBy: [],
      },
      source: {
        format: 'big-picture',
        scope: null,
        narratorCount: 1,
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
        openModelAffectingHotSpots: [],
      },
    }
    const markdown = renderSummary(input).markdown
    const spine = markdown.slice(markdown.indexOf('## Spine'), markdown.indexOf('## Shape'))
    expect(spine.indexOf('Apple picked')).toBeLessThan(spine.indexOf('Zebra tagged'))
  })

  it('renders a byte-identical spine at equal rank when the block array is reversed', () => {
    const build = (blocks: SummaryInput['snapshot']['blocks']): SummaryInput => ({
      boardPosition: 1,
      sessionRecordPosition: 1,
      renderedAt: at,
      snapshot: { blocks, follows: [], causedBy: [] },
      source: {
        format: 'big-picture',
        scope: null,
        narratorCount: 1,
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
        openModelAffectingHotSpots: [],
      },
    })
    const blocks: SummaryInput['snapshot']['blocks'] = [
      { id: id('e2'), kind: 'domain-event', label: 'Zebra tagged', withdrawn: false, placement: 'timeline', pivotal: true },
      { id: id('e1'), kind: 'domain-event', label: 'Apple picked', withdrawn: false, placement: 'timeline', pivotal: true },
    ]
    expect(renderSummary(build(blocks)).markdown).toBe(renderSummary(build([...blocks].reverse())).markdown)
  })

  it('does not declare compatibility with any external documentation toolchain', () => {
    const markdown = renderSummary(rich()).markdown.toLowerCase()
    for (const claim of ['compatible', 'compatibility', 'mermaid', 'plantuml', 'docusaurus']) {
      expect(markdown).not.toContain(claim)
    }
  })
})
