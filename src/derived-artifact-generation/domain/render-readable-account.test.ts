import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
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

const emptyMarkdown = `# Readable account
Format: Big Picture
Narrators: 0
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

## Building blocks

## Quoted evidence
`

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
    expect(renderReadableAccount(emptyInput).markdown).toBe(emptyMarkdown)
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
})
