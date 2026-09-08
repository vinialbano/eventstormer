import { describe, expect, it } from 'vitest'
import { renderTranscript } from './render-transcript.ts'

const at = '2026-09-06T10:00:00.000Z'

type Input = Parameters<typeof renderTranscript>[0]

const fixture = (): Input => ({
  format: 'big-picture',
  scope: 'Lending a book',
  position: 3,
  turns: [
    {
      kind: 'contribution',
      speaker: 'Amy',
      text: 'A member borrowed a book.',
      at: '2026-09-06T09:00:00.000Z',
      proposals: [
        { summary: 'capture: Loan recorded', disposition: 'applied', resultingBuildingBlockId: 'bb_1' },
      ],
    },
    {
      kind: 'contribution',
      speaker: 'Bo',
      text: 'Then the book was returned.',
      at: '2026-09-06T09:05:00.000Z',
      proposals: [
        {
          summary: 'sequence: Loan recorded → Book returned',
          disposition: 'apply-failed',
          resultingBuildingBlockId: null,
        },
        {
          summary: 'reword: Loan recorded → Loan logged',
          disposition: 'lapsed',
          resultingBuildingBlockId: null,
        },
      ],
    },
    {
      kind: 'notice',
      speaker: 'facilitator',
      text: 'Reword of "Loan recorded" held until the model has structure',
      at: '2026-09-06T09:10:00.000Z',
      proposals: [],
    },
  ],
  contributorCounts: [
    { speaker: 'Amy', accepted: 1, edited: 0, rejected: 0 },
    { speaker: 'Bo', accepted: 1, edited: 1, rejected: 1 },
  ],
})

const GOLDEN = `# Session transcript
Format: Big Picture
Scope: Lending a book
Session-record position: 3
Rendered at: 2026-09-06T10:00:00.000Z

## Turns

### Amy — contribution (2026-09-06T09:00:00.000Z)
> A member borrowed a book.
- Proposal: capture: Loan recorded — applied — resulting block bb_1

### Bo — contribution (2026-09-06T09:05:00.000Z)
> Then the book was returned.
- Proposal: sequence: Loan recorded → Book returned — apply-failed
- Proposal: reword: Loan recorded → Loan logged — lapsed

### facilitator — notice (2026-09-06T09:10:00.000Z)
> Reword of "Loan recorded" held until the model has structure

## Contributions
Counts only — no judgement is made about them.

| Contributor | Accepted | Edited | Rejected |
| --- | --- | --- | --- |
| Amy | 1 | 0 | 0 |
| Bo | 1 | 1 | 1 |
`

describe('renderTranscript', () => {
  it('renders the session transcript against a golden fixture', () => {
    expect(renderTranscript(fixture(), at).markdown).toBe(GOLDEN)
  })

  it('returns the session-record position alongside the markdown', () => {
    expect(renderTranscript(fixture(), at).position).toBe(3)
  })

  it('renders byte-identical markdown for two renders that differ only in renderedAt', () => {
    const strip = (markdown: string): string =>
      markdown.replace(/^Rendered at: .*$/m, 'Rendered at: <stamp>')
    const first = renderTranscript(fixture(), '2026-01-01T00:00:00.000Z')
    const second = renderTranscript(fixture(), '2030-12-31T23:59:59.000Z')
    expect(strip(first.markdown)).toBe(strip(second.markdown))
  })

  it('renders a byte-identical Contributions table when contributorCounts is shuffled', () => {
    const shuffled = { ...fixture(), contributorCounts: [...fixture().contributorCounts].reverse() }
    expect(renderTranscript(shuffled, at).markdown).toBe(GOLDEN)
  })

  it('annotates a lapsed proposal and an apply-failed proposal with no resulting block', () => {
    const { markdown } = renderTranscript(fixture(), at)
    expect(markdown).toContain('sequence: Loan recorded → Book returned — apply-failed\n')
    expect(markdown).toContain('reword: Loan recorded → Loan logged — lapsed\n')
    expect(markdown).not.toContain('apply-failed — resulting block')
    expect(markdown).not.toContain('lapsed — resulting block')
  })

  it('renders the held-track notice turn and excludes it from the Contributions table', () => {
    const { markdown } = renderTranscript(fixture(), at)
    expect(markdown).toContain('### facilitator — notice (2026-09-06T09:10:00.000Z)')
    expect(markdown).toContain('> Reword of "Loan recorded" held until the model has structure')
    const table = markdown.slice(markdown.indexOf('## Contributions'))
    expect(table).not.toContain('facilitator')
  })

  it('reproduces the contract dispositions and counts verbatim — no re-derivation', () => {
    const tampered: Input = {
      ...fixture(),
      turns: [
        {
          kind: 'contribution',
          speaker: 'Amy',
          text: 'x',
          at: '2026-09-06T09:00:00.000Z',
          proposals: [{ summary: 's', disposition: 'applied', resultingBuildingBlockId: null }],
        },
      ],
      contributorCounts: [{ speaker: 'Amy', accepted: 99, edited: 7, rejected: 42 }],
    }
    const { markdown } = renderTranscript(tampered, at)
    expect(markdown).toContain('- Proposal: s — applied\n')
    expect(markdown).toContain('| Amy | 99 | 7 | 42 |')
  })
})
