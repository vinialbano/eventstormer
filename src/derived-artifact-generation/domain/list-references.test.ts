import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { listReferences } from './list-references.ts'
import { renderReadableAccount } from './render-readable-account.ts'

const capturedId = 'bb_event' as BuildingBlockId
const withdrawnId = 'bb_ghost' as BuildingBlockId
const unknownId = 'bb_missing' as BuildingBlockId
const predecessorId = 'eA' as BuildingBlockId
const successorId = 'eB' as BuildingBlockId
const orderId = 'bb_order' as BuildingBlockId
const placedId = 'bb_placed' as BuildingBlockId
const causeId = 'a1' as BuildingBlockId

const buildingBlocksSite = { kind: 'readable-account' as const, path: 'building-blocks' }
const followsSite = { kind: 'follows' as const, path: 'eA>eB' }
const causedBySite = { kind: 'caused-by' as const, path: 'a1>eA' }

describe('listReferences', () => {
  it('returns the building-blocks site for a captured id and [] for an unknown id', () => {
    const document = renderReadableAccount({
      position: 0,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [{ id: capturedId, kind: 'domain-event', label: 'Loan recorded', withdrawn: false }],
      quotes: [],
    })

    expect(listReferences(document, capturedId)).toEqual([buildingBlocksSite])
    expect(listReferences(document, unknownId)).toEqual([])
  })

  it('still returns the building-blocks site for a withdrawn id', () => {
    const document = renderReadableAccount({
      position: 1,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [{ id: withdrawnId, kind: 'actor', label: 'Member', withdrawn: true }],
      quotes: [],
    })

    expect(listReferences(document, withdrawnId)).toEqual([buildingBlocksSite])
  })

  it('names a follows site on both sequenced endpoints plus the building-blocks site', () => {
    const document = renderReadableAccount({
      position: 2,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [
        {
          id: predecessorId,
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'timeline',
        },
        {
          id: successorId,
          kind: 'domain-event',
          label: 'Book returned',
          withdrawn: false,
          placement: 'timeline',
        },
      ],
      follows: [{ predecessor: predecessorId, successor: successorId }],
      quotes: [],
    })

    expect(listReferences(document, predecessorId)).toEqual([buildingBlocksSite, followsSite])
    expect(listReferences(document, successorId)).toEqual([buildingBlocksSite, followsSite])
  })

  it('keeps the site set when only a label changes', () => {
    const documentFor = (label: string) =>
      renderReadableAccount({
        position: 2,
        format: 'big-picture',
        scope: null,
        narratorCount: 0,
        blocks: [
          {
            id: predecessorId,
            kind: 'domain-event',
            label,
            withdrawn: false,
            placement: 'timeline',
          },
          {
            id: successorId,
            kind: 'domain-event',
            label: 'Book returned',
            withdrawn: false,
            placement: 'timeline',
          },
        ],
        follows: [{ predecessor: predecessorId, successor: successorId }],
        quotes: [],
      })

    expect(listReferences(documentFor('Loan recorded'), predecessorId)).toEqual(
      listReferences(documentFor('Loan was recorded'), predecessorId),
    )
    expect(listReferences(documentFor('Loan recorded'), successorId)).toEqual(
      listReferences(documentFor('Loan was recorded'), successorId),
    )
    expect(listReferences(documentFor('Loan recorded'), predecessorId)).toEqual([
      buildingBlocksSite,
      followsSite,
    ])
  })

  it('does not add or remove sites for Order placed when Order is reworded', () => {
    const nested = (orderLabel: string) =>
      renderReadableAccount({
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

    expect(listReferences(nested('Order'), placedId)).toEqual([buildingBlocksSite])
    expect(listReferences(nested('Sales order'), placedId)).toEqual([buildingBlocksSite])
    expect(listReferences(nested('Order'), orderId)).toEqual(
      listReferences(nested('Sales order'), orderId),
    )
  })

  it('names a caused-by site on both the cause and the effect', () => {
    const document = renderReadableAccount({
      position: 2,
      format: 'big-picture',
      scope: null,
      narratorCount: 0,
      blocks: [
        {
          id: predecessorId,
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'timeline',
        },
        { id: causeId, kind: 'actor', label: 'Clerk', withdrawn: false },
      ],
      causedBy: [{ cause: causeId, effect: predecessorId }],
      quotes: [],
    })

    expect(listReferences(document, predecessorId)).toEqual([buildingBlocksSite, causedBySite])
    expect(listReferences(document, causeId)).toEqual([buildingBlocksSite, causedBySite])
  })
})
