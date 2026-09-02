import { describe, expect, it, vi } from 'vitest'
import {
  referenceSiteLine,
  type FetchBlockReferences,
  type ReferenceSite,
} from './reword-references.ts'

describe('reword-references', () => {
  it('fetchBlockReferences GETs the references route via injected getJson', async () => {
    const sites: ReferenceSite[] = [{ kind: 'readable-account', path: 'building-blocks' }]
    const getJson = vi.fn<(path: string) => Promise<ReferenceSite[]>>().mockResolvedValue(sites)
    const load: FetchBlockReferences = (workshopId, blockId) =>
      getJson(`/api/workshops/${workshopId}/board/blocks/${blockId}/references`)

    await expect(load('w1', 'b1')).resolves.toEqual(sites)
    expect(getJson).toHaveBeenCalledWith('/api/workshops/w1/board/blocks/b1/references')
  })

  it('referenceSiteLine names the readable-account building-blocks path', () => {
    expect(referenceSiteLine({ kind: 'readable-account', path: 'building-blocks' })).toBe(
      'Readable account · Building blocks',
    )
    expect(referenceSiteLine({ kind: 'other', path: 'timeline' })).toBe('timeline')
  })
})
