import { describe, expect, it, vi } from 'vitest'
import * as client from '../client.ts'
import { acceptResolution, editResolution, fetchResolutions, rejectResolution } from './resolutions.ts'

// Suite: transport resolutions
// Invariant: Each resolution adapter targets the right route and body shape.
// Boundary IN: fetch/accept/edit/reject adapters with a stubbed client.
// Boundary OUT: composable orchestration (use-review-resolution.test.ts).

describe('resolutions transport', () => {
  it('fetchResolutions GETs the session resolutions route', async () => {
    const getJson = vi.spyOn(client, 'getJson').mockResolvedValue({ resolutions: [] })
    await fetchResolutions('s1')
    expect(getJson).toHaveBeenCalledWith('/api/sessions/s1/resolutions')
  })

  it('acceptResolution POSTs the accept route with no body payload', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({})
    await acceptResolution('r1')
    expect(postJson).toHaveBeenCalledWith('/api/resolutions/r1/accept')
  })

  it('editResolution POSTs the reference to the edit route', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({})
    await editResolution('r1', 'we added a retry step')
    expect(postJson).toHaveBeenCalledWith('/api/resolutions/r1/edit', { reference: 'we added a retry step' })
  })

  it('rejectResolution POSTs the reject route', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({})
    await rejectResolution('r1')
    expect(postJson).toHaveBeenCalledWith('/api/resolutions/r1/reject')
  })
})
