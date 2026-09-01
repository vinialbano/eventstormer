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
})
