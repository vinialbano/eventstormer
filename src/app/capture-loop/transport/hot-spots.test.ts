import { describe, expect, it, vi } from 'vitest'
import * as client from '../client.ts'
import { flagHotSpot } from './hot-spots.ts'

// Suite: transport hot-spots
// Invariant: flagHotSpot POSTs the flag body to the board hot-spots route.
// Boundary IN: flagHotSpot adapter with a stubbed client.
// Boundary OUT: composable orchestration (use-flag-hot-spot.test.ts).

describe('flagHotSpot', () => {
  it('POSTs the flag body to /workshops/:id/board/hot-spots via postJson', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({ hotSpotId: 'h1', annotates: 'eA' })

    const input = {
      label: 'Concern: Payment captured',
      annotatesTargetId: 'eA',
      author: { accepter: { name: 'Maria' } },
    }
    await flagHotSpot('w1', input)

    expect(postJson).toHaveBeenCalledWith('/api/workshops/w1/board/hot-spots', input)
  })
})
