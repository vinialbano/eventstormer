import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { listReferences } from './list-references.ts'
import { renderReadableAccount } from './render-readable-account.ts'

const capturedId = 'bb_event' as BuildingBlockId
const withdrawnId = 'bb_ghost' as BuildingBlockId
const unknownId = 'bb_missing' as BuildingBlockId

const buildingBlocksSite = { kind: 'readable-account' as const, path: 'building-blocks' }

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
})
