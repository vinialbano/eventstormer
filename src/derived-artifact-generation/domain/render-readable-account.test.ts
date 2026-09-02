import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { emptyAccountMarkdown } from './empty-account-markdown.ts'
import type { AccountInput } from './model.ts'
import { renderReadableAccount } from './render-readable-account.ts'

const orderId = 'bb_order' as BuildingBlockId
const placedId = 'bb_placed' as BuildingBlockId
const actorId = 'bb_actor' as BuildingBlockId
const systemId = 'bb_system' as BuildingBlockId
const withdrawnId = 'bb_withdrawn' as BuildingBlockId

const emptyInput: AccountInput = {
  position: -1,
  format: 'big-picture',
  scope: null,
  narratorCount: 0,
  blocks: [],
  quotes: [],
}

const nestedLabels = (orderLabel: string): AccountInput => ({
  position: 1,
  format: 'big-picture',
  scope: null,
  narratorCount: 1,
  blocks: [
    { id: orderId, kind: 'domain-event', label: orderLabel, withdrawn: false },
    { id: placedId, kind: 'domain-event', label: 'Order placed', withdrawn: false },
  ],
  quotes: [{ id: 'c_1', text: 'The Order sat in the basket.' }],
})

describe('renderReadableAccount', () => {
  it('emits byte-identical markdown for the same input twice', () => {
    const input = nestedLabels('Order')
    const first = renderReadableAccount(input)
    const second = renderReadableAccount(input)
    expect(first.markdown).toBe(second.markdown)
  })

  it('pins the empty-model markdown to the heading contract with empty lists', () => {
    expect(renderReadableAccount(emptyInput).markdown).toBe(emptyAccountMarkdown)
  })

  it('states coverage as not run, not none or zero', () => {
    const { markdown } = renderReadableAccount(emptyInput)
    expect(markdown).toContain('- Stakeholder check: not run')
    expect(markdown).toContain('- Chosen problem: not run')
    expect(markdown).toContain('- Timeline and relations: not run')
    expect(markdown).not.toContain('Stakeholder check: none')
    expect(markdown).not.toContain('Stakeholder check: 0')
  })

  it('rewords only the Order id line; the Order placed line and the quote stay byte-identical', () => {
    const before = renderReadableAccount(nestedLabels('Order'))
    const after = renderReadableAccount(nestedLabels('Sales order'))

    expect(before.markdown).toBe(`# Readable account
Format: Big Picture
Narrators: 1
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

## Building blocks
- Event: Order
- Event: Order placed

## Quoted evidence
> The Order sat in the basket.
`)

    expect(after.markdown).toBe(`# Readable account
Format: Big Picture
Narrators: 1
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

## Building blocks
- Event: Sales order
- Event: Order placed

## Quoted evidence
> The Order sat in the basket.
`)
  })

  it('prefixes actor and system lines with Actor and System, never Event', () => {
    const { markdown } = renderReadableAccount({
      position: 2,
      format: 'big-picture',
      scope: 'Lending a book',
      narratorCount: 2,
      blocks: [
        { id: actorId, kind: 'actor', label: 'Member', withdrawn: false },
        { id: systemId, kind: 'system', label: 'Catalogue', withdrawn: false },
      ],
      quotes: [],
    })

    expect(markdown).toContain('- Actor: Member')
    expect(markdown).toContain('- System: Catalogue')
    expect(markdown).not.toContain('- Event: Member')
    expect(markdown).not.toContain('- Event: Catalogue')
    expect(markdown).toContain('Scope: Lending a book')
  })

  it('still lists a withdrawn block with the withdrawn kind suffix', () => {
    const { markdown } = renderReadableAccount({
      position: 1,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [
        { id: withdrawnId, kind: 'domain-event', label: 'Loan recorded', withdrawn: true },
      ],
      quotes: [],
    })

    expect(markdown).toContain('- Event (withdrawn): Loan recorded')
  })

  it('walks two sequenced events in follows order and drops the not-run coverage line', () => {
    const loanId = 'eA' as BuildingBlockId
    const bookId = 'eB' as BuildingBlockId
    const sequenced = (loanLabel: string): AccountInput => ({
      position: 2,
      format: 'big-picture',
      scope: null,
      narratorCount: 1,
      blocks: [
        { id: loanId, kind: 'domain-event', label: loanLabel, withdrawn: false, placement: 'timeline' },
        { id: bookId, kind: 'domain-event', label: 'Book returned', withdrawn: false, placement: 'timeline' },
      ],
      follows: [{ predecessor: loanId, successor: bookId }],
      quotes: [{ id: 'c_1', text: 'The Order sat in the basket.' }],
    })

    const before = renderReadableAccount(sequenced('Loan recorded'))
    const after = renderReadableAccount(sequenced('Loan was recorded'))

    expect(before.markdown).toBe(`# Readable account
Format: Big Picture
Narrators: 1
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run

## Timeline and relations
- Event: Loan recorded
  - Event: Book returned

## Building blocks
- Event: Loan recorded
- Event: Book returned

## Quoted evidence
> The Order sat in the basket.
`)
    expect(before.markdown).not.toContain('Timeline and relations: not run')
    expect(after.markdown).toBe(`# Readable account
Format: Big Picture
Narrators: 1
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run

## Timeline and relations
- Event: Loan was recorded
  - Event: Book returned

## Building blocks
- Event: Loan was recorded
- Event: Book returned

## Quoted evidence
> The Order sat in the basket.
`)
    expect(before.markdown.slice(before.markdown.indexOf('## Quoted evidence'))).toBe(
      after.markdown.slice(after.markdown.indexOf('## Quoted evidence')),
    )
  })

  it('indents fork successors under their predecessor', () => {
    const loanId = 'eA' as BuildingBlockId
    const bookId = 'eB' as BuildingBlockId
    const fineId = 'eC' as BuildingBlockId
    const { markdown } = renderReadableAccount({
      position: 3,
      format: 'big-picture',
      scope: null,
      narratorCount: 1,
      blocks: [
        { id: loanId, kind: 'domain-event', label: 'Loan recorded', withdrawn: false, placement: 'timeline' },
        { id: bookId, kind: 'domain-event', label: 'Book returned', withdrawn: false, placement: 'timeline' },
        { id: fineId, kind: 'domain-event', label: 'Fine assessed', withdrawn: false, placement: 'timeline' },
      ],
      follows: [
        { predecessor: loanId, successor: bookId },
        { predecessor: loanId, successor: fineId },
      ],
      quotes: [],
    })

    expect(markdown).toContain('- Event: Loan recorded')
    expect(markdown).toContain('  - Event: Book returned')
    expect(markdown).toContain('  - Event: Fine assessed')
  })

  it('renders two disconnected timeline components as separate roots', () => {
    const loanId = 'e1' as BuildingBlockId
    const bookId = 'e2' as BuildingBlockId
    const fineId = 'e3' as BuildingBlockId
    const { markdown } = renderReadableAccount({
      position: 3,
      format: 'big-picture',
      scope: null,
      narratorCount: 1,
      blocks: [
        { id: loanId, kind: 'domain-event', label: 'Loan recorded', withdrawn: false, placement: 'timeline' },
        { id: bookId, kind: 'domain-event', label: 'Book returned', withdrawn: false, placement: 'timeline' },
        { id: fineId, kind: 'domain-event', label: 'Fine paid', withdrawn: false, placement: 'timeline' },
      ],
      follows: [{ predecessor: loanId, successor: bookId }],
      quotes: [],
    })

    expect(markdown).toContain('- Event: Loan recorded')
    expect(markdown).toContain('  - Event: Book returned')
    expect(markdown).toContain('- Event: Fine paid')
  })

  it('registers caused-by reference sites for both endpoints', () => {
    const { references } = renderReadableAccount({
      position: 2,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [
        { id: actorId, kind: 'actor', label: 'Clerk', withdrawn: false },
        { id: placedId, kind: 'domain-event', label: 'Order placed', withdrawn: false, placement: 'timeline' },
      ],
      causedBy: [{ cause: actorId, effect: placedId }],
      quotes: [],
    })

    expect(references.get(actorId)).toEqual(
      expect.arrayContaining([
        { kind: 'readable-account', path: 'building-blocks' },
        { kind: 'caused-by', path: `${actorId}>${placedId}` },
      ]),
    )
    expect(references.get(placedId)).toEqual(
      expect.arrayContaining([
        { kind: 'readable-account', path: 'building-blocks' },
        { kind: 'caused-by', path: `${actorId}>${placedId}` },
      ]),
    )
  })

  it('renders multiline quotes with a greater-than prefix on each line', () => {
    const { markdown } = renderReadableAccount({
      ...emptyInput,
      quotes: [{ id: 'c_1', text: 'First line\nSecond line' }],
    })

    expect(markdown).toContain('> First line\n> Second line')
  })
})
